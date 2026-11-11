# Contributing to FEOS

Thank you for considering a contribution. FEOS improves through real use, so the most valuable input is specific: a skill that gave poor guidance, a decision table missing a case, a skill that activated when it should not have.

## Ways to contribute

- **Report a problem.** Open an issue using the bug report template. Include the skill, what you asked, what happened, and what you expected.
- **Propose an improvement.** Open an issue using the skill improvement template before writing a large change, so the approach can be agreed first.
- **Fix or extend a skill.** Open a pull request. Small corrections do not need an issue first.

## Before you write

Read [docs/architecture.md](docs/architecture.md). Four rules matter most.

**1. One owner per topic.** Each subject belongs to exactly one skill. Before adding content, check the ownership table and put it with the owner. If a neighbouring skill needs to mention the subject, it names the owner in one line and stops.

**2. One dependency direction.** Workflows load references and the principles. References load only the principles. The principles skill loads nothing. Workflows hand off to other workflows; they do not load them.

**3. Loading uses a fixed phrase.** A load is written exactly as ``Load the `skill-name` skill``. The validator builds the dependency graph from that phrase. A plain backticked skill name is a pointer, not a load.

**4. Depth over breadth.** A skill should help Claude decide, not list topics. Prefer a decision table with reasons, a scenario with its root cause, or a concrete anti-pattern over general advice.

## Writing guidelines

- **Actionable.** Say what to do, when, and why. Avoid "consider" without a criterion.
- **Proportionate.** Do not push advanced patterns onto small applications. State when something is not worth doing.
- **Version-aware.** Do not assume a React version, framework or library. Where behavior is version-specific, tell Claude to verify against the installed version and official documentation.
- **Tool-neutral where possible.** Named libraries are examples. Skills should use what a repository already has.
- **Honest.** Never instruct Claude to report a check as passed unless it ran.
- **Original.** Contribute only text you wrote or have the right to license under MIT. Do not paste from books, courses, other skills or documentation. Link to official documentation instead of reproducing it.
- **Plain.** Short sentences. No marketing language.

### Reference skills

A specialist reference has these eight sections, in order, with these exact headings:

```
## 1. Scope and boundaries
## 2. When to consult
## 3. Mental model
## 4. Decision criteria
## 5. Scenarios
## 6. Anti-patterns
## 7. Version checks
## 8. Validation
```

### Frontmatter

Use only fields documented for Claude Code skills. FEOS skills use `name`, `description`, `argument-hint`, and, for the principles skill only, `user-invocable`.

- `name` matches the folder name, kebab-case.
- `description` is one line, at most 1,024 characters, and says what the skill does, when to use it, and what it is not for. This text decides when Claude selects the skill, so wording changes here need care.

Keep each `SKILL.md` under 500 lines.

## Validate

Requires Node.js 18 or later. No install step.

```bash
node scripts/validate.mjs
```

This checks metadata, required sections, the dependency graph, manifests, documentation links, and scans for private paths, email addresses and secrets. It must report zero errors.

If you have Claude Code installed, also run:

```bash
claude plugin validate --strict ./plugins/feos
```

```bash
claude plugin validate --strict .
```

To try your change, load the plugin for one session without installing it:

```bash
claude --plugin-dir ./plugins/feos
```

## Pull requests

- One subject per pull request.
- Describe what changed and why, and how you tested it. Say plainly what you did not test.
- If you changed a skill's `description`, list a few requests that should activate it and a few that should not.
- Update `CHANGELOG.md` under "Unreleased".
- Do not change the version in `plugin.json`; maintainers do that at release.

## Adding a new skill

New skills are possible but uncommon. Open an issue first and explain which subject has no owner today, why it does not fit an existing skill, and whether it is a workflow or a reference. A new skill also needs entries in `scripts/validate.mjs`, the principles skill map, `README.md` and `docs/architecture.md`.

## Conduct

Be respectful and constructive. Critique the text, not the person. Maintainers may edit or close contributions that are off-topic, promotional, or hostile.

## License

By contributing, you agree that your contribution is licensed under the [MIT License](LICENSE).
