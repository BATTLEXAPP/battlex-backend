const mongoose = require('mongoose');
const path = require('path');

const tournamentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    required: true,
  },
  game: {
    type: String,
    default: 'Free Fire',
  },
  gameType: {
    type: String,
    enum: ['BR', 'CS'],
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  entryFee: {
    type: Number,
    required: true,
  },
  maxPlayers: {
    type: Number,
    required: true,
  },
  roomId: {
    type: String,
    default: '',
  },
  roomPassword: {
    type: String,
    default: '',
  },
  prizePool: {
    type: String,
    default: '0',
  },
  rules: {
    type: [String],
    default: ['No emulators', 'No teaming'],
  },
  players: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      username: String,
    },
  ],

  // ✅ Replacing imageUrl with actual image filename
  image: {
    type: String, // e.g. "banner1.png"
    required: true,
  },

}, { timestamps: true });

module.exports = mongoose.model('Tournament', tournamentSchema);
