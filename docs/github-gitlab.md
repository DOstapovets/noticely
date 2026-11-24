# GitHub and GitLab

← [README](../README.md) · [The pane](./pane.md)

A card's **↗ GitHub issue** or **↗ GitLab issue** button files the entry as an issue
(see [Cards](./pane.md#cards)). This page is about what happens after: how its
status, and the pull or merge request that fixes it, are followed.

## GitHub status

The status of each linked issue is read with `gh api graphql`: at session start,
right after the issue is filed, on `/noticely`, and every 5 minutes after that.
Entries with no link and no session cost nothing. When `gh` does not answer, the last
known status stays.

GitHub's rate limit is kept in mind:

- One query asks about 25 issues at a time, and costs one point of the 5000 an hour.
- A repository is read once in 5 minutes, by whichever of its sessions comes first.
  The others pick up what it found when they next reload the list. `/noticely` and a
  newly filed issue read it at once.
- When fewer than 200 points are left, or GitHub refuses a query as over the limit,
  no session of the repository asks again until the limit resets.

The same query finds the **pull request** for an entry. It is either a pull request
that closes its GitHub issue, or one a background session opened for it. The session
is asked to end the pull request's description with `Noticely issue N-3 (noticed …)`,
and a search of the repository's pull requests finds that line. Noticely writes its numbers as
`N-3`, never `#3`, which GitHub and GitLab would link to the repository's own issue or
pull request 3. A line written as `#3` by an older version is still found. The card shows the
pull request on the same line as the issue's link, `⎇ PR #12 (draft)`, then `open`,
`merged` or `closed`; where both do not fit on one line, each takes a line of its own. With several, an open one wins over a merged one, then the newest.

When the GitHub issue is **closed**, as completed or as not planned, the entry is
moved to the Completed tab and a toast says `✓ closed on GitHub, completed: N-1`. This is
final: if the issue is reopened, the entry does not come back.

Requires the [GitHub CLI](https://cli.github.com), signed in with `gh auth login`,
and for the project board column the `read:project` scope
(`gh auth refresh -s read:project`).

## GitLab status

GitLab works the same way, through `glab api graphql` on the issue's host, on the
same schedule: at session start, right after the issue is filed, on `/noticely`, and
every 5 minutes after that, once in 5 minutes per repository. Projects in subgroups
(`group/sub/project`) are supported.

- The card shows whether the issue is open, `↗ Issue #42 (open)`. GitLab has no
  Status column like GitHub's project boards, so none is shown.
- The **merge request** a background session opened is found by the same
  `Noticely issue N-3 (noticed …)` line, which the session is asked to end its
  description with, followed by `Closes <issue URL>`. The card shows it as
  `⎇ MR !12 (draft)`, then `open`, `merged` or `closed`. A merge request opened by hand
  that closes the issue is not looked up.
- When the GitLab issue is **closed**, the entry moves to the Completed tab and a toast
  says `✓ closed on GitLab, completed: N-1`.
- When GitLab refuses a query as over its rate limit (`429`), no session of the
  repository asks again for 15 minutes.

Requires the [GitLab CLI](https://gitlab.com/gitlab-org/cli), signed in with
`glab auth login` (with `--hostname` for a self-managed instance).

## Turning GitHub and GitLab on or off

Two options, `github` and `gitlab`, asked for at install and listed in the plugin's
config menu (stored under `pluginConfigs` in settings):

| Value | GitHub button and statuses |
| --- | --- |
| `auto` (default) | Only where the repository's `origin` remote is on `github.com`, over ssh or https. Not in a repository with no remote, on GitLab, Bitbucket and the like, or outside a repository. |
| `on` | Always. Use it for GitHub Enterprise on a domain of its own. |
| `off` | Never. |

| Value | GitLab button and statuses |
| --- | --- |
| `auto` (default) | Only where the repository's `origin` remote is on `gitlab.com`, or on a host whose name starts with `gitlab.` (`gitlab.example.com`), over ssh or https. |
| `on` | Always. Use it for a self-managed GitLab on a host named otherwise. |
| `off` | Never. |

Where GitHub is off, no `gh` call is made, and where GitLab is off, no `glab` call.
Links to issues filed earlier stay on their cards.
