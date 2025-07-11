// routes/auth.js
const express = require('express');
const router = express.Router();

const users = []; // temporary user storage, for example purpose only

router.post('/login', (req, res) => {
  const { phone, username } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, message: 'Phone number required' });
  }

  // Check if user exists
  let user = users.find(u => u.phone === phone);

  if (!user) {
    // create new user
    user = { phone, username, walletBalance: 0, transactions: [] };
    users.push(user);
  }

  res.json({
    success: true,
    walletBalance: user.walletBalance,
    username: user.username,
    phone: user.phone,
  });
});

module.exports = router;

