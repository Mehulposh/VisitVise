const { Schema, model } = require('mongoose');
const visitSchema = new Schema({
  hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  hostName: String,
  hostEmail: String,
  visitorName: { type: String, required: true, trim: true },
  company: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  purpose: { type: String, default: 'Meeting' },
  date: { type: String, required: true, index: true },   // YYYY-MM-DD
  from: { type: String, required: true },                // HH:MM
  to: { type: String, required: true },
  areas: [String],
  code: { type: String, unique: true, required: true },
  status: { type: String, enum: ['expected', 'checked_in', 'checked_out', 'cancelled'], default: 'expected' },
  checkIn: Date,
  scans: [{ at: Date, area: String, ok: Boolean, reason: String }]
}, { timestamps: { createdAt: 'created', updatedAt: false } });
visitSchema.set('toJSON', { transform: (d, r) => { r.id = String(r._id); r.hostId = String(r.hostId); delete r._id; delete r.__v; delete r.hostEmail; return r; } });
module.exports = model('Visit', visitSchema);