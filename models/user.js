// models/user.js

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true },
  password: { type: String, required: true, select: false }, // 🔒 Secure default
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phoneNumber: { type: String, required: true, unique: true, trim: true },

  walletBalance: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },

  // 🔁 Optional — Only keep if not using separate OTP model
  // otp: { type: String },
  // otpExpiry: { type: Date },

  // 🔁 Optional — Only keep if you want fast access to a few past txns
  transactions: [
    {
      type: {
        type: String,
        enum: ['add', 'withdraw', 'join', 'prize'], // Customize as needed
        required: true,
      },
      amount: { type: Number, required: true },
      timestamp: { type: Date, default: Date.now }
    }
  ]

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
