# Hacktoberfest-Nexora
# 🩺 git-cure
> **Zero-Click, Terminal-Native Git Diagnostics & Autonomous Remediation Engine Powered by Gemma 4.**

## 🚨 The Problem: The Hacktoberfest Git Nightmare
During hackathons and open-source sprints, contributors frequently break their local Git repository:
* Getting trapped in a **`Detached HEAD`** state after inspecting an old commit.
* Accidentally committing a **private `.env` or API token** into Git history.
* Getting stranded in an unfinished, conflicted **`rebase`** or **`merge`**.
* Writing 4 hours of code on `main` instead of an isolated feature branch.
When developers panic, they search StackOverflow or paste errors into generic web chatbots, copy-paste arbitrary commands like `git reset --hard`, and **permanently wipe out their uncommitted work**.

## 💡 The Solution: `git-cure`
`git-cure` is a zero-click, terminal-native **Git Doctor**. 
Instead of requiring manual error copy-pasting, `git-cure` executes directly inside your broken repository:
1. **Sensors** automatically inspect low-level Git telemetry (status, reflog, commit ancestry, diff stats).
2. **Gemma 4** (routed via **OmniRoute**) performs structured root-cause analysis and formulates a safe recovery recipe.
3. **Safety Engine** creates an automated pre-flight recovery snapshot (`refs/git-cure/snapshot-*`) before executing anything—guaranteeing **zero data loss**.
4. **Interactive HUD** steps the developer through the fix with single-key confirmation.
