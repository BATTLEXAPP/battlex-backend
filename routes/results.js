// routes/results.js
const express = require('express');
const router = express.Router();
const resultController = require('../controllers/resultsController');

// Result routes
router.post('/upload', resultController.submitResult);
router.post('/verify/:resultId', resultController.verifyResult);
router.get('/all', resultController.getAllResults);
router.get('/user/:userId', resultController.getUserHistory);
router.get('/leaderboard', resultController.getLeaderboard);

module.exports = router; // ✅ MAKE SURE THIS LINE EXISTS
