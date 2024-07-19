const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
    participantId: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    designation: { type: String, required: true },
    institute: { type: String, required: true },
    idCardType: { type: String },
    backgroundImage: { type: String, required: true },
    profilePicture: { type: String, required: true },
    eventId: { type: String, required: true },
    eventName: { type: String, required: true },
    archive: { type: Boolean, default: false } 
}, {
    timestamps: true
});

const Participant = mongoose.model('Participant', participantSchema);

module.exports = Participant;
