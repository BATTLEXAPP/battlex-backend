const Result = require('../models/result');
const Tournament = require('../models/tournament');
const User = require('../models/user');
const Transaction = require('../models/transaction');

// ✅ 1. Submit Match Result (Prevent Duplicates)
exports.submitResult = async (req, res) => {
  try {
    const { userId, tournamentId, kills, rank, screenshotUrl } = req.body;

    // Check for duplicate submission
    const existing = await Result.findOne({ userId, tournamentId });
    if (existing) {
      return res.status(400).json({ message: "Result already submitted for this tournament" });
    }

    const result = new Result({
      userId,
      tournamentId,
      kills,
      rank,
      screenshotUrl
    });

    await result.save();

    res.status(201).json({ message: 'Result submitted successfully', result });
  } catch (err) {
    console.error('❌ Error submitting result:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ 2. Admin Verifies Result (Approve/Reject)
exports.verifyResult = async (req, res) => {
  try {
    const { resultId } = req.params;
    const { status } = req.body;

    const result = await Result.findById(resultId);
    if (!result) return res.status(404).json({ error: 'Result not found' });

    if (status === 'approved') {
      const tournament = await Tournament.findById(result.tournamentId);
      const user = await User.findById(result.userId);

      if (!tournament || !user) {
        return res.status(404).json({ error: 'User or Tournament not found' });
      }

      // Add prize to user wallet
      user.walletBalance += tournament.prize;
      await user.save();

      // Save transaction
      await Transaction.create({
        user: user._id,
        type: 'add',
        amount: tournament.prize,
        reason: `Prize for ${tournament.name}`
      });
    }

    result.status = status;
    await result.save();

    res.json({ message: `Result ${status} successfully`, result });
  } catch (err) {
    console.error('❌ Error verifying result:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ 3. Get All Match Results
exports.getAllResults = async (req, res) => {
  try {
    const results = await Result.find()
      .populate('userId', 'username phoneNumber')
      .populate('tournamentId', 'name date');

    res.json({ results });
  } catch (err) {
    console.error("❌ Error fetching results:", err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ 4. Get Match History of a Player
exports.getUserHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const results = await Result.find({ userId })
      .populate('tournamentId', 'name date prize')
      .sort({ submittedAt: -1 });

    res.json({ results });
  } catch (err) {
    console.error('❌ Error fetching user match history:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
// ✅ Get Leaderboard based on kills and prize
exports.getLeaderboard = async (req, res) => {
  try {
    const topByKills = await Result.aggregate([
      {
        $group: {
          _id: '$userId',
          totalKills: { $sum: '$kills' },
        },
      },
      { $sort: { totalKills: -1 } },
      { $limit: 10 },
    ]);

    const topByPrize = await Result.aggregate([
      {
        $group: {
          _id: '$userId',
          totalPrize: { $sum: '$prize' },
        },
      },
      { $sort: { totalPrize: -1 } },
      { $limit: 10 },
    ]);

    // Populate usernames
    const populateUsers = async (list) => {
      const populated = await Promise.all(
        list.map(async (entry) => {
          const user = await User.findById(entry._id).select('username phone');
          return {
            userId: entry._id,
            username: user?.username || 'Unknown',
            phone: user?.phone || '',
            ...entry,
          };
        })
      );
      return populated;
    };

    const killsLeaderboard = await populateUsers(topByKills);
    const prizeLeaderboard = await populateUsers(topByPrize);

    res.json({
      success: true,
      killsLeaderboard,
      prizeLeaderboard,
    });
  } catch (error) {
    console.error('❌ Error fetching leaderboard:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
