router.post('/wallet/add', async (req, res) => {
  const { phone, amount } = req.body;
  const user = await User.findOne({ phone });
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.walletBalance += amount;
  user.transactions.push({ type: 'add', amount, timestamp: new Date() });

  await user.save();
  res.json({ success: true, walletBalance: user.walletBalance, transactions: user.transactions });
});

router.post('/wallet/withdraw', async (req, res) => {
  const { phone, amount } = req.body;
  const user = await User.findOne({ phone });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.walletBalance < amount) return res.status(400).json({ error: 'Insufficient balance' });

  user.walletBalance -= amount;
  user.transactions.push({ type: 'withdraw', amount, timestamp: new Date() });

  await user.save();
  res.json({ success: true, walletBalance: user.walletBalance, transactions: user.transactions });
});
