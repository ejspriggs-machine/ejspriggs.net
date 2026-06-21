# CLAUDE.md

Guidance for Claude Code (and any Claude surface) working in this repository.

## What this is

A personal portfolio site: a home for independent subprojects. The root URL
serves a chooser; each subproject lives in its own directory and is served under
its own path. **Repository layout mirrors the published URL map one-to-one.**

Published at **ejspriggs.net**. The app itself is a single zero-dependency Node
HTTP server.

## Repository location

This repo is the `portfolio-nodejs/` subdirectory of the
`Portfolio/` project folder — **the git repo root is `portfolio-nodejs/`, not its
parent.** The parent `Portfolio/` folder holds local tooling/credentials that are
deliberately outside version control.

## Layout

```
server.js              # zero-dependency Node server: chooser + static serving + shared /api/*
projects/
  <slug>/
    project.json       # { "title", "description", "order" }
    index.html         # entry point (+ any CSS/JS/assets, self-contained)
.github/workflows/
  deploy.yml           # CI: push to main → deploy to AWS Elastic Beanstalk
```

## Adding a project (the core workflow)

No existing files need to change. Create `projects/<slug>/`, add a `project.json`
(`title`, `description`, `order`) and an `index.html`, then commit and push to
`main`. The server auto-discovers the directory, lists it on the landing page,
and serves it at `/<slug>/`. Each project owns its own markup/styles/assets and
must not interfere with others.

Shared cross-project endpoints live in `server.js` under `/api/*` (e.g.
`/api/health`). Add shared logic there only when more than one project needs it;
keep project-specific logic inside the project directory.

## Local development

```bash
npm run dev      # node --watch server.js
# open http://localhost:3000
```

No runtime dependencies. `npm install` only installs dev tooling.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which zips the app and
deploys to **AWS Elastic Beanstalk**:
- App: `hello-world-nodejs`  ·  Env: `hello-world-nodejs-env`  ·  Region: `us-east-1`
- AWS creds are supplied as **GitHub Actions secrets**; none are committed.

For cases where pushing to GitHub is impossible or undesirable, this environment
can also deploy directly via the AWS CLI using the local `claude-deployer`
credentials (see below).

## This sandboxed environment (security model)

This host is deliberately segregated so an LLM can be trusted to act here without
risking other systems. Two scoped credentials are loaded automatically from
`../.claude/settings.local.json` (git-ignored — **never commit secrets, never put
a token in a remote URL or script**):

- **AWS** — IAM user `claude-deployer` (account `740150420587`). Parsimonious:
  scoped to deploy this project to Elastic Beanstalk and nothing else. It cannot
  even read its own IAM policy, so it cannot enumerate or escalate its
  permissions. Don't assume broader AWS access — if a command fails with
  AccessDenied, that's by design, not a bug to work around.
- **GitHub** — token for the alt account **`ejspriggs-machine`** (an LLM-only
  identity, not the owner's main account). `gh` is installed and auto-authenticates
  from the `GITHUB_TOKEN` env var; git uses `gh` as its credential helper, so no
  token belongs in any remote URL.

If credentials ever appear in plaintext in a transcript or a committed file, flag
it — rotating these scoped creds is cheap and keeps the sandbox boundary intact.
