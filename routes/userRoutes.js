const express = require('express');
const router = express.Router();
const User = require('../models/user');
const sendMail = require('../mail'); // mail.js used here
require('dotenv').config();

// Signup Route
router.post('/signup', async (req, res) => {
  try {
    const { username, password, email, phoneNumber } = req.body;

    if (!username || !password || !email || !phoneNumber) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const userExists = await User.findOne({ $or: [{ email }, { phoneNumber }] });
    if (userExists) {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const newUser = new User({
      username,
      password,
      email,
      phoneNumber,
      otp,
      isVerified: false
    });

    await newUser.save();

    await sendMail({
      to: email,
      subject: '🔐 BattleX OTP Verification',
      text: `Hello ${username},\n\nYour OTP is: ${otp}\n\nDo not share this with anyone.`,
    });

    res.status(200).json({ success: true, message: 'Signup successful. OTP sent to email.' });

  } catch (err) {
    console.error('❌ Signup Error:', err.message);
    res.status(500).json({ success: false, message: 'Signup failed' });
  }
});

// ✅ OTP Verification Route
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP are required' });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'User already verified' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    user.isVerified = true;
    user.otp = null;
    await user.save();

    res.status(200).json({ success: true, message: 'OTP verified successfully' });

  } catch (err) {
    console.error('❌ OTP Verify Error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ✅ Resend OTP Route
router.post('/resend-otp', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'User already verified' });
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = newOtp;
    await user.save();

    await sendMail({
      to: email,
      subject: '📩 BattleX OTP Resend',
      text: `Your new OTP is: ${newOtp}`,
    });

    res.status(200).json({ success: true, message: 'New OTP sent to email' });

  } catch (err) {
    console.error('❌ Resend OTP Error:', err.message);
    res.status(500).json({ success: false, message: 'Resend failed' });
  }
});

module.exports = router;
