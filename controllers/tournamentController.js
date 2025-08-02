  // controllers/tournamentController.js

  const Tournament = require('../models/tournament');
  const User = require('../models/user');
  const Transaction = require('../models/transaction');
  const Result = require('../models/result');
  const path = require('path'); // ✅ keep this


  // ✅ Create a new tournament with image upload
  exports.createTournament = async (req, res) => {
    try {
      const {
        title, description, game, gameType, date, time,
        entryFee, maxPlayers, roomId, roomPassword,
        prizePool, rules
      } = req.body;

      if (!title || !entryFee || !maxPlayers || !date || !time || !req.file) {
        return res.status(400).json({ error: "Missing required fields or image file" });
      }

      const imageFilename = req.file.filename; // multer stores this

      const tournament = new Tournament({
        title,
        description,
        game,
        gameType,
        date: new Date(date),
        time,
        entryFee: Number(entryFee) || 0,
        maxPlayers: Number(maxPlayers) || 0,
        roomId,
        roomPassword,
        prizePool: Number(prizePool) || 0,
        rules,
        image: imageFilename // ✅ Save uploaded filename
      });

      await tournament.save();
      const safeTournament = {
  _id: tournament._id,
  title: tournament.title,
  description: tournament.description || "",
  game: tournament.game || "",
  gameType: tournament.gameType || "",
  date: tournament.date,
  time: tournament.time,
  entryFee: tournament.entryFee || 0,
  maxPlayers: tournament.maxPlayers || 0,
  roomId: tournament.roomId || "",
  roomPassword: tournament.roomPassword || "",
  prizePool: tournament.prizePool || 0,
  rules: tournament.rules || [],
  image: tournament.image || "",
  players: tournament.players || [],
  createdAt: tournament.createdAt,
  updatedAt: tournament.updatedAt,
};

res.status(201).json({
  message: "Tournament created",
  tournament: safeTournament,
});

    } catch (err) {
      console.error("❌ Error in createTournament:", err);
      res.status(500).json({ error: "Failed to create tournament" });
    }
  };

  // ✅ Join a tournament
    exports.joinTournament = async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const { phoneNumber, username } = req.body;

    const tournament = await Tournament.findById(tournamentId);
    const user = await User.findOne({ phoneNumber });

    if (!user || !tournament) {
      return res.status(404).json({ error: "User or Tournament not found" });
    }

    const alreadyJoined = tournament.players.find(p => p.userId.toString() === user._id.toString());
    if (alreadyJoined) {
      return res.status(400).json({ message: "Already joined this tournament" });
    }

    if (tournament.players.length >= tournament.maxPlayers) {
      return res.status(400).json({ message: "Tournament is full" });
    }

    if (user.walletBalance < tournament.entryFee) {
      return res.status(400).json({ message: "Insufficient wallet balance" });
    }

    // Deduct entry fee
    user.walletBalance -= tournament.entryFee;
    await user.save();

    await Transaction.create({
      user: user._id,
      type: 'deduct',
      amount: tournament.entryFee,
      reason: `Joined tournament: ${tournament.title}`
    });

    // Add user to players
    tournament.players.push({ userId: user._id, username: user.username });
    await tournament.save();

    res.json({ message: "Successfully joined tournament", walletBalance: user.walletBalance });
  } catch (err) {
    console.error("❌ Error in joinTournament:", {
      name: err.name,
      message: err.message,
      stack: err.stack
    });

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
      const { userId, tournamentId, kills, rank, screenshotUrl, prize } = req.body;

      const alreadySubmitted = await Result.findOne({ userId, tournamentId });
      if (alreadySubmitted) {
        return res.status(409).json({ message: "Result already submitted" });
      }

      const result = new Result({
        userId,
        tournamentId,
        kills,
        rank,
        prize,
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

        const prize = parseFloat(result.prize || 0);
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
        .populate('userId', 'username phoneNumber')
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

  // ✅ Fetch all tournaments
  exports.getAllTournaments = async (req, res) => {
    try {
      const tournaments = await Tournament.find().sort({ date: -1 });

      if (!tournaments || tournaments.length === 0) {
        console.log("⚠️ No tournaments found in DB");
      }

      res.status(200).json({ success: true, data: tournaments });
    } catch (error) {
      console.error("❌ Error fetching tournaments FULL:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        message: "Failed to fetch tournament",
        error: error.message
      });
    }
  };

  // GET /api/tournaments?gameType=BR
  exports.getTournamentsByType = async (req, res) => {
    try {
      const { gameType } = req.query;

      let tournaments;
      if (gameType) {
        tournaments = await Tournament.find({ gameType });
      } else {
        tournaments = await Tournament.find(); // return all
      }

      res.status(200).json({ success: true, data: tournaments });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to fetch tournaments' });
    }
  };

