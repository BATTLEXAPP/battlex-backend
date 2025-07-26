const bcrypt = require('bcrypt');
const User = require('../models/user');
const Transaction = require('../models/transaction');
const sendMail = require('../mail');

exports.login = async (req, res) => {
  try {
    const phoneNumber = req.body.phoneNumber?.trim();
    const username = req.body.username?.trim();

    if (!phoneNumber || !username) {
      return res.status(400).json({ success: false, message: 'Phone number and username are required' });
    }

    const user = await User.findOne({ phoneNumber, username });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ success: false, message: 'Please verify your account via OTP' });
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        phoneNumber: user.phoneNumber,
        username: user.username,
        walletBalance: user.walletBalance || 0,
      },
    });

  } catch (error) {
    console.error('❌ Login Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.signup = async (req, res) => {
  try {
    const { phoneNumber, username, email, password } = req.body;

    if (!phoneNumber || !username || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ $or: [{ phoneNumber }, { email }] });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const newUser = new User({
      phoneNumber,
      username,
      email,
      password, // Will be hashed after OTP verified
      otp: otpCode,
      otpExpiry,
      isVerified: false,
    });

    await newUser.save();

    await sendMail({
      to: email,
      subject: 'BattleX Verification Code',
      text: `Your OTP is: ${otpCode}\n\nIt will expire in 10 minutes.`,
    });

    return res.status(200).json({ success: true, message: 'OTP sent to email' });

  } catch (error) {
    console.error('❌ Signup Error:', error);
    return res.status(500).json({ success: false, message: 'Signup failed' });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { phoneNumber, email, code, username, password } = req.body;

    const user = await User.findOne({ phoneNumber, email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'User already verified' });
    }

    if (String(user.otp) !== String(code)) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (Date.now() > new Date(user.otpExpiry).getTime()) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.username = username;
    user.password = hashedPassword;
    user.walletBalance = 0;
    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'OTP verified and user created',
      user: {
        phoneNumber: user.phoneNumber,
        username: user.username,
        email: user.email,
      },
    });

  } catch (error) {
    console.error('❌ OTP Verification Error:', error);
    return res.status(500).json({ success: false, message: 'OTP verification failed' });
  }
};


// ----------------------- GET WALLET BALANCE -----------------------
exports.getWalletBalance = async (req, res) => {
  try {
    const phoneNumber = req.params.phone;
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      walletBalance: user.walletBalance,
    });

  } catch (error) {
    console.error('❌ Wallet Balance Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ----------------------- ADD MONEY -----------------------
exports.addMoney = async (req, res) => {
  try {
    const { phoneNumber, amount } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }

    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.walletBalance += amount;
    await user.save();

    await Transaction.create({
      user: user._id,
      type: 'credit',
      amount,
      reason: 'Money added to wallet',
    });

    return res.status(200).json({
      success: true,
      walletBalance: user.walletBalance,
    });

  } catch (error) {
    console.error('❌ Add Money Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ----------------------- WITHDRAW MONEY -----------------------
exports.withdrawMoney = async (req, res) => {
  try {
    const { phoneNumber, amount } = req.body;

    if (!amount || isNaN(amount) || amount < 50) {
      return res.status(400).json({ success: false, message: 'Minimum withdrawal is ₹50' });
    }

    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.walletBalance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    user.walletBalance -= amount;
    await user.save();

    await Transaction.create({
      user: user._id,
      type: 'debit',
      amount,
      reason: 'Money withdrawn from wallet',
    });

    return res.status(200).json({
      success: true,
      walletBalance: user.walletBalance,
    });

  } catch (error) {
    console.error('❌ Withdraw Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ----------------------- GET TRANSACTION HISTORY -----------------------
exports.getTransactions = async (req, res) => {
  try {
    const phoneNumber = req.params.phone;
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const transactions = await Transaction.find({ user: user._id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      transactions,
    });

  } catch (error) {
    console.error('❌ Transaction Fetch Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
