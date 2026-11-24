# The Noticely pane

← [README](../README.md)

**The "Noticely" pane** opens by itself when the list has something on it, and
with `/noticely`.

## Groups

Entries are grouped under **▾ High**, **▾ Medium** and **▾ Low**. Press
a group's heading to fold it (`▸ High 2`) or open it again; a folded group keeps its
place, so High stays on top. An open group takes the rows its cards need. When
they do not all fit, a group that needs no more than an even share keeps what it needs and
the rest share the remaining rows evenly. The pane itself never scrolls, so the group
headings stay on screen: the wheel scrolls the cards of the group under the pointer, one
card at a time, and the scroll keys the first open group; a group stops once its last card
shows. A scrolled group says how
many cards are above, `▾ High 5 ↑ 2 above`. Which groups are folded is remembered across
sessions and projects.

## Tabs

Once the current session has noted something, two tabs sit at
the top of the pane, **This session 2** and **All 5**: the first shows only the entries
this session noted. The tab goes away again when none of them are left, and the pane
then shows every entry. Once an entry is resolved, or closed on GitHub or GitLab, a **✓ Completed 3**
tab follows **All**: its cards are read only and say, at the top right, when the entry was
resolved, `✓ 2h ago`. They stay there for the days chosen in **⚙ Settings**, 7 at first.
An entry deleted with ✕ does not go there.

The experimental **Code** tab, for `TODO` and `FIXME` comments in the code, is
described in [Code tab](./code-tab.md).

## Cards

Within a group the newest entry comes first. Each entry is a card with its number, `N-3`, and
title in bold on one line, wrapped when long, and, at the top right, when it was noted: `just now`, `5m ago`, `3h ago`,
then after a day the date and time, `06.11 14:05`. A blank row below the title, dimmed, come the
file on one line (shortened in the middle when it does not fit) and the detail cut to
three lines. A blank row above them, these are its controls:

- **▶ New session** starts `claude --bg` with a prompt to fix the issue that ends by
  asking it to call `resolve_issue`. The card then shows the session id, which
  `claude attach <id>` connects to, and later the pull request the session opened:
  see [GitHub status](./github-gitlab.md#github-status).
- **↗ GitHub issue** files it with `gh issue create` in the repository of the session's
  directory: the title becomes the issue title, `detail` and `file` its body. The card
  then links it on a line under the detail, with a blank row above:
  `↗ Issue #42 (open · 📋 To do)`, with the column of the project board it is on, if any.
  Shown only where GitHub is on: see
  [Turning GitHub and GitLab on or off](./github-gitlab.md#turning-github-and-gitlab-on-or-off).
- **↗ GitLab issue** does the same with `glab issue create` in the project of the
  session's directory, and links it as `↗ Issue #42 (open)`: see
  [GitLab status](./github-gitlab.md#gitlab-status). Shown only where GitLab is on.
- **⎘ Copy** puts the entry on the clipboard to paste into a prompt: `N-3` and the
  title, then `Where:` and the file, then the detail whole. A toast says it was copied,
  or why not.
- **✕**, red, in the card's top right corner, deletes the entry. The first press only
  asks, `Delete? ✓ ↩`: **✓** deletes it, **↩** leaves it be.
- **▲ / ▼**, at the card's right edge while the pointer is over the card, move it one
  priority up or down; each is drawn in the color of the group it moves the issue to.

## Footer

The footer, at the pane's bottom edge, holds **⧉ Projects** at the left, once another
project has a list too, and **⚙ Settings** and **✎ Feedback** at the right, each with a space a side like
the tabs. In the terminal it stays there on every tab, the list of projects included,
which pushes it down only once the list is longer than the pane.

When a newer Noticely is out, **↑ 0.28.0** (its version) stands before **⚙ Settings**
in the accent color, and a toast tells of it once per version. Pressing it updates the
marketplace and the plugin (`claude plugin marketplace update noticely`, then
`claude plugin update noticely@noticely`), and a toast names the version installed: main's
latest, even one released after the offer. `/reload-plugins` or a new session loads the
new version. See [Updates](../README.md#updates).

## Other projects

Once another project has a list too, a **Projects** tab stands in
the footer, in a secondary color, also when this project's list is
empty (open the pane with `/noticely`). In place of the tabs it shows **← Back**,
which leads to every entry of this project. It
lists this project first, in the accent color and marked `this project` (pressing it
leads back to its own list), then every other project the plugin has kept a list for, one row each, a blank row apart: its name
(`owner/repo` from its `origin` remote, else its directory's name), its directory, how many entries
it has in each priority, in the groups' colors (`● 2 ● 1`), and when its list last
changed. Projects with no entries left come last, dimmed, as `no issues`. Press a
project to see its entries in the same groups and cards, read only: no **▶**, **↗**,
**✕** or **▲ / ▼**; open a session in that project to act on them. **← Projects**
leads back to the list. The list is read again each time the tab is pressed, on `/noticely`, and, while the tab is open,
every 30 seconds.

## Settings

**⚙ Settings**, in the footer's secondary color, shows the settings in
place of the groups, with **← Back** above in place of the tabs. They are the same in every
project and kept across sessions; other open sessions pick a change up within 30 seconds. **Completed** chooses how long a resolved entry stays
on the Completed tab: **Off** (it leaves at once), **1 day**, **7 days** (the default) or
**30 days**; a shorter choice drops the older ones at once. **[ ] Ask before noting**, off
until you switch it on, has Claude ask you before each new entry goes on the list: **Add**
notes it, **Skip** or a dismissed dialog leaves it off, and Claude is told which. An entry on
the list already, and detail added to one, are not asked about. **Experimental** is for
what may change or go away in a later version: **[ ] Code tab** switches the
[Code tab](./code-tab.md) on or off, and is off until you switch it on.

The `github` and `gitlab` options are not here but in the plugin's config menu: see
[Turning GitHub and GitLab on or off](./github-gitlab.md#turning-github-and-gitlab-on-or-off).

## Feedback

**✎ Feedback**, in the pane's footer, is for reporting something about this plugin
itself. It starts a background session (`claude attach <id>` joins it, as the toast
says) that asks you what it is, a bug, a feature request, or a question or idea, and
what that needs. It collects the Claude Code and plugin versions by itself, is told
where you started it (the terminal and its layout, the desktop app or VS Code, with
the extension's version there), looks for
an existing issue or discussion on the same thing, and shows you a draft. Only once
you confirm does it post: a bug or feature request as an issue in this repository, a
question or idea as a discussion, and it gives you the link. `/noticely feedback` does
the same.

## Outside the terminal

Outside the terminal (VS Code, the desktop app, the mobile app) each group takes
the height its cards need and the pane scrolls as a whole, with a little more room
inside each card. Where nothing is drawn on hover (VS Code, the mobile app), ▲ / ▼
always show. VS Code draws no colors inside a button, so there a group's heading is
a colored dot beside its name, which is the part you press; the arrows and the tab
not shown are dim; the cards stand in under the heading; and the pane's own heading
is left out, as VS Code titles the pane, and the footer follows the last group. On
the Projects tab each project there is a card like an entry's: its name a dim button
with the counts beside it, its directory on a line below.
