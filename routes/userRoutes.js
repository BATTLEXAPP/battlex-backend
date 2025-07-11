const express = require('express');
const router = express.Router(); // ✅ CORRECT WAY
const userController = require('../controllers/userController');

// User login or register
router.post('/login', userController.login);

// Get wallet balance by phone number
router.get('/wallet/:phone', userController.getWalletBalance);

// Add money to wallet
router.post('/wallet/add', userController.addMoney);

// Withdraw money from wallet
router.post('/wallet/withdraw', userController.withdrawMoney);

// Get user's transaction history
router.get('/transactions/:phone', userController.getTransactions);

module.exports = router;
