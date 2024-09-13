const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tokenSchema = new Schema({
    token: { type: String, required: true },
    eventId: { type: String, required: true },
    eventName: { type: String, required: true },
    createdAt: { type: Date, default: Date.now } // This will be used for TTL
});

// Create TTL index to automatically delete documents after 1 hour
// tokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 }); // 3600 seconds = 1 hour

module.exports = mongoose.model('Token', tokenSchema);
