// routes/resultRoutes.js

const express = require('express');
const router = express.Router(); // ✅ CORRECT WAY
const resultController = require('../controllers/resultsController');

// 1. Submit match result
router.post('/submit', resultController.submitResult);

// 2. Admin verify result (approve/reject)
router.post('/verify/:resultId', resultController.verifyResult);

// 3. Get match history of a player (specific BEFORE /all)
router.get('/user/:userId', resultController.getUserHistory);

// 4. Get all results (admin/debug)
router.get('/all', resultController.getAllResults);

module.exports = router;
