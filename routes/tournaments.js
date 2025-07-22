// routes/tournaments.js

const express = require('express');
const router = express.Router();
const tournamentController = require('../controllers/tournamentController');

// ✅ Tournament routes
router.get('/all', tournamentController.getAllTournaments);
router.post('/create', tournamentController.createTournament);
router.post('/join', tournamentController.joinTournament);
router.get('/:id/players', tournamentController.getJoinedPlayers);

// ✅ Match result routes
router.post('/submit-result', tournamentController.submitResult);
router.post('/verify-result/:resultId', tournamentController.verifyResult);
router.get('/results/all', tournamentController.getAllResults);
router.get('/results/user/:userId', tournamentController.getUserHistory);

module.exports = router;
