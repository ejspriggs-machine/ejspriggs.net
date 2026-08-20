const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PROJECTS_DIR = path.join(__dirname, 'projects');

// --- Project discovery -------------------------------------------------------
// Each subproject is a self-contained directory under projects/<slug>/ holding
// its own static assets plus a project.json manifest. Adding a project means
// dropping in a new directory — nothing else in the codebase needs to change.
function discoverProjects() {
  let entries = [];
  try {
    entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
  } catch {
    return []; // no projects/ dir yet
  }

  return entries
    .filter((e) => e.isDirectory())
    .map((e) => {
      const slug = e.name;
      const meta = readManifest(slug);
      return {
        slug,
        title: meta.title || slug,
        description: meta.description || '',
        order: typeof meta.order === 'number' ? meta.order : 100,
      };
    })
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

function readManifest(slug) {
  try {
    const raw = fs.readFileSync(path.join(PROJECTS_DIR, slug, 'project.json'), 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// --- Static file serving -----------------------------------------------------
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

function serveStatic(res, baseDir, relPath) {
  // Resolve and confirm the target stays within baseDir (path-traversal guard).
  const target = path.normalize(path.join(baseDir, relPath));
  if (target !== baseDir && !target.startsWith(baseDir + path.sep)) {
    return send(res, 403, 'Forbidden');
  }

  fs.stat(target, (err, stat) => {
    if (err || !stat.isFile()) return notFound(res);
    res.writeHead(200, { 'Content-Type': CONTENT_TYPES[path.extname(target)] || 'application/octet-stream' });
    fs.createReadStream(target).pipe(res);
  });
}

function send(res, code, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type });
  res.end(body);
}

function notFound(res) {
  send(res, 404, renderError(404, 'Page not found'), 'text/html; charset=utf-8');
}

// --- Request routing ---------------------------------------------------------
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);

  // Origin verification: when ORIGIN_VERIFY_SECRET is set (an EB environment
  // property, never committed), only serve requests carrying the matching header
  // that CloudFront injects on every origin request. This blocks bots that hit
  // the Elastic Beanstalk origin directly, bypassing the CDN. Fail-safe: with no
  // secret configured, nothing is enforced. /api/health stays open so infra and
  // uptime checks can reach the instance directly.
  const originSecret = process.env.ORIGIN_VERIFY_SECRET;
  if (originSecret && pathname !== '/api/health' && req.headers['x-origin-verify'] !== originSecret) {
    return send(res, 403, 'Forbidden');
  }

  // Shared backend resource: a tiny health endpoint every project can rely on,
  // and which doubles as proof the live backend + auto-deploy pipeline works.
  if (pathname === '/api/health') {
    const projects = discoverProjects();
    return send(
      res,
      200,
      JSON.stringify({ status: 'ok', projects: projects.length, timestamp: new Date().toISOString() }),
      'application/json; charset=utf-8'
    );
  }

  // Landing page: the choice-of-subprojects chooser.
  if (pathname === '/' || pathname === '/index.html') {
    return send(res, 200, renderLanding(discoverProjects()), 'text/html; charset=utf-8');
  }

  // Everything else is /<slug>/... — serve from that project's directory.
  const segments = pathname.split('/').filter(Boolean);
  const slug = segments[0];
  const projectDir = path.join(PROJECTS_DIR, slug);

  if (!slug || !fs.existsSync(projectDir)) return notFound(res);

  // Normalise /<slug> -> /<slug>/ so the project's relative asset paths resolve.
  if (segments.length === 1 && !pathname.endsWith('/')) {
    res.writeHead(301, { Location: pathname + '/' });
    return res.end();
  }

  const rel = segments.slice(1).join('/') || 'index.html';
  serveStatic(res, projectDir, rel.endsWith('/') ? rel + 'index.html' : rel);
});

server.listen(PORT, () => {
  console.log(`Portfolio server running at http://localhost:${PORT}`);
});

// --- HTML rendering ----------------------------------------------------------
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderLanding(projects) {
  const cards = projects.length
    ? projects
        .map(
          (p) => `
        <a class="card" href="/${esc(p.slug)}/">
          <h2>${esc(p.title)}</h2>
          <p>${esc(p.description)}</p>
          <span class="go">Open &rarr;</span>
        </a>`
        )
        .join('')
    : '<p class="empty">No projects yet. Add one under <code>projects/</code>.</p>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ejspriggs · portfolio</title>
  <style>
    :root { color-scheme: light dark; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0; min-height: 100vh;
      background: #0f172a; color: #e2e8f0;
      display: flex; flex-direction: column;
    }
    header { padding: 64px 24px 24px; text-align: center; }
    header h1 { font-size: 2.5rem; margin: 0 0 8px; letter-spacing: -0.02em; }
    header p { color: #94a3b8; margin: 0; font-size: 1.05rem; }
    main { flex: 1; width: 100%; max-width: 960px; margin: 0 auto; padding: 32px 24px; }
    .grid { display: grid; gap: 20px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
    .card {
      display: flex; flex-direction: column;
      background: #1e293b; border: 1px solid #334155; border-radius: 14px;
      padding: 24px; text-decoration: none; color: inherit;
      transition: transform 0.15s ease, border-color 0.15s ease;
    }
    .card:hover { transform: translateY(-3px); border-color: #38bdf8; }
    .card h2 { margin: 0 0 8px; font-size: 1.25rem; }
    .card p { margin: 0 0 16px; color: #94a3b8; flex: 1; }
    .card .go { color: #38bdf8; font-weight: 600; font-size: 0.9rem; }
    .empty { color: #94a3b8; text-align: center; }
    footer { text-align: center; padding: 24px; color: #64748b; font-size: 0.85rem; }
    footer #backend { font-weight: 600; }
  </style>
</head>
<body>
  <header>
    <h1>Portfolio</h1>
    <p>A collection of independent projects. Pick one to explore.</p>
  </header>
  <main>
    <div class="grid">${cards}</div>
  </main>
  <footer>backend: <span id="backend">checking&hellip;</span></footer>
  <script>
    fetch('/api/health').then((r) => r.json()).then((d) => {
      document.getElementById('backend').textContent = d.status + ' · ' + d.projects + ' projects';
    }).catch(() => { document.getElementById('backend').textContent = 'unavailable'; });
  </script>
</body>
</html>`;
}

function renderError(code, message) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${code}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0f172a; color: #e2e8f0; display: flex; flex-direction: column;
    align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  h1 { font-size: 4rem; margin: 0; }
  p { color: #94a3b8; }
  a { color: #38bdf8; }
</style></head>
<body>
  <h1>${code}</h1>
  <p>${esc(message)}</p>
  <a href="/">&larr; Back to portfolio</a>
</body></html>`;
}
