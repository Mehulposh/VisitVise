const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const env = require('../config/env');
const { AppError } = require('../utils/helpers');

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const SIG = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.subarray(0, 4).toString('hex') === '89504e47',
  'image/webp': (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP',
};
// Random server-side names, per-bucket folders, strict type/size limits (never the client's file name)
const make = (bucket, field) => multer({
  storage: multer.diskStorage({
    destination: (req, f, cb) => { const d = path.join(env.uploadDir, bucket); fs.mkdirSync(d, { recursive: true }); cb(null, d); },
    filename: (req, f, cb) => cb(null, crypto.randomUUID() + EXT[f.mimetype]),
  }),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter: (req, f, cb) => (EXT[f.mimetype] ? cb(null, true) : cb(new AppError('Only JPG, PNG or WebP images are accepted', 400))),
}).single(field);

// magic-byte check so a renamed script cannot pass as an image; deletes the file when it fails
const verifyFile = async (req, res, next) => {
  const f = req.file; if (!f) return next();
  const fh = await fs.promises.open(f.path, 'r'); const buf = Buffer.alloc(12); await fh.read(buf, 0, 12, 0); await fh.close();
  if (!SIG[f.mimetype]?.(buf)) { await fs.promises.unlink(f.path).catch(() => {}); return next(new AppError('File content does not match its type', 400)); }
  next();
};
const removeFile = (bucket, name) => (name && /^[a-f0-9-]{36}\.\w+$/.test(name) ? fs.promises.unlink(path.join(env.uploadDir, bucket, name)).catch(() => {}) : Promise.resolve());
module.exports = { photoUpload: make('photos', 'photo'), idUpload: make('ids', 'document'), verifyFile, removeFile };
