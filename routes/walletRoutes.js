// routes/walletRoutes.js

const express = require('express');
const router = express.Router();
const User = require('../models/user');

// ✅ Add money to wallet
router.post('/add', async (req, res) => {
  const { phone, amount } = req.body;
  const user = await User.findOne({ phone });
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.walletBalance += amount;
  user.transactions.push({ type: 'add', amount, timestamp: new Date() });

  await user.save();
  res.json({ success: true, walletBalance: user.walletBalance, transactions: user.transactions });
});

// ✅ Withdraw from wallet
router.post('/withdraw', async (req, res) => {
  const { phone, amount } = req.body;
  const user = await User.findOne({ phone });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.walletBalance < amount) return res.status(400).json({ error: 'Insufficient balance' });

  user.walletBalance -= amount;
  user.transactions.push({ type: 'withdraw', amount, timestamp: new Date() });

  await user.save();
  res.json({ success: true, walletBalance: user.walletBalance, transactions: user.transactions });
});

// ✅ Get wallet transaction history
router.get('/transactions/:phone', async (req, res) => {
  const { phone } = req.params;
  const user = await User.findOne({ phone });

  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({
    walletBalance: user.walletBalance,
    transactions: user.transactions,
  });
});

// ✅ GET wallet balance (used in Flutter Home Screen)
router.get('/:phone', async (req, res) => {
  const { phone } = req.params;

  try {
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      walletBalance: user.walletBalance || 0,
    });

  } catch (err) {
    console.error('❌ Wallet balance error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
