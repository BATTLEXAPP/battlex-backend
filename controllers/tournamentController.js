const Tournament = require('../models/tournament');
const User = require('../models/user');
const Transaction = require('../models/transaction');
const Result = require('../models/result');

// ✅ Create a new tournament
exports.createTournament = async (req, res) => {
  try {
    const {
      title, description, game, date, time,
      entryFee, maxPlayers, roomId, roomPassword,
      prizePool, rules
    } = req.body;

    if (!title || !entryFee || !maxPlayers || !date || !time) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const tournament = new Tournament({
      title,
      description,
      game,
      date,
      time,
      entryFee,
      maxPlayers,
      roomId,
      roomPassword,
      prizePool,
      rules
    });

    await tournament.save();
    res.status(201).json({ message: "Tournament created", tournament });
  } catch (err) {
    console.error("❌ Error in createTournament:", err);
    res.status(500).json({ error: "Failed to create tournament" });
  }
};

// ✅ Join a tournament
exports.joinTournament = async (req, res) => {
  try {
    const { userId, tournamentId } = req.body;

    const tournament = await Tournament.findById(tournamentId);
    const user = await User.findById(userId);

    if (!user || !tournament) {
      return res.status(404).json({ error: "User or Tournament not found" });
    }

    if (tournament.players.find(p => p.userId.toString() === userId)) {
      return res.status(400).json({ message: "Already joined this tournament" });
    }

    if (tournament.players.length >= tournament.maxPlayers) {
      return res.status(400).json({ message: "Tournament is full" });
    }

    if (user.walletBalance < tournament.entryFee) {
      return res.status(400).json({ message: "Insufficient wallet balance" });
    }

    user.walletBalance -= tournament.entryFee;
    await user.save();

    await Transaction.create({
      user: userId,
      type: 'deduct',
      amount: tournament.entryFee,
      reason: `Joined tournament: ${tournament.title}`
    });

    tournament.players.push({ userId, username: user.username });
    await tournament.save();

    res.json({ message: "Successfully joined tournament", walletBalance: user.walletBalance });
  } catch (err) {
    console.error("❌ Error in joinTournament:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Get players who joined a tournament
exports.getJoinedPlayers = async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    res.json({ players: tournament.players });
  } catch (err) {
    console.error("❌ Error fetching joined players:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Submit match result
exports.submitResult = async (req, res) => {
  try {
    const { userId, tournamentId, kills, rank, screenshotUrl } = req.body;

    const alreadySubmitted = await Result.findOne({ userId, tournamentId });
    if (alreadySubmitted) {
      return res.status(409).json({ message: "Result already submitted" });
    }

    const result = new Result({
      userId,
      tournamentId,
      kills,
      rank,
      screenshotUrl
    });

    await result.save();
    res.status(201).json({ message: "Result submitted successfully", result });
  } catch (err) {
    console.error("❌ Error in submitResult:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Admin verifies result
exports.verifyResult = async (req, res) => {
  try {
    const { resultId } = req.params;
    const { status } = req.body;

    const result = await Result.findById(resultId);
    if (!result) return res.status(404).json({ error: "Result not found" });

    if (status === 'approved') {
      const tournament = await Tournament.findById(result.tournamentId);
      const user = await User.findById(result.userId);

      if (!tournament || !user) {
        return res.status(404).json({ error: "Tournament or user not found" });
      }

      const prize = parseFloat(tournament.prizePool || 0);
      user.walletBalance += prize;
      await user.save();

      await Transaction.create({
        user: user._id,
        type: 'add',
        amount: prize,
        reason: `Prize for ${tournament.title}`
      });
    }

    result.status = status;
    await result.save();

    res.json({ message: `Result ${status} successfully`, result });
  } catch (err) {
    console.error("❌ Error in verifyResult:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Get all match results
exports.getAllResults = async (req, res) => {
  try {
    const results = await Result.find()
      .populate('userId', 'username phone')
      .populate('tournamentId', 'title date');

    res.json({ results });
  } catch (err) {
    console.error("❌ Error fetching all results:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Get match history for a user
exports.getUserHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const results = await Result.find({ userId })
      .populate('tournamentId', 'title date time prizePool')
      .sort({ createdAt: -1 });

    res.json({ results });
  } catch (err) {
    console.error("❌ Error fetching user history:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
