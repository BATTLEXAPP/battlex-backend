const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

const User = require('../models/user');
const sendMail = require('../mail');
const UserController = require('../controllers/userController'); // ✅ Login handled in controller

// -------------------- SIGNUP --------------------
router.post('/signup', async (req, res) => {
  try {
    const { username, password, email, phoneNumber } = req.body;

    if (!username || !password || !email || !phoneNumber) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { phoneNumber }] });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    const newUser = new User({
      username,
      email,
      phoneNumber,
      password: hashedPassword,
      otp,
      otpExpiry,
      isVerified: false
    });

    await newUser.save();

    await sendMail({
      to: email,
      subject: '🔐 BattleX OTP Verification',
      text: `Hello ${username},\n\nYour OTP is: ${otp}\n\nIt will expire in 10 minutes.\n\nDo not share this with anyone.`,
    });

    res.status(200).json({ success: true, message: 'OTP sent to email' });

  } catch (err) {
    console.error('❌ Signup Error:', err);
    res.status(500).json({ success: false, message: 'Signup failed' });
  }
});

// -------------------- VERIFY OTP --------------------
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

    if (String(user.otp) !== String(otp) || Date.now() > user.otpExpiry) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    res.status(200).json({ success: true, message: 'OTP verified successfully' });
  } catch (err) {
    console.error('❌ OTP Verify Error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// -------------------- RESEND OTP --------------------
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
    user.otpExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendMail({
      to: email,
      subject: '🔁 BattleX OTP Resend',
      text: `Hello ${user.username},\n\nYour new OTP is: ${newOtp}\n\nIt will expire in 10 minutes.`,
    });

    res.status(200).json({ success: true, message: 'New OTP sent to email.' });
  } catch (err) {
    console.error('❌ Resend OTP Error:', err.message);
    res.status(500).json({ success: false, message: 'Resend failed' });
  }
});

// -------------------- LOGIN --------------------
router.post('/login', UserController.login); // ✅ Controller-based login

module.exports = router;
