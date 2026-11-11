# Security policy

## What FEOS is

FEOS consists of Markdown skill files, two JSON manifests and one validation script. It contains no hooks, no MCP servers, no executables in the plugin, and no code that runs on installation. The installed plugin folder (`plugins/feos/`) holds only skill instructions.

Skills are instructions that an AI model follows, so the relevant risks are different from those of ordinary software:

- **Instructions that cause harm.** A skill that tells the model to run destructive commands, read or transmit secrets, weaken security settings, or act without the user's approval.
- **Unsafe engineering advice.** Guidance in a skill that would lead to a vulnerability if followed, for example recommending an insecure token storage approach.
- **Supply-chain concerns.** A change to the manifests or the validation script that introduces unexpected behavior.

## Reporting a vulnerability

Please report privately. Do not open a public issue for a security problem.

Use GitHub's private vulnerability reporting: on the repository page, open the **Security** tab and choose **Report a vulnerability**.

Include:

- The file and the text concerned.
- What could go wrong and under what conditions.
- A suggested correction, if you have one.

You should receive an acknowledgement within seven days. FEOS is maintained on a best-effort basis by volunteers; there is no guaranteed resolution time, but confirmed problems that could cause harm are prioritized over everything else.

## Supported versions

Only the latest released version is supported. Fixes are released as a new version.

## Scope

In scope: the contents of this repository.

Out of scope: Claude Code itself, the underlying models, and applications built with the help of FEOS. Report those to their respective owners. FEOS's security skill reviews frontend code and cannot verify server-side controls; an application is not secure because a FEOS review found nothing.

## Using FEOS safely

- Review skill files before installing them, as you would any instructions you give to an AI agent with access to your code.
- Install from the official repository and check the version.
- Keep Claude Code's permission prompts enabled for actions you want to approve.
