# Repository rule

← [README](../README.md)

The first session with someone at the prompt in a repository asks once, **Analyze this
repository so Claude knows when to note an issue here?** **Analyze** starts a
background session (`claude attach <id>` joins it, as the toast says). It studies the
repository, its docs, checks, config and what is already on the list, and drafts a
short rule: what counts as a problem outside the task here, with examples from this
stack and these paths, how to pick a priority, and what not to note. It shows you
the draft, asks whether to note the problems it found on the way, and saves the rule
once you confirm. **Not now** asks no more; `/noticely setup` starts it later, or
redoes the rule.

The rule is kept in the plugin's store, under `rule:` beside the repository's list,
not in the repository's files. It goes into the context of every session in the
repository started after it was saved, its worktrees included.

The setup session saves it with the `save_issue_rule` tool, which cuts `rule` to 4000
characters.
