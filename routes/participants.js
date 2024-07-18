const express = require('express');
const router = express.Router();
const Participant = require('../models/participant');

function generateParticipantId() {
    const length = 5;
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

async function isParticipantIdUnique(participantId) {
    const existingParticipant = await Participant.findOne({ participantId });
    return !existingParticipant;
}

async function generateUniqueParticipantId() {
    let participantId = generateParticipantId();
    while (!(await isParticipantIdUnique(participantId))) {
        participantId = generateParticipantId();
    }
    return participantId;
}

router.post('/', async (req, res) => {
    try {
        // Extract data and base64 images from the request body
        const {
            firstName,
            lastName,
            designation,
            idCardType,
            institute,
            backgroundImage,
            profilePicture,
            eventId,
            eventName
        } = req.body;

        // Generate unique participantId
        const participantId = await generateUniqueParticipantId();

        // Create a new participant object
        const participant = new Participant({
            participantId,
            firstName,
            lastName,
            designation,
            idCardType,
            institute,
            backgroundImage,
            profilePicture,
            eventId,
            eventName
        });

        // Save participant to database
        const savedParticipant = await participant.save();

        // Send back the saved participant object
        res.status(201).send(savedParticipant);
    } catch (error) {
        // Handle errors
        console.error('Error in creating participant:', error);
        res.status(400).send(error);
    }
});

// Get all participants
router.get('/', async (req, res) => {
    try {
        const participants = await Participant.find();
        res.status(200).send(participants);
    } catch (error) {
        res.status(500).send(error);
    }
});

// PATCH endpoint to archive a participant by ID
router.patch('/archive/:id', async (req, res) => {
    const updates = { archive: true }; // Set archive to true to archive the participant

    try {
        const participant = await Participant.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true }
        );

        if (!participant) {
            return res.status(404).send({ message: "Participant not found" });
        }

        res.status(200).send(participant);
    } catch (error) {
        res.status(400).send(error);
    }
});


router.get('/event/:eventId', async (req, res) => {
    const eventId = req.params.eventId;

    try {
        const participants = await Participant.find({ eventId, archive: false }); // Filter participants by eventId and archive status
        res.status(200).send(participants);
    } catch (error) {
        res.status(500).send(error);
    }
});

// Get a participant by ID
router.get('/:id', async (req, res) => {
    try {
        const participant = await Participant.findById(req.params.id);
        if (!participant) {
            return res.status(404).send();
        }
        res.status(200).send(participant);
    } catch (error) {
        res.status(500).send(error);
    }
});

// Update a participant by ID
router.patch('/:id', async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['firstName', 'lastName', 'designation', 'idCardType', 'backgroundImage', 'profilePicture', 'eventId', 'eventName'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' });
    }

    try {
        const participant = await Participant.findById(req.params.id);
        if (!participant) {
            return res.status(404).send();
        }

        updates.forEach(update => participant[update] = req.body[update]);
        await participant.save();
        res.status(200).send(participant);
    } catch (error) {
        res.status(400).send(error);
    }
});

// Delete a participant by ID
router.delete('/:id', async (req, res) => {
    try {
        const participant = await Participant.findByIdAndDelete(req.params.id);
        if (!participant) {
            return res.status(404).send({ message: "Participant not found" });
        }
        res.status(200).send({ message: "Participant successfully deleted", participant });
    } catch (error) {
        res.status(500).send({ message: "An error occurred while trying to delete the participant", error: error.message });
    }
});

module.exports = router;
