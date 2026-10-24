const env = require('./config/env');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { User } = require('./models');
const { sanitize, globalLimiter } = require('./middleware/security');
const { notFound, errorHandler } = require('./middleware/error');
const { AppError } = require('./utils/helpers');
const { passwordOk } = require('./utils/pure');
const { ensureDefaults } = require('./services/visits');

const app = express();
app.disable('x-powered-by');
if (env.trustProxy) app.set('trust proxy', env.trustProxy);
app.use(helmet());
app.use(cors({
  origin: (origin, cb) => (!origin || env.origins.includes(origin) ? cb(null, true) : cb(new AppError('Origin not allowed', 403))),
  credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'x-kiosk-key'],
}));
app.use(globalLimiter);
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(sanitize);

app.get('/api/health', (req, res) => res.send({ status: 'ok', db: mongoose.connection.readyState === 1 }));

const routeFiles = [
  './routes/authRoutes',
  './routes/visitRoutes',
  './routes/passRoutes',
  './routes/walkinRoutes',
  './routes/gateRoutes',
  './routes/fileRoutes',
  './routes/notificationRoutes',
  './routes/eventsRoutes',
  './routes/adminRoutes',
];

for (const routeFile of routeFiles) {
  app.use('/api', require(routeFile));
}

app.use('/api', notFound);

// Production: serve the built React app. (The old code looked in server/src/client/dist, which does not exist.)
if (fs.existsSync(path.join(env.clientDist, 'index.html'))) {
  app.use(express.static(env.clientDist));
  app.get('/{*splat}', (req, res) => res.sendFile(path.join(env.clientDist, 'index.html')));
} else console.log(`No built client found at ${env.clientDist} (fine in development).`);
app.use(errorHandler);

/** No default credentials: the first admin comes from ADMIN_EMAIL / ADMIN_PASSWORD (strong) or `npm run create-admin`. */
async function seedAdmin() {
  if (await User.exists({ role: 'admin' })) return;
  if (env.adminEmail && passwordOk(env.adminPassword) && env.adminPassword !== 'Admin@123') {
    const site = await ensureDefaults();
    await User.create({ name: 'Administrator', email: env.adminEmail, password: env.adminPassword, role: 'admin', siteId: site._id, emailVerified: true });
    console.log(`First admin created: ${env.adminEmail}. Remove ADMIN_PASSWORD from .env now.`);
  } else console.warn('WARNING: no admin account exists. Set ADMIN_EMAIL and a strong ADMIN_PASSWORD, or run: npm run create-admin');
}

connectDB().then(async () => {
  await ensureDefaults(); await seedAdmin();
  const server = app.listen(env.port, () => console.log(`VisitVise API on :${env.port} (site timezone ${env.timezone})`));
  require('./jobs/scheduler').start();
  const stop = () => server.close(() => mongoose.connection.close().then(() => process.exit(0)));
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
}).catch((e) => { console.error('Startup failed:', e.message); process.exit(1); });
process.on('unhandledRejection', (e) => console.error('Unhandled rejection:', e));
module.exports = app;
