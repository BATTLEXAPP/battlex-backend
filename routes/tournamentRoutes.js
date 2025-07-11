const express = require('express');
const router = express.Router();
const Tournament = require('../models/tournament');
const Player = require('../models/player'); // if you're using a player list

// ✅ GET all tournaments
router.get('/', async (req, res) => {
  try {
    const tournaments = await Tournament.find().sort({ date: -1 });
    res.status(200).json({ success: true, data: tournaments });
  } catch (error) {
    console.error('❌ Error fetching tournaments:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tournaments' });
  }
});

// ✅ GET single tournament by ID
router.get('/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }
    res.status(200).json({ success: true, data: tournament });
  } catch (error) {
    console.error('❌ Error fetching tournament:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tournament' });
  }
});

// ✅ POST create new tournament
router.post('/create', async (req, res) => {
  try {
    const {
      title,
      game,
      date,
      time,
      entryFee,
      maxPlayers,
      prizePool,
      rules,
    } = req.body;

    const newTournament = new Tournament({
      title,
      game,
      date,
      time,
      entryFee,
      maxPlayers,
      prizePool,
      rules,
    });

    await newTournament.save();
    res.status(201).json({ success: true, message: 'Tournament created', data: newTournament });
  } catch (error) {
    console.error('❌ Error creating tournament:', error);
    res.status(500).json({ success: false, message: 'Failed to create tournament' });
  }
});

// ✅ POST Join tournament (with basic check)
router.post('/join/:tournamentId', async (req, res) => {
  try {
    const { userId, username } = req.body;
    const tournament = await Tournament.findById(req.params.tournamentId);

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    const alreadyJoined = tournament.players.some(p => p.userId === userId);
    if (alreadyJoined) {
      return res.status(400).json({ success: false, message: 'You have already joined this tournament' });
    }

    if (tournament.players.length >= tournament.maxPlayers) {
      return res.status(400).json({ success: false, message: 'Tournament is full' });
    }

    // Push user to players array
    tournament.players.push({ userId, username });
    await tournament.save();

    res.status(200).json({ success: true, message: 'Joined tournament successfully' });
  } catch (error) {
    console.error('❌ Error joining tournament:', error);
    res.status(500).json({ success: false, message: 'Failed to join tournament' });
  }
});

// ✅ GET joined players of a tournament
router.get('/players/:tournamentId', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.tournamentId);

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    res.status(200).json({ success: true, players: tournament.players });
  } catch (error) {
    console.error('❌ Error getting players:', error);
    res.status(500).json({ success: false, message: 'Failed to get player list' });
  }
});

module.exports = router;
