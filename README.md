# Portfolio

A home for a collection of independent subprojects. The root URL presents a
chooser; each subproject lives in its own directory and is served under its own
path. The repository layout mirrors the published URL map one-to-one.

```
.
├── server.js              # zero-dependency Node server: chooser + static serving + shared API
├── projects/
│   ├── project-one/       #  →  https://<host>/project-one/
│   │   ├── project.json   #     metadata (title, description, order)
│   │   └── index.html     #     the project's entry point
│   └── project-two/       #  →  https://<host>/project-two/
│       ├── project.json
│       └── index.html
└── .github/workflows/     # CI: every push to main auto-deploys to AWS
```

## Adding a new project

No existing files need to change. Just:

1. Create `projects/<your-slug>/`.
2. Add a `project.json`:
   ```json
   { "title": "Your Project", "description": "One-line summary.", "order": 3 }
   ```
3. Add an `index.html` (plus any CSS/JS/assets) in that directory.
4. Commit and push to `main`.

The server discovers the directory on its own, lists it on the landing page, and
serves it at `/<your-slug>/`. Each project is self-contained — it owns its markup,
styling, and assets, so projects never interfere with one another.

### Shared back-end resources

Cross-project endpoints live in `server.js` under `/api/*` (currently
`/api/health`). Add shared endpoints there when more than one project needs them;
keep project-specific logic inside the project's own directory.

## Local development

```bash
npm install      # no runtime dependencies; installs dev tooling only
npm run dev      # node --watch server.js
# open http://localhost:3000
```

## Deployment

Pushing to `main` triggers
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which packages the
app and deploys it to AWS Elastic Beanstalk. AWS credentials are supplied as
GitHub Actions secrets (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) — no
credentials are ever committed to the repository.
