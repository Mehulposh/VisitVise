// Usage: npm run create-admin -- "Full Name" admin@example.com 'StrongPass123'
const mongoose = require('mongoose');
const env = require('../src/config/env');
const { User } = require('../src/models');
const { ensureDefaults } = require('../src/services/visits');
const { email, password } = require('../src/utils/schemas');
(async () => {
  const [name, em, pw] = process.argv.slice(2);
  if (!name || !em || !pw) { console.error('Usage: npm run create-admin -- "Name" email password'); process.exit(1); }
  const bad = [email.safeParse(em), password.safeParse(pw)].filter((r) => !r.success);
  if (bad.length) { console.error('Invalid input:', bad.flatMap((b) => b.error.issues.map((i) => i.message)).join(', ')); process.exit(1); }
  await mongoose.connect(env.mongoUri);
  if (await User.exists({ email: em.toLowerCase() })) { console.error('A user with this email already exists'); process.exit(1); }
  const site = await ensureDefaults();
  await User.create({ name, email: em, password: pw, role: 'admin', siteId: site._id, emailVerified: true });
  console.log('Admin created:', em);
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
