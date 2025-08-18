// controllers/tournamentController.js
const Tournament = require('../models/tournament');
const cloudinary = require('../cloudinary');
const moment = require('moment');

const User = require('../models/user');
const Transaction = require('../models/transaction');
const Result = require('../models/result');


// ✅ Create a new tournament with Cloudinary image upload
// ✅ Create a new tournament with Cloudinary image upload (with debug logs)
exports.createTournament = async (req, res) => {
  try {
    console.log("📩 Incoming tournament create request");
    console.log("🧾 req.body:", req.body);
    console.log("📸 req.file:", req.file ? `${req.file.originalname} (${req.file.mimetype}, ${req.file.size} bytes)` : "❌ No file");

    const {
      title, description, game, gameType, date, time,
      entryFee, maxPlayers, roomId, roomPassword,
      rules, prizePool
    } = req.body;

    if (!title || !entryFee || !maxPlayers || !date || !time || !req.file || !prizePool) {
      console.error("❌ Missing fields:", { title, entryFee, maxPlayers, date, time, prizePool, file: !!req.file });
      return res.status(400).json({ error: "Missing required fields or image file" });
    }

    const currentYear = new Date().getFullYear();
    const fullDateString = `${date} ${time} ${currentYear}`; // ✅ include time
    console.log("📅 fullDateString:", fullDateString);

    const parsedDate = moment(fullDateString, 'DD MMM, hh:mmA YYYY');
    if (!parsedDate.isValid()) {
      console.error("❌ Invalid date format:", fullDateString);
      return res.status(400).json({ error: "Invalid date format. Expected: 04 Aug, 6:00PM" });
    }

    // ✅ Upload image to Cloudinary
    console.log("☁️ Uploading image to Cloudinary...");
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'battlex_tournaments' },
        (error, result) => {
          if (error) {
            console.error("❌ Cloudinary upload failed:", error);
            return reject(error);
          }
          console.log("✅ Cloudinary upload success:", result.secure_url);
          resolve(result);
        }
      );
      require('streamifier').createReadStream(req.file.buffer).pipe(stream);
    });

    const tournamentDate = parsedDate.toDate();
    const formattedTime = parsedDate.format('hh:mmA'); // ✅ correct time from admin input

    const tournament = new Tournament({
      title,
      description,
      game,
      gameType,
      date,
      time: formattedTime,
      entryFee: Number(entryFee),
      maxPlayers: Number(maxPlayers),
      roomId,
      roomPassword,
      prizePool: Number(prizePool),
      rules,
      imageFilename: uploadResult.public_id + '.' + uploadResult.format,
      timestamp: tournamentDate.toISOString()
    });

    console.log("💾 Saving tournament to DB...");
    await tournament.save();
    console.log("✅ Tournament saved:", tournament._id);

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
    console.error("❌ Error in createTournament:", { name: err.name, message: err.message, stack: err.stack });
    res.status(500).json({ error: "Failed to create tournament" });
  }
};

