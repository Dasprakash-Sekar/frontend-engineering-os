# Installing FEOS

FEOS targets [Claude Code](https://code.claude.com/docs). It has not been tested with other Claude products or other agent platforms.

Choose **one** method. Installing both gives you every skill twice, once as `/feos:<skill>` and once as `/<skill>`.

| | Method A: plugin | Method B: manual |
|---|---|---|
| Skill names | `/feos:project-architect` | `/project-architect` |
| Updates | Through the plugin commands | `git pull`, then copy again |
| Can collide with your own skills | No, names are prefixed | Yes, if you have folders with the same names |
| Choose when | You want managed install and updates | You want unprefixed names, or to edit the skills locally |

## Method A: Claude Code plugin

### Install

```bash
claude plugin marketplace add Dasprakash-Sekar/frontend-engineering-os
```

```bash
claude plugin install feos@frontend-engineering-os
```

The same can be done inside a session with `/plugin marketplace add Dasprakash-Sekar/frontend-engineering-os` followed by `/plugin install feos@frontend-engineering-os`.

### Verify

```bash
claude plugin list
```

`feos@frontend-engineering-os` should be listed as enabled.

```bash
claude plugin details feos
```

The component inventory should show **Skills (14)**: the five workflows, the eight specialist references, and `frontend-engineering-principles`.

Then start a session and type `/feos:` to see the skills. `frontend-engineering-principles` does not appear in that menu by design; the other skills load it themselves.

### Update

```bash
claude plugin marketplace update frontend-engineering-os
```

```bash
claude plugin update feos@frontend-engineering-os
```

Restart Claude Code to apply the update. Plugin users receive a new release only when the version in `plugin.json` has changed.

### Uninstall

```bash
claude plugin uninstall feos@frontend-engineering-os
```

```bash
claude plugin marketplace remove frontend-engineering-os
```

## Method B: manual installation

Manual installation copies the 14 skill folders into your personal skills directory, `~/.claude/skills`.

**Before you copy:** if you already have skill folders with any of the names listed under [Uninstall](#uninstall-1), they will be overwritten. Back them up or rename them first.

### Install

macOS and Linux:

```bash
git clone https://github.com/Dasprakash-Sekar/frontend-engineering-os.git
cd frontend-engineering-os
mkdir -p ~/.claude/skills
cp -R plugins/feos/skills/. ~/.claude/skills/
```

Windows PowerShell:

```powershell
git clone https://github.com/Dasprakash-Sekar/frontend-engineering-os.git
cd frontend-engineering-os
$dest = Join-Path $HOME ".claude\skills"
New-Item -ItemType Directory -Force $dest | Out-Null
Copy-Item -Path "plugins\feos\skills\*" -Destination $dest -Recurse -Force
```

To install for one project only, copy into that project's `.claude/skills` folder instead.

### Verify

macOS and Linux:

```bash
ls ~/.claude/skills | grep -E '^(frontend-|react-internals|project-architect|build-frontend-app|develop-frontend-feature|migrate-frontend-app|audit-frontend-quality)'
```

Windows PowerShell:

```powershell
Get-ChildItem (Join-Path $HOME ".claude\skills") -Directory | Where-Object Name -match '^(frontend-|react-internals|project-architect|build-frontend-app|develop-frontend-feature|migrate-frontend-app|audit-frontend-quality)' | Select-Object Name
```

Fourteen folders should be listed. Then start a session and type `/project-architect`. Claude Code picks up new skill folders without a restart in most cases; if the skills do not appear, restart it.

### Update

From the cloned repository:

```bash
git pull
```

Then run the copy command from [Install](#install-1) again. It overwrites the 14 folders in place. A skill removed in a later release is not deleted by copying; check the changelog for removals.

### Uninstall

Remove the 14 folders by name. Do not delete the whole skills directory; it may hold your other skills.

macOS and Linux:

```bash
for n in frontend-engineering-principles project-architect build-frontend-app develop-frontend-feature migrate-frontend-app audit-frontend-quality react-internals frontend-architecture frontend-state-architecture frontend-resilience frontend-performance-engineering frontend-security-audit frontend-testing-strategy frontend-production-readiness; do rm -rf "$HOME/.claude/skills/$n"; done
```

Windows PowerShell:

```powershell
$names = 'frontend-engineering-principles','project-architect','build-frontend-app','develop-frontend-feature','migrate-frontend-app','audit-frontend-quality','react-internals','frontend-architecture','frontend-state-architecture','frontend-resilience','frontend-performance-engineering','frontend-security-audit','frontend-testing-strategy','frontend-production-readiness'
foreach ($n in $names) { $p = Join-Path $HOME ".claude\skills\$n"; if (Test-Path $p) { Remove-Item -Recurse -Force $p } }
```

## Try it without installing

To load the plugin for a single session from a clone, without changing any settings:

```bash
claude --plugin-dir ./plugins/feos
```

## Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| Every skill appears twice | Both methods are installed | Remove one of them |
| Skills do not appear after a manual install | The session started before the folders existed, or the skills directory was created during the session | Restart Claude Code |
| `/feos:` shows 13 skills, not 14 | Expected. `frontend-engineering-principles` is hidden from the menu | Nothing to do |
| A skill says the principles are unavailable | The `frontend-engineering-principles` folder is missing | Manual install: copy again, including that folder. Plugin: reinstall |
| Plugin does not update | The marketplace copy is stale, or the session was not restarted | Run the two update commands, then restart |
| Your own skill was replaced | A manual install overwrote a folder with the same name | Restore it from your backup; consider the plugin method, which prefixes names |

## Test record

What has actually been run, and what has not. Version 0.1.0.

| Check | Result | Environment |
|---|---|---|
| `claude plugin validate --strict` on the plugin, the marketplace and the skills folder | Passed | Windows 11, Claude Code 2.1.237 |
| Plugin install from the marketplace manifest in a **local clone**, using an isolated configuration directory: marketplace add, install, list, details showing Skills (14), uninstall, marketplace remove | Passed | Windows 11, Claude Code 2.1.237 |
| Live session with the plugin loaded via `--plugin-dir`: a workflow invoked as `feos:<skill>` loaded `feos:frontend-engineering-principles` with no file permission granted | Passed | Windows 11, Claude Code 2.1.237 |
| Live session with the manual layout (skills in a `.claude/skills` folder): a reference invoked without prefix loaded `frontend-engineering-principles` with no file permission granted | Passed | Windows 11, Claude Code 2.1.237 |
| PowerShell install, repeat copy (update) and uninstall commands, run against a temporary home directory | Passed: 14 folders installed; a second copy left 14 files; uninstall removed only the 14 FEOS folders | Windows 11, Windows PowerShell 5.1 |
| macOS and Linux copy commands | Passed under Git Bash on Windows, against a temporary home directory, with the result identical to the source | Git Bash on Windows 11 |
| Manual install commands on real macOS, Linux and Windows machines, plus the repository validator | Passed: 14 skills installed on each | GitHub Actions runners (`ubuntu-latest`, `macos-latest`, `windows-latest`), first run on `main` |
| Plugin install from the **hosted GitHub repository** with the documented commands, using an isolated configuration directory: marketplace add, install, list, details showing Skills (14), marketplace update, plugin update, uninstall, marketplace remove. The installed copy contained only the manifest and the 14 skill folders, identical to the source | Passed | Windows 11, Claude Code 2.1.237 |
| Plugin install from the hosted repository on macOS and Linux | **Not yet run** | - |
| A live session using the copy installed from the hosted repository | **Not yet run.** Live sessions were run against the same files loaded with `--plugin-dir` | - |
| Plugin update that actually moves between two published versions | **Not yet run.** Needs a second release; the update commands were run and reported "already at the latest version" | - |
| Other Claude products and other agent platforms | **Not tested. No compatibility is claimed** | - |

Maintainers update this table when a pending check is run.
