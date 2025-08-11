// routes/tournaments.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const tournamentController = require('../controllers/tournamentController');

// ✅ Multer memory storage (no local uploads folder)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// GET routes
router.get('/all', tournamentController.getAllTournaments);
router.get('/', tournamentController.getTournamentsByType);

// ✅ Create tournament (uses controller)
router.post('/create', upload.single('image'), tournamentController.createTournament);

router.post('/join/:id', tournamentController.joinTournament);
router.get('/:id/players', tournamentController.getJoinedPlayers);

// Match result routes
router.post('/submit-result', tournamentController.submitResult);
router.post('/verify-result/:resultId', tournamentController.verifyResult);
router.get('/results/all', tournamentController.getAllResults);
router.get('/results/user/:userId', tournamentController.getUserHistory);

module.exports = router;
