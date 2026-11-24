import { atom, read } from 'claude-code'

import type { GithubChecked, Issue, Pull } from '../types'
import { session } from './context'
import type { Api } from './context'
import { better, GITHUB_MS, MARKER, parse, RATE_PAUSE_MS, SLACK } from './github'
import type { Found } from './github'
import { change, complete } from './store'

// Named here as well as in register.tsx: the engine's scan reads a `$.state`
// value only from a const of the file that reads it.
const issues = atom({ plugin: 'noticely', key: 'issues' } as const, [])

// `https://<host>/<group>/<subgroup…>/<project>/-/issues/<n>`, as `glab issue create` prints it.
const ISSUE_URL = /^https:\/\/([^/]+)\/(.+?)\/-\/issues\/(\d+)/
const GITLAB_ISSUE = /https:\/\/\S+\/-\/issues\/\d+/
// The remote's host and full path, subgroups included: ssh (`git@host:g/p.git`, `ssh://git@host:2222/g/p.git`) or https.
const REMOTE = /^(?:[a-z+]+:\/\/)?(?:[^@/]+@)?([^:/]+)(?::\d+)?[:/](.+?)(?:\.git)?\/?$/i

// `auto` asks the `origin` remote: gitlab.com, or a self-managed host named `gitlab.<domain>`.
export const onGitlab = (remote: string | null | undefined) => {
  const host = remote?.match(REMOTE)?.[1]

  return host !== undefined && /^(?:.+\.)?gitlab\.com$|^gitlab\./i.test(host)
}

// Ids whose `glab issue create` is still running, so a second press does not file it twice.
const filing = new Set<number>()

const gitlabBody = (issue: Issue) =>
  [issue.detail, issue.file && `Where: \`${issue.file}\``, '_Noticed by Claude Code._']
    .filter(Boolean)
    .join('\n\n')

// What takes `$` here is a function declaration: past an import the scan
// follows `$` into nothing else.

export async function createGitlabIssue($: Api, id: number) {
  const issue = (await read($, issues)).find(i => i.id === id)

  if (!session.gitlab || !issue || issue.gitlabUrl || filing.has(id)) {
    return
  }

  filing.add(id)
  // glab files it in the project of the session's directory and prints its URL; `--yes` skips its prompt.
  const ran = await $.process
    .run(['glab', 'issue', 'create', '--title', issue.title, '--description', gitlabBody(issue), '--yes'], { cwd: session.cwd })
    .catch(() => undefined)
  filing.delete(id)
  const gitlabUrl = ran?.exitCode === 0 ? ran.stdout.match(GITLAB_ISSUE)?.[0] : undefined

  if (!gitlabUrl) {
    await $.ui.toast(`Could not create a GitLab issue for N-${id}: ${ran?.stderr.trim() || 'glab issue create failed'}`)
    return
  }

  await change($, list => list.map(i => (i.id === id ? { ...i, gitlabUrl } : i)))
  await $.ui.toast(`↗ N-${id} → ${gitlabUrl}`)
  void refreshGitlab($, true)
}

// Issues asked about in one query, kept well under GitLab's query complexity limit.
const BATCH = 25

// One pass at a time: the timer, `/noticely` and a new issue may all ask for one.
let refreshing = false

const mergeOf = (node: unknown): Pull | undefined => {
  const { iid, webUrl, state, draft } = (node ?? {}) as Record<string, unknown>
  const number = Number(iid)
  const states = { opened: 'OPEN', locked: 'OPEN', closed: 'CLOSED', merged: 'MERGED' } as const
  if (!Number.isInteger(number) || typeof webUrl !== 'string' || typeof state !== 'string' || !(state in states)) {
    return undefined
  }
  return { number, url: webUrl, state: states[state as keyof typeof states], ...(draft === true ? { isDraft: true } : {}) }
}

// The queries of one pass: each host's linked issues, BATCH a query, and with the
// first of the repository's own host the search for merge requests its sessions marked.
const queries = (linked: Issue[], working: Issue[]) => {
  const byHost = new Map<string, string[]>()
  for (const issue of linked) {
    const [, host, path, iid] = issue.gitlabUrl!.match(ISSUE_URL) ?? []
    if (!host) continue
    const parts = byHost.get(host) ?? []
    parts.push(`i${issue.id}: project(fullPath: ${JSON.stringify(path)}) { issue(iid: "${iid}") { state } }`)
    byHost.set(host, parts)
  }

  const [, host, path] = session.remote?.match(REMOTE) ?? []
  const search =
    host && path && working.length > 0
      ? `marked: project(fullPath: ${JSON.stringify(path)}) { mergeRequests(search: "Noticely issue", sort: UPDATED_DESC, first: 30) { nodes { iid webUrl state draft description } } }`
      : undefined
  if (search && !byHost.has(host!)) byHost.set(host!, [])

  return [...byHost].flatMap(([on, parts]) => {
    const batches = Array.from({ length: Math.max(1, Math.ceil(parts.length / BATCH)) }, (_, i) => parts.slice(i * BATCH, (i + 1) * BATCH))
    return batches.map((batch, i) => ({
      host: on,
      query: `query { ${batch.join(' ')}${i === 0 && search && on === host ? ` ${search}` : ''} }`,
    }))
  })
}

