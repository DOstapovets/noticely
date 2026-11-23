# Code tab

← [README](../README.md) · [The pane](./pane.md)

**Comments in the code** (experimental, off until switched on in **⚙ Settings**). When the working tree's tracked files hold `TODO`, `FIXME`,
`HACK` or `XXX` comments, a **Code 12** tab follows **All**.

## What counts as a comment

A tag counts after a
comment's opening (`//`, `#`, `/*`, `*` at a line's start, `--`, `<!--`, `;`), so a name
like `TODO_LIST`, or Markdown's `**TODO**`, does not; nor does an opening inside a string's
quotes, such as a test's fixture `'a.ts:1:// TODO: x'`. The text ends where the comment
closes (`*/`, `-->`), and a tag followed only by punctuation is named after the tag and its
place, `TODO in a.ts:4`.

The scan reads a line at a time and knows no language, so it misses a lowercase `todo`,
a tag after other words in a `/* */` comment and one in a Python docstring, and takes a
comment-like line inside a multi-line string and a Markdown heading such as `## TODO`.

## When it is read

They are found with `git grep` when the setting is switched on, at session start, when the tab is pressed, on
`/noticely` and, while the tab is open, every 30 seconds; they are not stored, so a comment
taken out of the code leaves the tab. The tab
holds the first 200 and reads `Code 200+` when there are more.

## Groups and cards

The groups are headed by tags: **FIXME**, **HACK ·
XXX**, **TODO**. Each card shows the comment's text and `path:line`, with two controls:
**→ List** notes it as an entry at its group's priority, whose detail asks to remove the
comment once it is fixed, and **▶ New session** notes it and starts the session for that
entry. A comment already on the list, by its `path:line` or its title, says `on the list #N`
instead.

## ✦ Analyze

**✦ Analyze**, in the footer while some comment is not on the list yet, starts a
background session with those comments' places: Claude reads each comment whole, over all
its lines and with the code it is about, and notes what it asks for with `note_issue`, one
entry for a comment over several lines or for comments that ask the same thing, none for one
that no longer applies, each at the comment's `path:line`. It changes no code.
