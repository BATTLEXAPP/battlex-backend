// routes/tournaments.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const tournamentController = require('../controllers/tournamentController');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Helper to wrap async route handlers and log errors
const asyncHandler = (fn, routeName) => async (req, res, next) => {
  console.log(`📌 [Route Called] ${routeName} - Params:`, req.params, "Query:", req.query, "Body:", req.body);
  try {
    await fn(req, res, next);
    console.log(`✅ [Route Success] ${routeName}`);
  } catch (err) {
    console.error(`❌ [Route Error] ${routeName}:`, err);
    res.status(500).json({ success: false, message: `Internal server error at ${routeName}` });
  }
};

// Tournament list
router.get('/all', asyncHandler(tournamentController.getAllTournaments, 'getAllTournaments'));
router.get('/', asyncHandler(tournamentController.getTournamentsByType, 'getTournamentsByType'));

// Tournament creation
router.post('/create', upload.single('image'), asyncHandler(tournamentController.createTournament, 'createTournament'));

// Match results
router.post('/submit-result', asyncHandler(tournamentController.submitResult, 'submitResult'));
router.post('/verify-result/:resultId', asyncHandler(tournamentController.verifyResult, 'verifyResult'));
router.get('/results/all', asyncHandler(tournamentController.getAllResults, 'getAllResults'));
router.get('/results/user/:userId', asyncHandler(tournamentController.getUserHistory, 'getUserHistory'));

// Join & players
router.post('/join/:id', asyncHandler(tournamentController.joinTournament, 'joinTournament'));
router.get('/:id/players', asyncHandler(tournamentController.getJoinedPlayers, 'getJoinedPlayers'));

// Tournament details
router.get('/:id/details', asyncHandler(tournamentController.getTournamentDetails, 'getTournamentDetails'));

module.exports = router;