// Asks GitLab one query at a time, and stops once it refuses one as over its rate limit.
async function ask($: Api, linked: Issue[], working: Issue[]): Promise<Found> {
  const found: Found = { statuses: new Map(), pulls: new Map() }
  const offer = (id: number, pull: Pull | undefined) => {
    if (pull) found.pulls.set(id, better(found.pulls.get(id), pull))
  }

  for (const { host, query } of queries(linked, working)) {
    const ran = await $.process
      .run(['glab', 'api', 'graphql', '--hostname', host, '-f', `query=${query}`], { cwd: session.cwd })
      .catch(() => undefined)

    if (!ran) {
      // glab could not start, or timed out: the next pass tries again.
      break
    }
    if (/rate limit|too many requests|\b429\b/i.test(`${ran.stderr} ${ran.exitCode === 0 ? '' : ran.stdout}`)) {
      found.pausedUntil = (await $.clock.now()) + RATE_PAUSE_MS
      break
    }

    // A part of the query that failed, an issue deleted say, leaves the rest of the answer.
    const data = (parse(ran.stdout) as { data?: Record<string, unknown> } | undefined)?.data ?? {}
    for (const issue of linked) {
      const state = (data[`i${issue.id}`] as { issue?: { state?: unknown } | null } | undefined)?.issue?.state
      // An answer of another shape skips the issue this pass.
      if (state === 'opened' || state === 'locked') found.statuses.set(issue.id, { state: 'OPEN' })
      if (state === 'closed') found.statuses.set(issue.id, { state: 'CLOSED' })
    }

    const marked = (data.marked as { mergeRequests?: { nodes?: unknown[] } } | undefined)?.mergeRequests?.nodes ?? []
    for (const node of marked) {
      const body = (node as { description?: unknown } | null)?.description
      for (const [, id, noticed] of typeof body === 'string' ? body.matchAll(MARKER) : []) {
        const issue = working.find(i => i.id === Number(id) && i.createdAt === Number(noticed))
        if (issue) offer(issue.id, mergeOf(node))
      }
    }
  }

  return found
}

// `force`, for `/noticely` and a newly linked issue, makes a pass even when another
// session of the repository made one moments ago; nothing makes one while GitLab is paused.
export async function refreshGitlab($: Api, force = false) {
  const list = await read($, issues)
  const linked = list.filter(i => i.gitlabUrl)
  const working = list.filter(i => i.sessionId)

  if (!session.gitlab || refreshing || (linked.length === 0 && working.length === 0)) {
    return
  }

  refreshing = true
  let found: Found
  try {
    const key = `gitlab:${session.storeKey.slice('issues:'.length)}`
    const now = await $.clock.now()
    // A pass of a session that reloaded meanwhile is refused the store: it asks nothing.
    const shared = (await $.store.get(key).catch(() => null)) as GithubChecked | null | undefined

    if (shared === null) {
      return
    }

    if (now < (shared?.pausedUntil ?? 0) || (!force && now - (shared?.checkedAt ?? -Infinity) < GITHUB_MS - SLACK)) {
      return
    }

    // Kept before asking, so a session that starts meanwhile does not ask too.
    const checked: GithubChecked = { checkedAt: now }
    await $.store.set(key, checked)
    found = await ask($, linked, working)
    if (found.pausedUntil) await $.store.set(key, { ...checked, pausedUntil: found.pausedUntil })
  } finally {
    // Whatever went wrong, the next pass still runs.
    refreshing = false
  }

  const closed = new Set([...found.statuses].filter(([, status]) => status.state === 'CLOSED').map(([id]) => id))
  const learnt = (i: Issue): Issue => ({
    ...i,
    ...(found.statuses.has(i.id) ? { gitlab: found.statuses.get(i.id) } : {}),
    ...(found.pulls.has(i.id) ? { pull: found.pulls.get(i.id) } : {}),
  })

  // Nothing new: the list is not written, so nothing is drawn again.
  if (closed.size === 0 && list.every(i => JSON.stringify(learnt(i)) === JSON.stringify(i))) {
    return
  }

  await change($, list => list.map(learnt))
  // Closed on GitLab: nothing is left to notice.
  const done = closed.size > 0 ? await complete($, closed) : []
  if (done.length > 0) {
    await $.ui.toast(`✓ closed on GitLab, completed: ${done.map(id => `N-${id}`).join(', ')}`)
  }
}
