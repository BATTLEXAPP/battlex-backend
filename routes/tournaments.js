// routes/tournaments.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const tournamentController = require('../controllers/tournamentController');

const currentYear = new Date().getFullYear();
const fullDateString = `${req.body.date} ${currentYear} ${req.body.time}`; // e.g., "04 Aug 2025 5:00PM"
const formattedDate = new Date(fullDateString);


// ✅ Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // files go to /uploads/
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

// ✅ Tournament routes
router.get('/all', tournamentController.getAllTournaments);
router.get('/', tournamentController.getTournamentsByType);

// ✅ Use multer for image upload
router.post('/create', upload.single('image'), tournamentController.createTournament);

router.post('/join/:id', tournamentController.joinTournament);
router.get('/:id/players', tournamentController.getJoinedPlayers);

// ✅ Match result routes
router.post('/submit-result', tournamentController.submitResult);
router.post('/verify-result/:resultId', tournamentController.verifyResult);
router.get('/results/all', tournamentController.getAllResults);
router.get('/results/user/:userId', tournamentController.getUserHistory);

module.exports = router;
