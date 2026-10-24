// In-process event hub feeding Server-Sent Events (/api/events). For several server instances swap this for Redis pub/sub.
const { EventEmitter } = require('events');
const hub = new EventEmitter(); hub.setMaxListeners(0);
const publish = (evt) => hub.emit('evt', { ...evt, at: new Date().toISOString() });
const subscribe = (fn) => { hub.on('evt', fn); return () => hub.off('evt', fn); };
module.exports = { publish, subscribe };
