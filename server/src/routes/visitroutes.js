const r = require('express').Router();
const { wrap, auth } = require('../middleware/auth');
const c = require('../controllers/visitcontroller');
r.get('/pass/:code', wrap(c.pass));                 // public (visitor)
r.post('/visits', auth, wrap(c.create));
r.get('/visits', auth, wrap(c.mine));
r.patch('/visits/:id', auth, wrap(c.update));
module.exports = r;