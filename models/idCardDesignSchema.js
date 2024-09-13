const mongoose = require('mongoose');

const idCardDesignSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  visibility: {
    name: { type: Boolean, default: true },
    profilePicture: { type: Boolean, default: true },
    institute: { type: Boolean, default: true },
    designation: { type: Boolean, default: true },
    qrCode: { type: Boolean, default: true },
    participantId: { type: Boolean, default: true }
  },
  backgroundColor: { type: String, default: '#FFFFFF' },
  textColor: { type: String, default: '#000000' },
  elementStyles: {
    profilePicture: {
      bottom: { type: Number, default: 160 },
      size: { type: Number, default: 170 }
    },
    name: {
      top: { type: Number, default: 200 },
      fontSize: { type: Number, default: 20 },
      color: { type: String, default: "white" }
    },
    institute: {
      bottom: { type: Number, default: 130 },
      fontSize: { type: Number, default: 18 },
      color: { type: String, default: "white" }
    },
    designation: {
      bottom: { type: Number, default: 107 },
      fontSize: { type: Number, default: 16 },
      color: { type: String, default: "black" }
    },
    qrCode: {
      bottom: { type: Number, default: 15 }
    },
    participantId: {
      bottom: { type: Number, default: 1 },
      fontSize: { type: Number, default: 12 },
      color: { type: String, default: "black" }
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('IdCardDesign', idCardDesignSchema);