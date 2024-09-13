const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
    participantId: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    designation: { type: String },
    email: { type: String },
    institute: { type: String },
    idCardType: { type: String },
    backgroundImage: { type: String },
    profilePicture: { type: String },
    eventId: { type: String },
    eventName: { type: String },
    amenities: { type: Map, of: Boolean, default: {} },
    archive: { type: Boolean, default: false }
}, {
    timestamps: true
});

const Participant = mongoose.model('Participant', participantSchema);

module.exports = Participant;
