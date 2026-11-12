# Changelog

All notable changes to FEOS are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

How versions are chosen for a project made of skill instructions is described in [docs/release.md](docs/release.md).

## [Unreleased]

### Added

- `CODEOWNERS` file so the maintainer is requested as reviewer on every pull request.

## [0.1.0] - 2026-11-11

First public release.

### Added

- Five workflow skills: `project-architect`, `build-frontend-app`, `develop-frontend-feature`, `migrate-frontend-app`, `audit-frontend-quality`.
- Eight specialist reference skills: `react-internals`, `frontend-architecture`, `frontend-state-architecture`, `frontend-resilience`, `frontend-performance-engineering`, `frontend-security-audit`, `frontend-testing-strategy`, `frontend-production-readiness`.
- Shared `frontend-engineering-principles` skill: engineering mindset, technical decision process, common rules and the skill map.
- Claude Code plugin (`feos`) and marketplace manifest for plugin installation.
- Manual installation instructions for Windows, macOS and Linux.
- Repository validator (`scripts/validate.mjs`) covering skill metadata, required sections, the dependency graph, manifests, documentation links, and a private-information and secret scan.
- Continuous integration workflow running the validator and a manual-installation check on Windows, macOS and Linux.
- Documentation: architecture, installation, usage and release process.

### Known limitations

- Targets Claude Code only. Other Claude products and other agent platforms are untested.
- Skill activation has been reviewed against the skill descriptions but not measured with automated evaluation runs.
- Installation from the hosted GitHub repository has been verified on Windows only. See the test record in [docs/installation.md](docs/installation.md).
