const { z } = require('zod');
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'invalid id');
const email = z.string().trim().toLowerCase().email().max(120);
const password = z.string().min(8, 'at least 8 characters').max(72).regex(/[A-Za-z]/, 'must contain a letter').regex(/\d/, 'must contain a number');
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD').refine((s) => !Number.isNaN(Date.parse(s + 'T00:00:00Z')), 'invalid date');
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'use HH:MM');
const phone = z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, 'invalid phone number');
module.exports = { z, objectId, email, password, dateStr, hhmm, phone };
