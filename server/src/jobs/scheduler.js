const { sweep } = require('../services/lifecycle');
let running = false;
async function tick() {
  if (running) return; running = true;
  try { const r = await sweep(); if (Object.values(r).some(Boolean)) console.log('[lifecycle]', JSON.stringify(r)); }
  catch (e) { console.error('[lifecycle] failed:', e.message); } finally { running = false; }
}
// Single-instance scheduler. With several server instances run this from ONE of them (or from cron: node -e "require('./src/services/lifecycle').sweep()").
const start = () => { setTimeout(tick, 20e3).unref(); setInterval(tick, 5 * 60e3).unref(); };
module.exports = { start, tick };