// ✅ Join a tournament using phoneNumber (atomic, full logging)
exports.joinTournament = async (req, res) => {
  const session = await User.startSession(); 
  session.startTransaction();

  try {
    const tournamentId = req.params.id;
    const { phoneNumber } = req.body;

    console.log("📥 [JOIN] Request received:", { tournamentId, phoneNumber });

    // 1. Check if user exists
    const user = await User.findOne({ phoneNumber }).session(session);
    if (!user) {
      console.warn("⚠️ [JOIN] User not found for phoneNumber:", phoneNumber);
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "User not found" });
    }
    console.log("🟢 [JOIN] User found:", { id: user._id, username: user.username, wallet: user.walletBalance });

    // 2. Check if tournament exists
    const tournament = await Tournament.findById(tournamentId).session(session);
    if (!tournament) {
      console.warn("⚠️ [JOIN] Tournament not found:", tournamentId);
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "Tournament not found" });
    }
    console.log("🟢 [JOIN] Tournament found:", { id: tournament._id, title: tournament.title, players: tournament.players.length });

    // 3. Already joined?
    const alreadyJoined = tournament.players.some(p => p.userId.toString() === user._id.toString());
    if (alreadyJoined) {
      console.log("ℹ️ [JOIN] User already joined:", user._id.toString());
      await session.abortTransaction();
      session.endSession();

      return res.status(200).json({
        success: true,
        message: "Already joined this tournament",
        walletBalance: user.walletBalance,
        tournament: {
          ...tournament.toObject(),
          alreadyJoined: true
        },
        user: {
          id: user._id,
          username: user.username,
          phoneNumber: user.phoneNumber
        }
      });
    }

    // 4. Capacity check
    if (tournament.players.length >= tournament.maxPlayers) {
      console.warn("⚠️ [JOIN] Tournament full:", tournament.players.length, "/", tournament.maxPlayers);
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Tournament is full" });
    }

    // 5. Wallet check
    if (user.walletBalance < tournament.entryFee) {
      console.warn("⚠️ [JOIN] Insufficient balance. Wallet:", user.walletBalance, "Entry Fee:", tournament.entryFee);
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Insufficient wallet balance" });
    }

    // 6. Deduct entry fee
    user.walletBalance -= tournament.entryFee;
    await user.save({ session });
    console.log("💰 [JOIN] Deducted entry fee. New wallet balance:", user.walletBalance);

    // 7. Record transaction
    const txn = await Transaction.create([{
      user: user._id,
      type: 'withdraw',
      amount: tournament.entryFee,
      description: `Joined tournament: ${tournament.title}`
    }], { session });
    console.log("📝 [JOIN] Transaction recorded:", txn[0]._id.toString());

    // 8. Add user to tournament players
    tournament.players.push({
      userId: user._id,
      username: user.username,
      phoneNumber: user.phoneNumber
    });
    await tournament.save({ session });
    console.log("👥 [JOIN] User added to tournament. Total players:", tournament.players.length);

    // 9. Commit
    await session.commitTransaction();
    session.endSession();
    console.log("✅ [JOIN] Transaction committed successfully.");

    // ✅ Full response with all tournament details intact
    res.json({
      success: true,
      message: "Successfully joined tournament",
      walletBalance: user.walletBalance,
      tournament: {
        ...tournament.toObject(),
        alreadyJoined: true
      },
      user: {
        id: user._id,
        username: user.username,
        phoneNumber: user.phoneNumber
      }
    });

  } catch (err) {
    console.error("❌ [JOIN] Error in joinTournament:", err);
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: "Internal Server Error" });
  }
};








  // ✅ Get players who joined a tournament
  exports.getJoinedPlayers = async (req, res) => {
    try {
      const tournamentId = req.params.id;
         tournament = await Tournament.findById(tournamentId);

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

  // ✅ Fetch all tournaments (with join info for the logged-in user)
exports.getAllTournaments = async (req, res) => {
  try {
    const { phoneNumber } = req.query; // frontend must send phoneNumber
    let user = null;

    if (phoneNumber) {
      user = await User.findOne({ phoneNumber });
    }

    const tournaments = await Tournament.find().sort({ date: -1 });

    const response = tournaments.map(t => {
      const hasJoined = user 
        ? t.players.some(p => p.userId.toString() === user._id.toString()) 
        : false;

      return {
        ...t.toObject(),
        alreadyJoined: hasJoined,
        roomId: hasJoined ? t.roomId : null,
        roomPassword: hasJoined ? t.roomPassword : null
      };
    });

    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("❌ Error fetching tournaments with join info:", error);
    res.status(500).json({ success: false, message: "Failed to fetch tournaments" });
  }
};


// ✅ Fetch tournaments by type (with join info)
exports.getTournamentsByType = async (req, res) => {
  try {
    const { gameType, phoneNumber } = req.query;

    let user = null;
    if (phoneNumber) {
      user = await User.findOne({ phoneNumber });
    }

    let tournaments = gameType
      ? await Tournament.find({ gameType })
      : await Tournament.find();

    const response = tournaments.map(t => {
      const hasJoined = user 
        ? t.players.some(p => p.userId.toString() === user._id.toString()) 
        : false;

      return {
        ...t.toObject(),
        alreadyJoined: hasJoined,
        roomId: hasJoined ? t.roomId : null,
        roomPassword: hasJoined ? t.roomPassword : null
      };
    });

    res.status(200).json({ success: true, data: response });
  } catch (err) {
    console.error("❌ Error fetching tournaments by type:", err);
    res.status(500).json({ success: false, message: "Failed to fetch tournaments" });
  }
};

// ✅ Get tournament details (for frontend detail page)
exports.getTournamentDetails = async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const { phoneNumber } = req.query; // optional

    if (!tournamentId) {
      return res.status(400).json({ success: false, message: "Tournament ID required" });
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, message: "Tournament not found" });
    }

    // Check if any user is in the players array (alreadyJoined)
    let alreadyJoined = false;
    let user = null;

    if (phoneNumber) {
      user = await User.findOne({ phoneNumber });
      if (user) {
        alreadyJoined = tournament.players.some(p => p.userId.toString() === user._id.toString());
      }
    } else {
      // If no phoneNumber provided, just detect if any player exists with the same phoneNumber in players (optional fallback)
      // We can also leave it false if no identification available
      alreadyJoined = false;
    }

    res.status(200).json({
      success: true,
      data: {
        ...tournament.toObject(),
        alreadyJoined,
        roomId: alreadyJoined ? tournament.roomId : null,
        roomPassword: alreadyJoined ? tournament.roomPassword : null,
      }
    });
  } catch (err) {
    console.error("❌ Error in getTournamentDetails:", err);
    res.status(500).json({ success: false, message: "Internal server error at getTournamentDetails" });
  }
};
