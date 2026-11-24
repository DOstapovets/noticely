import { atom, read, update } from 'claude-code'

import type { UpdateTold } from '../types'
import type { Api } from './context'

// The engine's scan reads a `$.state` value only from a const of the file that
// reads it, so this module names the atom itself; types/index.d.ts declares it once.
const latest = atom({ plugin: 'noticely', key: 'latest' } as const, null)

// What takes `$` here is a function declaration: past an import the scan
// follows `$` into nothing else.

// The install `claude plugin update` acts on: the one from this repository's own marketplace.
// A third-party marketplace does not update by itself, and the desktop app has no button for it.
const PLUGIN = 'noticely@noticely'
// main's version is the latest release: release-please raises it only in the release PR.
const MANIFEST = 'https://raw.githubusercontent.com/DOstapovets/noticely/main/.claude-plugin/plugin.json'
// The version the toast last told of, so each one is told once, in one session of all.
export const UPDATE_KEY = 'update'
// A marketplace update is a git pull: more than the 30 seconds `$.process.run` waits by default.
const UPDATE_MS = 120_000

const json = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

// Whether version `a` is past `b`, part by part: `0.28.0` is past `0.27.9`. A part
// that is not a number (`0.28.0-beta`) makes it false.
export const newer = (a: string, b: string) => {
  const x = a.split('.').map(Number)
  const y = b.split('.').map(Number)
  if ([...x, ...y].some(Number.isNaN)) return false
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0)
    if (d !== 0) return d > 0
  }
  return false
}

// The version `claude plugin list` reports for the marketplace's install, if there is one.
async function installedVersion($: Api) {
  const listed = await $.process.run(['claude', 'plugin', 'list', '--json']).catch(() => undefined)
  const plugins = json(listed?.exitCode === 0 ? listed.stdout : '') as { id?: unknown; version?: unknown }[] | undefined
  const installed = Array.isArray(plugins) ? plugins.find(p => p.id === PLUGIN)?.version : undefined
  return typeof installed === 'string' ? installed : undefined
}

// Whether main holds a newer version than the one installed from the marketplace: if so the
// pane's footer offers it, and a toast tells of it once.
export async function checkUpdate($: Api) {
  // Whoever turned updates or nonessential traffic off for Claude Code means this check too.
  // A read refused (the module unloaded meanwhile) counts as off.
  const off = await Promise.all([
    $.env.get('DISABLE_UPDATES'),
    $.env.get('DISABLE_AUTOUPDATER'),
    $.env.get('CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC'),
  ]).then(
    values => values.some(Boolean),
    () => true,
  )
  if (off) {
    return
  }

  // None from the marketplace (a `--plugin-dir` checkout, a directory marketplace): nothing to update.
  const installed = await installedVersion($)
  if (!installed) {
    return
  }

  const fetched = await $.http.fetch(MANIFEST).catch(() => undefined)
  const out = (json(fetched?.ok ? fetched.text : '') as { version?: unknown } | undefined)?.version
  if (typeof out !== 'string') {
    return
  }
  // Installed meanwhile, from another session or the terminal: the offer goes.
  if (!newer(out, installed)) {
    if (await read($, latest)) await update($, latest, () => null)
    return
  }

  await update($, latest, () => out)
  const told = (await $.store.get(UPDATE_KEY)) as UpdateTold | undefined
  if (told?.version !== out) {
    const telling: UpdateTold = { version: out }
    await $.store.set(UPDATE_KEY, telling)
    await $.ui.toast(`⚑ Noticely ${out} is out (you have ${installed}) · ↑ ${out} in /noticely installs it`)
  }
}

// Whether an update is running, so a second press does not start a second one.
let updating = false

export async function installUpdate($: Api) {
  const version = await read($, latest)
  if (!version || updating) {
    return
  }

  updating = true
  try {
    // The marketplace's copy first: `plugin update` installs the version it lists. Never `-y`,
    // which would accept a changed install command that nobody looked at.
    const marketplace = await $.process
      .run(['claude', 'plugin', 'marketplace', 'update', 'noticely'], { timeoutMs: UPDATE_MS })
      .catch(() => undefined)
    const ran =
      marketplace?.exitCode === 0
        ? await $.process.run(['claude', 'plugin', 'update', PLUGIN], { timeoutMs: UPDATE_MS }).catch(() => undefined)
        : marketplace

    if (ran?.exitCode !== 0) {
      await $.ui.toast(`Could not update Noticely: ${ran?.stderr.trim() || 'claude plugin update failed'}`)
      return
    }

    await update($, latest, () => null)
    // `plugin update` installs what main holds now, which can be past the version offered.
    const installed = (await installedVersion($)) ?? version
    await $.ui.toast(`↑ Noticely ${installed} installed · /reload-plugins or a new session loads it`)
  } finally {
    updating = false
  }
}
