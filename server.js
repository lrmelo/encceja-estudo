const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const PUBLIC_DIR = path.join(__dirname, 'public');
const START_PORT = 3000;

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
};

function resolveFilePath(requestUrl) {
  const url = new URL(requestUrl, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const filePath = path.normalize(path.join(PUBLIC_DIR, pathname));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    return null;
  }

  return filePath;
}

async function sendFile(filePath, response) {
  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      return sendFile(path.join(filePath, 'index.html'), response);
    }

    const content = await fs.readFile(filePath);
    const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';

    response.writeHead(200, { 'Content-Type': contentType });
    response.end(content);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Arquivo nao encontrado.');
  }
}

function startServer(port) {
  const server = http.createServer(async (request, response) => {
    const filePath = resolveFilePath(request.url || '/');

    if (!filePath) {
      response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Acesso negado.');
      return;
    }

    await sendFile(filePath, response);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      startServer(port + 1);
      return;
    }

    throw error;
  });

  server.listen(port, () => {
    console.log(`Aplicacao disponivel em http://localhost:${port}`);
  });
}

startServer(START_PORT);
