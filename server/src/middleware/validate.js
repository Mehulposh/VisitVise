const { AppError } = require('../utils/helpers');
// Validates and strips unknown keys (so a client can never smuggle in {"role":"admin"}).
// Express 5: req.query is read-only, so validated query values are placed on req.validQuery.
const validate = (schema, src = 'body') => (req, res, next) => {
  const r = schema.safeParse(req[src] || {});
  if (!r.success) return next(new AppError(r.error.issues.map((i) => `${i.path.join('.') || src}: ${i.message}`).join('; '), 400));
  if (src === 'query') req.validQuery = r.data; else req[src] = r.data;
  next();
};
module.exports = { validate };
