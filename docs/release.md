# Release process

For maintainers. Nothing here is automated; each step is a deliberate action.

## Repository presentation

**Description**

> FEOS (Frontend Engineering Operating System): Claude Code skills that plan, build, change, migrate and audit frontend applications with senior-level engineering judgment.

**Topics**

`claude-code` `claude-code-plugin` `claude-skills` `agent-skills` `frontend` `react` `frontend-architecture` `state-management` `web-performance` `frontend-security` `testing` `code-review`

**Settings to enable**

- Private vulnerability reporting (required by `SECURITY.md`).
- Issues, with the templates in `.github/ISSUE_TEMPLATE`.
- Branch protection on `main`: require the `Validate` workflow to pass.

## Versioning

FEOS follows Semantic Versioning, interpreted for a project whose "API" is skill names, descriptions and behavior.

| Change | Version |
|---|---|
| A skill is removed or renamed; the plugin or marketplace name changes; a workflow's steps change in a way that alters what users must do | Major |
| A new skill; a new section, decision table or scenario; a description change that alters when a skill activates | Minor |
| Corrections, clarifications, typo fixes, documentation | Patch |

While the version is below 1.0.0, descriptions and activation conditions are still being tuned and minor versions may change behavior noticeably.

The version lives in `plugins/feos/.claude-plugin/plugin.json`. Claude Code keeps users on the installed version until that value changes, so **a release that does not change the version does not reach plugin users**. The marketplace entry does not set a version; `plugin.json` is the single source.

## Release checklist

Before tagging:

- [ ] `node scripts/validate.mjs --git` reports zero errors (the `--git` flag also scans history and commit identities).
- [ ] `claude plugin validate --strict ./plugins/feos` and `claude plugin validate --strict .` both pass.
- [ ] `plugin.json` version is updated.
- [ ] `CHANGELOG.md` has a dated entry for the version, and "Unreleased" is empty.
- [ ] README skill tables match the skill folders.
- [ ] The plugin loads in a fresh session: `claude --plugin-dir ./plugins/feos`, then invoke one workflow and one reference.
- [ ] Manual installation commands in `docs/installation.md` were run on at least one platform.
- [ ] The `Validate` workflow is green on `main`.

Public-release audit, every release:

- [ ] `git status --ignored` shows no unintended files.
- [ ] No private names, paths, email addresses or secrets in the tree or in history.
- [ ] Commit author and committer identities are the intended public ones. The `--git` run lists every identity with a public email as a warning; confirm each is an outside contributor. Keep your own private names in a git-ignored `.private-terms` file (one term per line) so the validator fails if one appears in a commit identity or a file.
- [ ] No content copied from sources that cannot be redistributed under MIT.

After pushing:

- [ ] Tag the release: `git tag v<version>` and push the tag.
- [ ] Create the GitHub release with the notes from `CHANGELOG.md`.
- [ ] Install from the hosted repository on a clean machine or clean config directory and confirm 14 skills load. Update the test record in `docs/installation.md`.

## Release notes: 0.1.0

> **FEOS 0.1.0 - first public release**
>
> FEOS (Frontend Engineering Operating System) is a set of skills for Claude Code that brings engineering judgment to frontend work.
>
> **Included**
>
> - Five workflows: `project-architect`, `build-frontend-app`, `develop-frontend-feature`, `migrate-frontend-app`, `audit-frontend-quality`.
> - Eight specialist references: React internals, architecture, state architecture, resilience, performance engineering, security audit, testing strategy, production readiness.
> - Shared engineering principles loaded by every skill.
> - Install as a Claude Code plugin or by copying the skill folders.
>
> **Good to know**
>
> - Targets Claude Code. Other products and platforms are untested.
> - Skill activation is tuned by review, not yet by measured evaluation. Reports of skills activating at the wrong time are welcome.
> - This is a 0.x release. Descriptions and activation conditions may change between minor versions.
>
> Installation and usage: see the README.

## Roadmap

In rough priority order. No dates are promised.

1. **Measured activation tests.** A set of requests with the expected skill for each, run in fresh sessions, so description changes are judged by results.
2. **Workflow evaluation cases.** Scored cases for each workflow, using Claude Code's plugin evaluation support.
3. **Framework depth.** More detailed guidance for server rendering, React Server Components and framework data loading.
4. **Example projects.** A recorded architect-to-build run on a small and a medium application.
5. **Accessibility reference.** A dedicated specialist skill; today accessibility is covered inside the workflows.
6. **Activation tuning from feedback.** Refine the conditions under which references load, based on reported cases.

## Handling a bad release

If a release contains harmful or seriously wrong guidance: publish a patch version that corrects it, note it at the top of `CHANGELOG.md`, and, if a private term or secret was published, treat it as leaked. Rewriting history does not undo a public leak; rotate any exposed credential.
