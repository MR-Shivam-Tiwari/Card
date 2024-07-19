const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    eventName: { type: String, required: true },
    address: { type: String, required: true },
    date: { type: Date, required: true },
    photoUrl: { type: String },
    categories: [{ type: String }],
    archive: { type: Boolean, default: false } // New field for archiving event
});

module.exports = mongoose.model('Event', eventSchema);
