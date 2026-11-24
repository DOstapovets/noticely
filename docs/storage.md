# Where the list is kept

← [README](../README.md)

In the plugin's own store, one list per repository, keyed by the root of its main
working tree. Every worktree of a repository sees the same list; a separate repository
nested inside it has its own. Outside a repository, the session's directory is the key.

Each list also keeps the repository's `origin` remote and when it last changed,
written with every change from 0.22 on, so the Projects tab of another project can
name it and tell its age. A list from an earlier version shows only its directory
until it next changes.

The settings, and which priority groups are folded, are kept once for every project,
as is the newer version a toast last told of, so each one is told once.
The [repository rule](./repository-rule.md) is kept beside the repository's list.

## Several sessions at once

Open sessions of the same project pick up each other's changes every 30 seconds.
Within a session, changes made at the same moment (parallel `note_issue` calls, a press
in the pane, a GitHub pass) are applied one after another, so none is lost and each
entry gets a number of its own. Two sessions changing the list in the same instant can
still lose one of the two changes: the store offers no way to rule that out.

## Lists from earlier versions

Lists that versions before 0.4 kept per worktree are folded into the repository's list
on first start, keeping its remote; an entry there with no title or number is left out.
Up to 0.24 the plugin was called `noticed-issues`, and for a short while on `main`
`notifly`; the lists kept under those names are copied over on the first start of
Noticely, and the old store files are left as they are.
