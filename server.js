require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();

const mongoose = require('mongoose');

// ✅ Always connect to this specific database name
mongoose.connect('mongodb://127.0.0.1:27017/battlex', {
  dbName: 'battlex', // 👈 Ensures correct DB is used
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB connected');
})
.catch((err) => {
  console.error('❌ Mongo error:', err);
});


// Multer config for file uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png/;
    const isValid = allowed.test(file.mimetype) && allowed.test(path.extname(file.originalname).toLowerCase());
    cb(isValid ? null : new Error('Only images allowed'), isValid);
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/user', require('./routes/auth'));             // ✅ Signup, login, verify-otp
app.use('/api/tournament', require('./routes/tournamentRoutes'));
app.use('/api/results', require('./routes/results'));
app.use('/api/wallet', require('./routes/walletRoutes'));

// Result Upload (for screenshot)
const Result = require('./models/result');
app.post('/api/results/upload', upload.single('screenshot'), async (req, res) => {
  try {
    const { userId, tournamentId, kills, rank, prize } = req.body;

    if (!userId || !tournamentId || kills === undefined || rank === undefined || prize === undefined) {
      return res.status(400).json({ success: false, message: 'Missing fields' });
    }

    const exists = await Result.findOne({ userId, tournamentId });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Already submitted' });
    }

    const result = new Result({
      userId,
      tournamentId,
      kills,
      rank,
      prize,
      screenshotUrl: req.file ? `/uploads/${req.file.filename}` : null
    });

    await result.save();
    res.status(201).json({ success: true, result });
  } catch (err) {
    console.error('❌ Result upload error:', err.message);
    res.status(500).json({ success: false, message: 'Upload error' });
  }
});

// Default error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message);
  res.status(500).json({ success: false, message: err.message || 'Server error' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server ready: http://localhost:${PORT}`));
