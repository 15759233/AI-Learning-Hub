'use strict'
const http = require('http')
const fs = require('fs')
const path = require('path')
const { URL } = require('url')

const ROOT = path.resolve(__dirname, '..', '..')

const APPS = [
  { name: 'student', port: 8080, dir: path.join(ROOT, 'frontend', 'dist'), target: 'http://127.0.0.1:3000' },
  { name: 'admin', port: 8081, dir: path.join(ROOT, 'admin-web', 'dist'), target: 'http://127.0.0.1:3000' },
]

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

function contentType(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
}

function serveStatic(app, req, res, pathname) {
  let filePath = path.join(app.dir, decodeURIComponent(pathname))
  if (!filePath.startsWith(app.dir)) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }
  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isFile()) {
      res.writeHead(200, { 'Content-Type': contentType(filePath), 'Cache-Control': 'no-cache' })
      fs.createReadStream(filePath).pipe(res)
      return
    }
    if (!err && stat.isDirectory()) {
      const index = path.join(filePath, 'index.html')
      fs.stat(index, (e2, s2) => {
        if (!e2 && s2.isFile()) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' })
          fs.createReadStream(index).pipe(res)
          return
        }
        fallbackIndex(app, res)
      })
      return
    }
    // SPA history fallback
    fallbackIndex(app, res)
  })
}

function fallbackIndex(app, res) {
  const index = path.join(app.dir, 'index.html')
  fs.stat(index, (err, stat) => {
    if (!err && stat.isFile()) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' })
      fs.createReadStream(index).pipe(res)
    } else {
      res.writeHead(404)
      res.end('Not Found')
    }
  })
}

function proxyRequest(app, req, res) {
  const target = new URL(req.url, app.target)
  const proxyReq = http.request(
    {
      hostname: target.hostname,
      port: target.port,
      path: target.pathname + target.search,
      method: req.method,
      headers: { ...req.headers, host: target.host },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers)
      proxyRes.pipe(res)
    }
  )
  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end(`Bad Gateway: ${err.message}`)
  })
  req.pipe(proxyReq)
}

for (const app of APPS) {
  if (!fs.existsSync(app.dir)) {
    console.error(`[${app.name}] build output missing: ${app.dir}. Run the build first.`)
    process.exitCode = 1
    continue
  }
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`).pathname
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      proxyRequest(app, req, res)
    } else {
      serveStatic(app, req, res, pathname === '/' ? '/' : pathname)
    }
  })
  server.listen(app.port, '127.0.0.1', () => {
    console.log(`[${app.name}] serving ${app.dir} on http://127.0.0.1:${app.port}`)
  })
  server.on('error', (err) => {
    console.error(`[${app.name}] port ${app.port} error: ${err.message}`)
    process.exitCode = 1
  })
}
