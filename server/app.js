import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import express from 'express';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const CATEGORIES = ['작물', '가축', '채집', '마을', '날씨', '요리'];
export const SEASONS = ['봄', '여름', '가을', '겨울'];

const MIME = {
  'image/jpeg': { ext: '.jpg', kind: 'image' },
  'image/png': { ext: '.png', kind: 'image' },
  'image/gif': { ext: '.gif', kind: 'image' },
  'image/webp': { ext: '.webp', kind: 'image' },
  'video/mp4': { ext: '.mp4', kind: 'video' },
  'video/webm': { ext: '.webm', kind: 'video' },
};

const MAX_MEDIA = 6;
const MAX_BYTES = 40 * 1024 * 1024;

export function createApp(options = {}) {
  const dataDir = options.dataDir || process.env.DATA_DIR || path.join(process.cwd(), 'data');
  const uploadDir = path.join(dataDir, 'uploads');
  fs.mkdirSync(uploadDir, { recursive: true });

  const secretPath = path.join(dataDir, '.jwt-secret');
  if (!fs.existsSync(secretPath)) {
    fs.writeFileSync(secretPath, crypto.randomBytes(32).toString('hex'));
  }
  const secret = fs.readFileSync(secretPath, 'utf8').trim();

  const db = new DatabaseSync(path.join(dataDir, 'dewglen.sqlite'));
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'admin')),
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      category TEXT NOT NULL,
      season TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime TEXT NOT NULL,
      kind TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  seed(db, uploadDir);

  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, uploadDir),
      filename: (_req, file, cb) => {
        const meta = MIME[file.mimetype];
        cb(null, `${crypto.randomUUID()}${meta ? meta.ext : ''}`);
      },
    }),
    limits: { fileSize: MAX_BYTES, files: MAX_MEDIA },
    fileFilter: (_req, file, cb) => {
      if (!MIME[file.mimetype]) {
        cb(new Error('사진(jpg, png, gif, webp) 또는 영상(mp4, webm)만 올릴 수 있습니다.'));
        return;
      }
      cb(null, true);
    },
  });

  const app = express();
  app.disable('x-powered-by');
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use('/uploads', express.static(uploadDir, { fallthrough: false, index: false }));

  app.use((req, _res, next) => {
    const token = req.cookies?.token;
    req.user = null;
    if (token) {
      try {
        const payload = jwt.verify(token, secret);
        req.user = db.prepare(
          'SELECT id, username, display_name, role, created_at FROM users WHERE id = ?'
        ).get(payload.uid) || null;
      } catch {
        req.user = null;
      }
    }
    next();
  });

  function setSession(res, user) {
    const token = jwt.sign({ uid: user.id }, secret, { expiresIn: '7d' });
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  function publicUser(user) {
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      createdAt: user.created_at,
    };
  }

  function requireUser(req, res, next) {
    if (!req.user) return res.status(401).json({ error: '로그인이 필요합니다.' });
    next();
  }

  function requireAdmin(req, res, next) {
    if (!req.user) return res.status(401).json({ error: '로그인이 필요합니다.' });
    if (req.user.role !== 'admin') return res.status(403).json({ error: '이장만 할 수 있는 일입니다.' });
    next();
  }

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => {
    res.json({ user: publicUser(req.user) });
  });

  app.post('/api/auth/register', (req, res) => {
    const username = String(req.body?.username || '').trim();
    const displayName = String(req.body?.displayName || '').trim();
    const password = String(req.body?.password || '');
    if (!/^[a-zA-Z0-9가-힣_]{2,20}$/.test(username)) {
      return res.status(400).json({ error: '아이디는 2~20자의 한글, 영문, 숫자입니다.' });
    }
    if (displayName.length < 1 || displayName.length > 20) {
      return res.status(400).json({ error: '표시 이름은 1~20자입니다.' });
    }
    if (password.length < 6 || password.length > 72) {
      return res.status(400).json({ error: '비밀번호는 6자 이상입니다.' });
    }
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) return res.status(409).json({ error: '이미 있는 아이디입니다.' });

    const user = {
      id: crypto.randomUUID(),
      username,
      display_name: displayName,
      password_hash: bcrypt.hashSync(password, 10),
      role: 'user',
      created_at: new Date().toISOString(),
    };
    db.prepare(
      'INSERT INTO users (id, username, display_name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(user.id, user.username, user.display_name, user.password_hash, user.role, user.created_at);
    setSession(res, user);
    res.status(201).json({ user: publicUser(user) });
  });

  app.post('/api/auth/login', (req, res) => {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 맞지 않습니다.' });
    }
    setSession(res, user);
    res.json({ user: publicUser(user) });
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie('token', { path: '/' });
    res.json({ ok: true });
  });

  app.get('/api/entries', (req, res) => {
    res.json({ entries: listEntries(db, req.query) });
  });

  app.get('/api/entries/:id', (req, res) => {
    const entry = getEntry(db, req.params.id);
    if (!entry) return res.status(404).json({ error: '일지를 찾을 수 없습니다.' });
    res.json({ entry });
  });

  app.post('/api/entries', requireUser, upload.array('files', MAX_MEDIA), (req, res) => {
    const parsed = readEntryFields(req.body);
    if (parsed.error) {
      cleanupFiles(req.files);
      return res.status(400).json({ error: parsed.error });
    }
    if ((req.files || []).length > MAX_MEDIA) {
      cleanupFiles(req.files);
      return res.status(400).json({ error: `파일은 ${MAX_MEDIA}개까지입니다.` });
    }
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    db.exec('BEGIN');
    try {
      db.prepare(
        'INSERT INTO entries (id, user_id, title, body, category, season, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(id, req.user.id, parsed.title, parsed.body, parsed.category, parsed.season, now, now);
      insertMedia(db, id, req.files || [], now);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      cleanupFiles(req.files);
      throw error;
    }
    res.status(201).json({ entry: getEntry(db, id) });
  });

  app.put('/api/entries/:id', requireUser, upload.array('files', MAX_MEDIA), (req, res) => {
    const current = getEntry(db, req.params.id);
    if (!current) {
      cleanupFiles(req.files);
      return res.status(404).json({ error: '일지를 찾을 수 없습니다.' });
    }
    if (current.author.id !== req.user.id && req.user.role !== 'admin') {
      cleanupFiles(req.files);
      return res.status(403).json({ error: '이 일지를 고칠 권한이 없습니다.' });
    }
    const parsed = readEntryFields(req.body);
    if (parsed.error) {
      cleanupFiles(req.files);
      return res.status(400).json({ error: parsed.error });
    }
    const removeIds = parseRemoveIds(req.body?.removeMediaIds);
    const remaining = current.media.filter((item) => !removeIds.includes(item.id));
    const incoming = req.files || [];
    if (remaining.length + incoming.length > MAX_MEDIA) {
      cleanupFiles(incoming);
      return res.status(400).json({ error: `사진과 영상은 합쳐서 ${MAX_MEDIA}개까지입니다.` });
    }
    const unknown = removeIds.filter((id) => !current.media.some((item) => item.id === id));
    if (unknown.length) {
      cleanupFiles(incoming);
      return res.status(400).json({ error: '빼려는 파일을 찾을 수 없습니다.' });
    }

    const now = new Date().toISOString();
    db.exec('BEGIN');
    try {
      db.prepare(
        'UPDATE entries SET title = ?, body = ?, category = ?, season = ?, updated_at = ? WHERE id = ?'
      ).run(parsed.title, parsed.body, parsed.category, parsed.season, now, current.id);
      for (const id of removeIds) {
        const media = current.media.find((item) => item.id === id);
        db.prepare('DELETE FROM media WHERE id = ? AND entry_id = ?').run(id, current.id);
        if (media) fs.rmSync(path.join(uploadDir, media.filename), { force: true });
      }
      insertMedia(db, current.id, incoming, now);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      cleanupFiles(incoming);
      throw error;
    }
    res.json({ entry: getEntry(db, current.id) });
  });

  app.delete('/api/entries/:id', requireUser, (req, res) => {
    const current = getEntry(db, req.params.id);
    if (!current) return res.status(404).json({ error: '일지를 찾을 수 없습니다.' });
    if (current.author.id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: '이 일지를 지울 권한이 없습니다.' });
    }
    deleteEntryFiles(db, uploadDir, current.id);
    res.json({ ok: true });
  });

  app.get('/api/admin/overview', requireAdmin, (_req, res) => {
    const users = db.prepare(`
      SELECT u.id, u.username, u.display_name, u.role, u.created_at,
        (SELECT COUNT(*) FROM entries e WHERE e.user_id = u.id) AS entry_count
      FROM users u
      ORDER BY u.created_at ASC
    `).all().map((row) => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      role: row.role,
      createdAt: row.created_at,
      entryCount: row.entry_count,
    }));
    const counts = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM entries) AS entries,
        (SELECT COUNT(*) FROM media) AS media
    `).get();
    res.json({ users, counts });
  });

  app.patch('/api/admin/users/:id', requireAdmin, (req, res) => {
    const role = req.body?.role;
    if (role !== 'user' && role !== 'admin') {
      return res.status(400).json({ error: '역할은 주민 또는 이장입니다.' });
    }
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!target) return res.status(404).json({ error: '주민을 찾을 수 없습니다.' });
    if (target.id === req.user.id) {
      return res.status(400).json({ error: '자기 역할은 바꿀 수 없습니다.' });
    }
    if (target.role === 'admin' && role === 'user') {
      const admins = db.prepare(`SELECT COUNT(*) AS c FROM users WHERE role = 'admin'`).get().c;
      if (admins <= 1) return res.status(400).json({ error: '마지막 이장은 주민으로 바꿀 수 없습니다.' });
    }
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, target.id);
    const updated = db.prepare('SELECT id, username, display_name, role, created_at FROM users WHERE id = ?').get(target.id);
    res.json({ user: publicUser(updated) });
  });

  app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!target) return res.status(404).json({ error: '주민을 찾을 수 없습니다.' });
    if (target.id === req.user.id) return res.status(400).json({ error: '자기 계정은 지울 수 없습니다.' });
    if (target.role === 'admin') {
      const admins = db.prepare(`SELECT COUNT(*) AS c FROM users WHERE role = 'admin'`).get().c;
      if (admins <= 1) return res.status(400).json({ error: '마지막 이장은 지울 수 없습니다.' });
    }
    const entries = db.prepare('SELECT id FROM entries WHERE user_id = ?').all(target.id);
    for (const entry of entries) deleteEntryFiles(db, uploadDir, entry.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(target.id);
    res.json({ ok: true });
  });

  app.use((error, _req, res, _next) => {
    if (error?.status === 404) return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? '파일은 40MB 이하만 올릴 수 있습니다.'
        : '파일 업로드에 실패했습니다.';
      return res.status(400).json({ error: message });
    }
    if (error?.message && /사진|영상/.test(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: '서버에서 문제가 생겼습니다.' });
  });

  if (process.env.NODE_ENV === 'production') {
    const dist = path.join(__dirname, '../dist');
    app.use(express.static(dist));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
      res.sendFile(path.join(dist, 'index.html'), (err) => err && next());
    });
  }

  return { app, db, uploadDir, dataDir };
}

function seed(db, uploadDir) {
  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (count > 0) return;

  const seedDir = path.join(__dirname, 'seed-media');
  const mayor = insertUser(db, 'mayor', '하람 이장', 'orchard-gate', 'admin');
  const sprout = insertUser(db, 'sprout', '초롬', 'dew-drop', 'user');
  const dalgong = insertUser(db, 'dalgong', '달콩', 'sweet-bean', 'user');

  const stories = [
    {
      userId: sprout.id,
      title: '언덕 아래 밭에 물을 댔습니다',
      body: '아침 안개가 걷히기 전에 고랑을 적셨습니다. 새싹이 흙을 밀고 나오는 소리가 날 것 같았습니다. 오후에 다시 보니 잎이 반짝였습니다.',
      category: '작물',
      season: '봄',
      files: [
        ['seed-field.png', 'field.png', 'image/png', 'image', '언덕밭.png'],
        ['seed-morning.mp4', 'morning.mp4', 'video/mp4', 'video', '아침들판.mp4'],
      ],
    },
    {
      userId: mayor.id,
      title: '정자 옆 호박이 주황빛을 냈습니다',
      body: '마을 정자 울타리 너머로 호박 세 통이 자리를 잡았습니다. 너무 익기 전에 나눠 먹자고 게시판에 적어 둡니다.',
      category: '작물',
      season: '가을',
      files: [['seed-pumpkin.png', 'pumpkin.png', 'image/png', 'image', '호박.png']],
    },
    {
      userId: dalgong.id,
      title: '소나기가 지나간 뒤의 풀냄새',
      body: '점심 무렵 소나기가 밭고랑을 두드렸습니다. 그친 뒤 처마 끝에 물방울이 남아 있었습니다. 우산은 창고 문고리에 걸어 두었습니다.',
      category: '날씨',
      season: '여름',
      files: [['seed-rain.png', 'rain.png', 'image/png', 'image', '소나기.png']],
    },
    {
      userId: dalgong.id,
      title: '호박으로 끓인 저녁 수프',
      body: '잘 익은 호박을 얇게 썰어 우유와 함께 끓였습니다. 소금은 조금, 허브는 창가 화분에서 두 잎. 이웃과 그릇을 나눠 담았습니다.',
      category: '요리',
      season: '가을',
      files: [['seed-kitchen.png', 'kitchen.png', 'image/png', 'image', '수프.png']],
    },
  ];

  for (const story of stories) {
    const created = new Date().toISOString();
    const id = crypto.randomUUID();
    db.prepare(
      'INSERT INTO entries (id, user_id, title, body, category, season, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, story.userId, story.title, story.body, story.category, story.season, created, created);
    for (const [filename, source, mime, kind, original] of story.files) {
      fs.copyFileSync(path.join(seedDir, source), path.join(uploadDir, filename));
      db.prepare(
        'INSERT INTO media (id, entry_id, filename, original_name, mime, kind, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(crypto.randomUUID(), id, filename, original, mime, kind, created);
    }
  }
}

function insertUser(db, username, displayName, password, role) {
  const user = {
    id: crypto.randomUUID(),
    username,
    display_name: displayName,
    password_hash: bcrypt.hashSync(password, 10),
    role,
    created_at: new Date().toISOString(),
  };
  db.prepare(
    'INSERT INTO users (id, username, display_name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(user.id, user.username, user.display_name, user.password_hash, user.role, user.created_at);
  return user;
}

function readEntryFields(body = {}) {
  const title = String(body.title || '').trim();
  const text = String(body.body || '').trim();
  const category = String(body.category || '').trim();
  const season = String(body.season || '').trim();
  if (title.length < 1 || title.length > 80) return { error: '제목은 1~80자입니다.' };
  if (text.length < 1 || text.length > 4000) return { error: '내용은 1~4000자입니다.' };
  if (!CATEGORIES.includes(category)) return { error: '분류를 골라 주세요.' };
  if (!SEASONS.includes(season)) return { error: '계절을 골라 주세요.' };
  return { title, body: text, category, season };
}

function parseRemoveIds(value) {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : String(value).split(',');
  return raw.map((item) => String(item).trim()).filter(Boolean);
}

function insertMedia(db, entryId, files, now) {
  const stmt = db.prepare(
    'INSERT INTO media (id, entry_id, filename, original_name, mime, kind, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  for (const file of files) {
    const meta = MIME[file.mimetype];
    stmt.run(crypto.randomUUID(), entryId, file.filename, file.originalname.slice(0, 120), file.mimetype, meta.kind, now);
  }
}

function cleanupFiles(files = []) {
  for (const file of files) {
    if (file?.path) fs.rmSync(file.path, { force: true });
  }
}

function deleteEntryFiles(db, uploadDir, entryId) {
  const files = db.prepare('SELECT filename FROM media WHERE entry_id = ?').all(entryId);
  db.prepare('DELETE FROM entries WHERE id = ?').run(entryId);
  for (const file of files) fs.rmSync(path.join(uploadDir, file.filename), { force: true });
}

function listEntries(db, query = {}) {
  const where = [];
  const params = [];
  if (query.category && CATEGORIES.includes(query.category)) {
    where.push('e.category = ?');
    params.push(query.category);
  }
  if (query.season && SEASONS.includes(query.season)) {
    where.push('e.season = ?');
    params.push(query.season);
  }
  const q = String(query.q || '').trim().slice(0, 40);
  if (q) {
    const like = `%${q.replace(/[%_]/g, '')}%`;
    where.push('(e.title LIKE ? OR e.body LIKE ? OR u.display_name LIKE ?)');
    params.push(like, like, like);
  }
  const sql = `
    SELECT e.id FROM entries e
    JOIN users u ON u.id = e.user_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY e.created_at DESC
  `;
  return db.prepare(sql).all(...params).map((row) => getEntry(db, row.id));
}

function getEntry(db, id) {
  const row = db.prepare(`
    SELECT e.*, u.username, u.display_name
    FROM entries e
    JOIN users u ON u.id = e.user_id
    WHERE e.id = ?
  `).get(id);
  if (!row) return null;
  const media = db.prepare(
    'SELECT id, filename, original_name, mime, kind, created_at FROM media WHERE entry_id = ? ORDER BY created_at ASC'
  ).all(id).map((item) => ({
    id: item.id,
    url: `/uploads/${item.filename}`,
    filename: item.filename,
    originalName: item.original_name,
    mime: item.mime,
    kind: item.kind,
    createdAt: item.created_at,
  }));
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    category: row.category,
    season: row.season,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: {
      id: row.user_id,
      username: row.username,
      displayName: row.display_name,
    },
    media,
  };
}
