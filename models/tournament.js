const mongoose = require('mongoose');

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
    type: String, // "04 Aug, 6:00PM"
    required: true,
  },
  timestamp: {
    type: Date, // actual Date object for filtering/sorting
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
    type: Number,
    default: 0,
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
        required: true,
      },
      username: {
        type: String,
        required: true,
      },
      phoneNumber: {
        type: String,
        required: true,
      },
    },
  ],
  imageFilename: {
    type: String,
    required: true,
  }
}, { timestamps: true });

module.exports = mongoose.models.Tournament || mongoose.model('Tournament', tournamentSchema);
