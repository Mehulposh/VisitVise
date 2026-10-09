require('dotenv').config();
const path = require('path');
const express = require('express');
const connectDB = require('./config/db');
const User = require('./models/User');
const AdminRoutes = require('./routes/adminroutes')
const VisitRoutes = require('./routes/visitroutes')
const AuthRoutes = require('./routes/authroutes')
if (!process.env.JWT_SECRET) { console.error('Set JWT_SECRET in .env'); process.exit(1); }
const app = express();
app.use(express.json({ limit: '100kb' }));

app.use('/api', AuthRoutes);
app.use('/api', VisitRoutes);
app.use('/api', AdminRoutes);


app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

const dist = path.join(__dirname, 'client', 'dist');

app.use(express.static(dist));
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(dist, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.name === 'ValidationError' ? 400 : 500).json({ error: err.name === 'ValidationError' ? err.message : 'Server error' });
});

(async () => {
  await connectDB();
  const email = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  if (!(await User.exists({ role: 'admin' })))
    await User.create({ name: 'Admin', email, password: process.env.ADMIN_PASSWORD || 'Admin@123', role: 'admin' });
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Visitor Management at http://localhost:${port}`));
})().catch(e => { console.error('Startup failed:', e.message); process.exit(1); });