// models/transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['add', 'withdraw', 'entry_fee'], required: true },
  amount: { type: Number, required: true },
  description: { type: String },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
