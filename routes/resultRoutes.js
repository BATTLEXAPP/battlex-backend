const express = require('express');
const router = express.Router(); // ✅ CORRECT WAY
const resultController = require('../controllers/resultController');

// 1. Submit match result
router.post('/submit', resultController.submitResult);

// 2. Admin verify result (approve/reject)
router.post('/verify/:resultId', resultController.verifyResult);

// 3. Get all results (admin/debug)
router.get('/all', resultController.getAllResults);

// 4. Get match history of a player
router.get('/user/:userId', resultController.getUserHistory);

module.exports = router;
