const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true
  },
  walletBalance: {
    type: Number,
    default: 0
  },
  transactions: [
    {
      type: {
        type: String, // e.g., 'add', 'withdraw', 'entry_fee'
        required: true
      },
      amount: {
        type: Number,
        required: true
      },
      date: {
        type: Date,
        default: Date.now
      },
      description: {
        type: String
      }
    }
  ]
});

// ✅ Safe export to prevent OverwriteModelError
module.exports = mongoose.models.User || mongoose.model('User', userSchema);
