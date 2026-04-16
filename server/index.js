const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// 1. API Key Authentication
//    Set the CLOUDPLAY_API_KEY environment variable before starting the server.
//    Every request must include the header: x-api-key: <key>
// ---------------------------------------------------------------------------
const API_KEY = process.env.CLOUDPLAY_API_KEY;

if (!API_KEY) {
  console.error(
    'ERROR: CLOUDPLAY_API_KEY environment variable is not set.\n' +
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n' +
    'Then start the server with: CLOUDPLAY_API_KEY=<key> node index.js'
  );
  process.exit(1);
}

function authenticate(req, res, next) {
  // Skip auth for CORS preflight requests
  if (req.method === 'OPTIONS') return next();

  const key = req.headers['x-api-key'];
  if (!key || Buffer.byteLength(key) !== Buffer.byteLength(API_KEY) ||
      !crypto.timingSafeEqual(Buffer.from(key), Buffer.from(API_KEY))) {
    return res.status(401).json({ error: 'Unauthorized – invalid or missing API key' });
  }
  next();
}

// Apply authentication to all routes
app.use(authenticate);

// ---------------------------------------------------------------------------
// 2. Restrictive CORS – only allow the origins you control
//    OPTIONS preflight succeeds because authenticate() skips OPTIONS requests.
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = (process.env.CLOUDPLAY_ALLOWED_ORIGINS || '').split(',').filter(Boolean);

app.use(function (req, res, next) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  // No wildcard – omit the header entirely for disallowed origins
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ---------------------------------------------------------------------------
// 3. Security headers
// ---------------------------------------------------------------------------
app.use(function (req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// ---------------------------------------------------------------------------
// 4. Body parsing with size limits
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '1kb' }));

// ---------------------------------------------------------------------------
// 5. Upload handling – strict validation
//    Max 2 GB per file, only .exe / .iso / .zip allowed.
//    Filenames are replaced with safe slugs to prevent path traversal.
// ---------------------------------------------------------------------------
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_EXTENSIONS = ['.exe', '.iso', '.zip'];
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (_req, file, cb) {
    // Sanitise: keep only alphanumerics, hyphens, underscores, and the extension
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 100);
    cb(null, base + ext);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: function (_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error('File type not allowed. Only .exe, .iso, .zip are accepted.'));
    }
    cb(null, true);
  },
});

// ---------------------------------------------------------------------------
// 6. Filename validation helper (for launch requests)
// ---------------------------------------------------------------------------
function isSafeFilename(name) {
  if (typeof name !== 'string' || name.length === 0 || name.length > 200) return false;
  // Must end with an allowed extension
  const ext = path.extname(name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) return false;
  // Block path traversal
  if (name.includes('/') || name.includes('\\') || name.includes('..')) return false;
  // Only safe characters
  if (!/^[a-zA-Z0-9_\-. ]+$/.test(name)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// 7. Input key allowlist (for xdotool)
// ---------------------------------------------------------------------------
const ALLOWED_KEYS = new Set([
  'Up', 'Down', 'Left', 'Right', 'Return', 'space', 'Escape',
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'Tab', 'BackSpace', 'Delete',
  'shift', 'ctrl', 'alt',
]);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// GET /games – list uploaded games
app.get('/games', function (_req, res) {
  fs.readdir(UPLOAD_DIR, function (err, files) {
    if (err) return res.json([]);
    const games = files
      .filter(function (f) {
        return ALLOWED_EXTENSIONS.includes(path.extname(f).toLowerCase());
      })
      .map(function (f) {
        const stats = fs.statSync(path.join(UPLOAD_DIR, f));
        return { name: f, size: stats.size };
      });
    res.json(games);
  });
});

// POST /upload – upload a game file
app.post('/upload', function (req, res) {
  upload.single('game')(req, res, function (err) {
    if (err) {
      const message = err instanceof multer.MulterError
        ? 'Upload error: ' + err.message
        : err.message || 'Upload failed';
      return res.status(400).json({ error: message });
    }
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    res.json({ ok: true, name: req.file.filename, size: req.file.size });
  });
});

// POST /launch – launch a game with Wine inside Xvfb
app.post('/launch', function (req, res) {
  const filename = req.body && req.body.filename;
  if (!isSafeFilename(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const gamePath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(gamePath)) {
    return res.status(404).json({ error: 'Game not found' });
  }

  // Use execFile (not exec/shell) to prevent command injection.
  // Wine is launched inside a virtual framebuffer.
  execFile('xvfb-run', ['-a', 'wine', gamePath], function (err) {
    if (err) console.error('Wine error:', err.message);
  });

  res.json({ ok: true, message: 'Game launched' });
});

// POST /stop – stop the running game
app.post('/stop', function (_req, res) {
  // Kill wine processes owned by this user only
  execFile('pkill', ['-f', 'wine'], function () {
    // Ignore errors – process may not be running
  });
  res.json({ ok: true });
});

// POST /input – send keyboard input via xdotool
app.post('/input', function (req, res) {
  const body = req.body || {};
  if (body.type !== 'key') {
    return res.status(400).json({ error: 'Unsupported input type' });
  }
  if (!ALLOWED_KEYS.has(body.key)) {
    return res.status(400).json({ error: 'Key not allowed' });
  }
  // execFile prevents shell injection – key is also allowlisted above
  execFile('xdotool', ['key', body.key], function (err) {
    if (err) return res.status(500).json({ error: 'Input failed' });
    res.json({ ok: true });
  });
});

// ---------------------------------------------------------------------------
// No debug / catch-all routes – return 404 for anything else
// ---------------------------------------------------------------------------
app.use(function (_req, res) {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler – never leak stack traces
app.use(function (err, _req, res, _next) {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, function () {
  console.log('CloudPlay server listening on port ' + PORT);
});
