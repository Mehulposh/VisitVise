const env = require('../config/env');
const { AppError } = require('../utils/helpers');
const notFound = (req, res, next) => next(new AppError(`Route not found: ${req.method} ${req.path}`, 404));
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || 500, msg = err.message;
  if (err.name === 'ValidationError') { status = 400; msg = Object.values(err.errors).map((e) => e.message).join('; '); }
  else if (err.name === 'CastError') { status = 400; msg = 'Invalid id or value'; }
  else if (err.code === 11000) { status = 409; msg = 'A record with this value already exists'; }
  else if (err.name === 'MulterError') { status = 400; msg = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : err.message; }
  else if (err.type === 'entity.parse.failed') { status = 400; msg = 'Malformed JSON body'; }
  else if (err.type === 'entity.too.large') { status = 413; msg = 'Request body too large'; }
  if (status >= 500) { console.error(err); if (env.isProd) msg = 'Something went wrong'; }
  res.status(status).send({ error: msg, message: msg, code: err.code }); // `error` is the key the existing client reads
};
module.exports = { notFound, errorHandler };
