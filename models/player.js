// models/player.js

const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  kills: Number,
  rank: Number,
  prize: Number
}, { timestamps: true });

module.exports = mongoose.model('Player', playerSchema);
