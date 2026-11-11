# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-12

### Added

- A composer-dock strip that mirrors the current session's running shell jobs.
- Progress parsing for git (`Receiving objects`, `Compressing objects`,
  `Resolving deltas`, `Writing objects`, `remote: Counting objects`), curl's
  default meter, and generic `NN%` lines.
- Per-job command label, phase, percent, elapsed time, and a thin progress bar.
- Fast-command suppression (under 1.2 s without a percent), a three-row cap,
  and a "N more" summary.
- Chinese and English locale dictionaries.
- A host-side system-prompt hint that asks agents to use `--progress`,
  `--progress-bar`, or `--info=progress2` where the command supports it.
- A dependency-free parser test that runs the real `client.js` in a Node `vm`.

### Known limitations

- Only commands that actually emit progress can show a percent.
- `git clone/fetch/push` needs `--progress` when stderr is not a TTY.
- Foreground job visibility follows the shared job pipeline but has mainly been
  verified with a background job.
- The plugin depends on DSH client services and slot names that may change
  between DSH releases.
- The host prompt hint changes agent behaviour for every session in the profile.
