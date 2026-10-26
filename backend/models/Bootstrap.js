const mongoose = require('mongoose');

const bootstrapSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

module.exports = mongoose.model('Bootstrap', bootstrapSchema);
