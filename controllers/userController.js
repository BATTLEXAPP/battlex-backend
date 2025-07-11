const User = require('../models/user');
const Transaction = require('../models/transaction');

// User login or registration
exports.login = async (req, res) => {
  try {
    const { phoneNumber, username } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Phone number required' });
    }

    let user = await User.findOne({ phoneNumber });

    if (!user) {
      user = new User({
        phoneNumber,
        username: username || 'New Player',
        walletBalance: 0,
      });
      await user.save();
    } else if (username && username !== user.username) {
      user.username = username;
      await user.save();
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get wallet balance by phone number
exports.getWalletBalance = async (req, res) => {
  try {
    const phone = req.params.phone;
    const user = await User.findOne({ phoneNumber: phone });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, walletBalance: user.walletBalance });
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Add money to wallet
exports.addMoney = async (req, res) => {
  try {
    const { phoneNumber, amount } = req.body;

    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be positive' });
    }

    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.walletBalance += amount;
    await user.save();

    // Log transaction
    const transaction = new Transaction({
      user: user._id,
      type: 'credit',
      amount,
      reason: 'Money added to wallet',
    });
    await transaction.save();

    res.json({ success: true, walletBalance: user.walletBalance });
  } catch (error) {
    console.error('Error adding money:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Withdraw money from wallet
exports.withdrawMoney = async (req, res) => {
  try {
    const { phoneNumber, amount } = req.body;

    if (amount < 50) {
      return res.status(400).json({ success: false, message: 'Minimum withdrawal amount is ₹50' });
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

    // Log transaction
    const transaction = new Transaction({
      user: user._id,
      type: 'debit',
      amount,
      reason: 'Money withdrawn from wallet',
    });
    await transaction.save();

    res.json({ success: true, walletBalance: user.walletBalance });
  } catch (error) {
    console.error('Error withdrawing money:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get transaction history for user
exports.getTransactions = async (req, res) => {
  try {
    const phone = req.params.phone;
    const user = await User.findOne({ phoneNumber: phone });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const transactions = await Transaction.find({ user: user._id }).sort({ date: -1 });

    res.json({ success: true, transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
