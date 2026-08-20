# Bomb Game — build drop zone

The PICO-8 **web export** goes here. This directory is intentionally otherwise
empty until the first build.

## Deploying a build

1. In PICO-8, run: `EXPORT INDEX.HTML`
2. Copy the two resulting files — **`index.html`** and **`index.js`** — into this
   directory (`projects/bomb-game/game/`), overwriting the previous build.
3. Commit and push to `main`. GitHub Actions deploys it automatically.

The wrapper at `../index.html` detects `index.html` here and embeds it; until then
it shows a "coming soon" placeholder. Nothing else needs to change between builds.

> Keep the exported files named `index.html` / `index.js`. If PICO-8 names the
> export after the cart instead, rename the two files to `index.*` before copying.
