// routes/tournaments.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // ✅ Needed for fs.existsSync
const moment = require('moment');


const tournamentController = require('../controllers/tournamentController');
const Tournament = require('../models/tournament'); // ✅ Required

const uploadPath = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}

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
// ✅ Use multer for image upload
router.post('/create', upload.single('image'), async (req, res) => {
  try {
    const {
      title, description, entryFee, maxPlayers, roomId, roomPassword,
      gameType, date, prizePool, rules
    } = req.body;

    const currentYear = new Date().getFullYear();
    const fullDateString = `${date} ${currentYear}`; // e.g., "04 Aug, 6:00PM 2025"

    const parsedDate = moment(fullDateString, 'DD MMM, hh:mmA YYYY');
    if (!parsedDate.isValid()) {
      return res.status(400).json({ message: 'Invalid date format. Use: 04 Aug, 6:00PM' });
    }

    const tournamentDate = parsedDate.toDate();

    const tournament = new Tournament({
      title,
      description,
      entryFee: Number(entryFee),
      maxPlayers: Number(maxPlayers),
      roomId,
      roomPassword,
      gameType,
      date,                        // original formatted string
      time: date,                  // same as above, you can customize if needed
      prizePool: Number(entryFee) * Number(maxPlayers),
      image: req.file ? req.file.filename : '',
      rules,
      timestamp: tournamentDate.toISOString() // parsed full date for sorting/filtering
    });

    await tournament.save();
    res.status(201).json({ message: 'Tournament created successfully', tournament });
  } catch (error) {
    console.error('Error creating tournament:', error);
    res.status(500).json({ message: 'Failed to create tournament', error });
  }
});



router.post('/join/:id', tournamentController.joinTournament);
router.get('/:id/players', tournamentController.getJoinedPlayers);

// ✅ Match result routes
router.post('/submit-result', tournamentController.submitResult);
router.post('/verify-result/:resultId', tournamentController.verifyResult);
router.get('/results/all', tournamentController.getAllResults);
router.get('/results/user/:userId', tournamentController.getUserHistory);

module.exports = router;
