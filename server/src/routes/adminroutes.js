const r = require('express').Router();
const { wrap, auth, adminOnly } = require('../middleware/auth');
const c = require('../controllers/admincontroller');
r.get('/admin/data', auth, adminOnly, wrap(c.data));
r.post('/scan', auth, adminOnly, wrap(c.scan));
module.exports = r;