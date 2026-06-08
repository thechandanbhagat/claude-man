# claude-man

Switch between multiple Claude Code accounts, nvm-style.

A "profile" is a snapshot of the two files that identify a logged-in Claude
account on disk:

- `~/.claude/.credentials.json` — the OAuth tokens (whole file)
- the `oauthAccount` block inside `~/.claude.json` — email, org, subscription

Everything else in `~/.claude.json` (project history, MCP config, settings) is
left untouched.

> **Platform note:** this targets the token-file auth used on Windows and Linux.
> macOS stores tokens in the Keychain, so the credentials file is empty there and
> the tool will refuse to run with a clear message.

## Install

```bash
npm install
npm run build
npm link        # exposes `claude-man` (and `clman`) on your PATH
```

## Usage

```bash
claude-man add work        # snapshot the account you're logged into now
# log out, log into your other account in Claude Code, then:
claude-man add personal

claude-man ls              # list profiles (email · plan · active marker)
claude-man use work        # switch the active account
claude-man current         # show active profile + live account
claude-man rename work job
claude-man rm personal     # refuses the active profile unless --force

claude-man                 # no args → interactive arrow-key menu
```

## Why switching is safe

Claude refreshes the access token in the background and rewrites
`.credentials.json`. Every `use` therefore **re-captures the live (possibly
rotated) credentials back into the currently-active profile before** overwriting
them with the target. No rotated refresh token is ever lost.

The first switch also backs up your original login to
`~/.claude-man/backups/`.

## Layout

```
~/.claude-man/
  profiles/<name>/credentials.json    copy of ~/.claude/.credentials.json
  profiles/<name>/oauthAccount.json   the oauthAccount block
  state.json                          { activeProfile, profiles{} }
  backups/                            first-run backup of your live files
```

## Develop

```bash
npm test           # vitest
npm run typecheck
```
