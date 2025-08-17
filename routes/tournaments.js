// routes/tournaments.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const tournamentController = require('../controllers/tournamentController');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Tournament list
router.get('/all', tournamentController.getAllTournaments);
router.get('/', tournamentController.getTournamentsByType);

// Tournament creation
router.post('/create', upload.single('image'), tournamentController.createTournament);

// Match results
router.post('/submit-result', tournamentController.submitResult);
router.post('/verify-result/:resultId', tournamentController.verifyResult);
router.get('/results/all', tournamentController.getAllResults);
router.get('/results/user/:userId', tournamentController.getUserHistory);

// Join & players
router.post('/join/:id', tournamentController.joinTournament);
router.get('/:id/players', tournamentController.getJoinedPlayers);

// Tournament details
router.get('/:id/details', tournamentController.getTournamentDetails);


module.exports = router;
