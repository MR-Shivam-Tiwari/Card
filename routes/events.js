const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Participant = require('../models/participant');

router.post('/', async (req, res) => {
    try {
        const { eventName, address, date, photo, categories } = req.body;

        // Assuming categories are sent as an array of strings in req.body.categories

        const newEvent = new Event({
            eventName,
            address,
            date,
            photoUrl: photo,
            categories // Assign categories array directly to the new event
        });

        await newEvent.save();
        res.status(201).send(newEvent);
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).send('Server error');
    }
});


// GET route to fetch all events
router.get('/allevent', async (req, res) => {
    try {
        const events = await Event.find();

        // Create an array to hold promises for counting participants
        const eventsWithCounts = await Promise.all(events.map(async (event) => {
            const participantCount = await Participant.countDocuments({ eventId: event._id });
            return {
                ...event.toObject(),
                participantCount // Add participant count to the event
            };
        }));

        res.json(eventsWithCounts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
router.get('/', async (req, res) => {
    try {
        const events = await Event.find({ archive: false });

        // Create an array to hold promises for counting participants
        const eventsWithCounts = await Promise.all(events.map(async (event) => {
            const participantCount = await Participant.countDocuments({ eventId: event._id });
            return {
                ...event.toObject(),
                participantCount // Add participant count to the event
            };
        }));

        res.json(eventsWithCounts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
router.get('/archiveevent', async (req, res) => {
    try {
        const events = await Event.find({ archive: true });

        // Create an array to hold promises for counting participants
        const eventsWithCounts = await Promise.all(events.map(async (event) => {
            const participantCount = await Participant.countDocuments({ eventId: event._id });
            return {
                ...event.toObject(),
                participantCount // Add participant count to the event
            };
        }));

        res.json(eventsWithCounts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
// GET route to fetch a specific event by ID
router.get('/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        res.json(event);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PATCH route to update an event by ID
router.patch('/:id', async (req, res) => {
    try {
        const { eventName, address, date, photo } = req.body;

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            { eventName, address, date, photoUrl: photo },
            { new: true }
        );

        res.json(updatedEvent);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PATCH route to archive or unarchive an event by ID
router.patch('/archive/:id', async (req, res) => {
    try {
        const { archive } = req.body;

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            { archive },
            { new: true }
        );

        if (!updatedEvent) {
            return res.status(404).json({ message: 'Event not found' });
        }

        res.json(updatedEvent);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});
// DELETE route to delete an event by ID
router.delete('/:id', async (req, res) => {
    try {
        await Event.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted event' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
