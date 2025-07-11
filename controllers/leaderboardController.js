const User = require('../models/user');

exports.getTopPlayers = async (req, res) => {
  try {
    const topPlayers = await User.find()
      .sort({ totalWinnings: -1 })
      .limit(10)
      .select('username phone walletBalance totalWinnings');

    res.json({ topPlayers });
  } catch (err) {
    console.error("❌ Error fetching leaderboard:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
