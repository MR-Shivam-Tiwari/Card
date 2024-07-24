const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    eventName: { type: String, required: true },
    address: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    photoUrl: { type: String },
    idcardimage: { type: String },
    categories: [{ type: String }],
    archive: { type: Boolean, default: false },
    amenities: {
        type: Map,
        of: { type: Boolean, default: false },
        default: {}
    }
});

module.exports = mongoose.model('Event', eventSchema);
