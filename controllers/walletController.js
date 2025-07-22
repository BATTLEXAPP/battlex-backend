// controllers/walletController.js

const Transaction = require('../models/transaction');
const User = require('../models/user');

// ✅ Add money to wallet
exports.addMoney = async (req, res) => {
  try {
    const { userId, amount } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.walletBalance += amount;
    await user.save();

    await Transaction.create({
      user: userId,
      type: 'add',
      amount,
      reason: 'Money added to wallet'
    });

    res.json({ message: 'Money added successfully', wallet: user.walletBalance });
  } catch (err) {
    console.error("❌ Error in addMoney:", err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ Withdraw money from wallet
exports.withdrawMoney = async (req, res) => {
  try {
    const { userId, amount } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.walletBalance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    user.walletBalance -= amount;
    await user.save();

    await Transaction.create({
      user: userId,
      type: 'withdraw',
      amount,
      reason: 'Money withdrawn from wallet'
    });

    res.json({ message: 'Money withdrawn successfully', wallet: user.walletBalance });
  } catch (err) {
    console.error("❌ Error in withdrawMoney:", err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ Get transaction history
exports.getHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const history = await Transaction.find({ user: userId }).sort({ createdAt: -1 });
    res.json({ history });
  } catch (err) {
    console.error("❌ Error fetching transaction history:", err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
