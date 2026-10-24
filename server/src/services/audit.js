const { Audit } = require('../models');
/** Who did what: every admin change is recorded here (never throws). */
const record = (actor, action, target, meta) => Audit.create({ actor: actor?._id, actorName: actor?.name, action, target: target ? String(target) : undefined, meta }).catch((e) => console.error('audit failed:', e.message));
module.exports = { record };
