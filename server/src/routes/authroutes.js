const r = require('express').Router();
const { wrap, auth } = require('../middleware/auth');
const c = require('../controllers/authcontroller');
r.post('/register', wrap(c.register));
r.post('/login', wrap(c.login));
r.get('/me', auth, c.me);
module.exports = r;