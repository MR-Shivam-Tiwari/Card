const express = require('express');
const router = express.Router();
const verifyToken  = require('./verifyToken')
const Participant = require('../models/participant');
const Token = require('../models/Token');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const multerS3 = require('multer-s3');
const s3Client = require('../config');
const idCardDesignSchema = require('../models/idCardDesignSchema');
const SECRET_KEY = 'MyNameisShivam';
const bucketName = process.env.AWS_BUCKET_NAME;
const upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: bucketName,
        metadata: (req, file, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (req, file, cb) => {
            cb(null, Date.now().toString() + '-' + file.originalname);
        },
    }),
});






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
router.post('/bulk-upload', upload.none(), async (req, res) => {
    try {
        const { participants, eventId, eventName, backgroundImage, amenities } = req.body;

        if (!participants || !Array.isArray(JSON.parse(participants))) {
            return res.status(400).send({ error: "Invalid participants data." });
        }

        const parsedParticipants = JSON.parse(participants);

        const participantDocs = await Promise.all(parsedParticipants.map(async (participant) => {
            const participantId = await generateUniqueParticipantId();

            // Parse amenities JSON string to an object
            let amenitiesObject = {};
            try {
                amenitiesObject = amenities ? JSON.parse(amenities) : {};
            } catch (parseError) {
                console.error('Error parsing amenities JSON:', parseError);
                return res.status(400).json({ error: 'Invalid amenities format' });
            }
            // Log the participant and amenities for debugging
            console.log('Participant:', participant);
            console.log('Parsed Amenities:', amenitiesObject);

            return {
                participantId,
                firstName: participant.FirstName,
                lastName: participant.last,
                designation: participant.Designation,
                institute: participant.institute,
                idCardType: participant.idCardType,
                backgroundImage,
                profilePicture: participant.ProfilePicture,
                eventId,
                eventName,
                amenities: amenitiesObject,
                archive: false,
            };
        }));

        const savedParticipants = await Participant.insertMany(participantDocs);

        res.status(201).send(savedParticipants);
    } catch (error) {
        console.error('Error in bulk uploading participants:', error);
        res.status(500).send({ error: "Error uploading participants.", details: error.message });
    }
});





router.get('/verify-token', async (req, res) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        // Decode token
        const decoded = jwt.verify(token, SECRET_KEY);

        // Check if token exists in database
        const tokenDoc = await Token.findOne({ token });
        if (!tokenDoc) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        // Check if eventId matches
        if (tokenDoc.eventId === decoded.eventId) {
            return res.status(200).json({
                message: 'Token is valid',
                eventId: decoded.eventId,
                eventName: decoded.eventName
            });
        } else {
            return res.status(401).json({ message: 'Token does not match event' });
        }
    } catch (err) {
        return res.status(401).json({ message: 'Failed to authenticate token' });
    }
});





router.post('/', upload.single('profilePicture'), async (req, res) => {
    try {
        // Extract data from the request body and files
        const {
            firstName,
            lastName,
            designation,
            idCardType,
            institute,
            eventId,
            eventName,
            email,
            backgroundImage,
            amenities // This should be a JSON object
        } = req.body;

        // Extract file paths
        const profilePicture = req.file ? req.file.location : null;
        console.log(firstName, lastName, designation, idCardType, institute, eventId, eventName , email)
        // Validate the required fields
        if (!firstName || !lastName || !eventId ) {
            return res.status(400).json({ error: 'Missing required fields' });
        }


        // Generate unique participantId
        const participantId = await generateUniqueParticipantId();

        // Parse amenities JSON string to an object
        let amenitiesObject = {};
        try {
            amenitiesObject = amenities ? JSON.parse(amenities) : {};
        } catch (parseError) {
            console.error('Error parsing amenities JSON:', parseError);
            return res.status(400).json({ error: 'Invalid amenities format' });
        }

        // Create a new participant object
        const participant = new Participant({
            participantId,
            firstName,
            lastName,
            designation,
            idCardType,
            institute,
            email,
            backgroundImage, // URL to background image from request body
            profilePicture, // URL to profile picture on S3
            eventId,
            eventName,
            amenities: amenitiesObject // Assign parsed amenities object
        });

        // Save participant to database
        const savedParticipant = await participant.save();

        // Send back the saved participant object
        res.status(201).json(savedParticipant);
    } catch (error) {
        // Handle errors
        console.error('Error in creating participant:', error);
        res.status(400).json({ error: 'Failed to create participant', details: error.message });
    }
});
router.get('/form-url', verifyToken, (req, res) => {
    res.status(200).json({ 
        message: 'Form can be accessed', 
        eventId: req.eventId, 
        eventName: req.eventName 
    });
});

router.post('/generate-token', async (req, res) => {
    const { eventId, eventName } = req.body;

    if (!eventId || !eventName) {
        return res.status(400).json({ error: 'Event ID and Event Name are required' });
    }

    try {
        // Generate token
        const token = jwt.sign({ eventId, eventName }, SECRET_KEY, { expiresIn: '1h' });

        // Save token to database
        const newToken = new Token({ token, eventId, eventName });
        await newToken.save();

        res.json({ token });
    } catch (error) {
        console.error('Error generating token:', error);
        res.status(500).json({ error: 'Failed to generate token' });
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
router.patch('/unarchive/:id', async (req, res) => {
    const updates = { archive: false }; // Set archive to true to archive the participant

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
router.get('/participentarchive/:eventId', async (req, res) => {
    const eventId = req.params.eventId;

    try {
        const participants = await Participant.find({ eventId, archive: true }); // Filter participants by eventId and archive status
        res.status(200).send(participants);
    } catch (error) {
        res.status(500).send(error);
    }
});

router.get('/participant/:id', async (req, res) => {
    const id = req.params.id;

    try {
        const participant = await Participant.findById(id);
        if (participant) {
            res.status(200).send(participant);
        } else {
            res.status(404).send({ message: 'Participant not found' });
        }
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

// New route to update amenities by participantId
router.put('/participant/:id/amenities', async (req, res) => {
    const { id } = req.params;
    const { amenities } = req.body;

    try {
        const updatedParticipant = await Participant.findByIdAndUpdate(
            id,
            { $set: { amenities } },
            { new: true }
        );
        if (updatedParticipant) {
            res.status(200).send(updatedParticipant);
        } else {
            res.status(404).send({ message: 'Participant not found' });
        }
    } catch (error) {
        res.status(500).send({ error: 'Error updating participant amenities', details: error.message });
    }
});


router.put('/participant/:id', upload.single('profilePicture'), async (req, res) => {
    const { id } = req.params;
    const {
        firstName,
        lastName,
        designation,
        idCardType,
        institute,
        eventId,
        eventName,
        backgroundImage,
        amenities
    } = req.body;

    const profilePicture = req.file ? req.file.location : null;

    try {
        // Find the participant to get current values
        const existingParticipant = await Participant.findById(id);

        if (!existingParticipant) {
            return res.status(404).send({ message: 'Participant not found' });
        }

        // Prepare the updates object with existing values where necessary
        const updates = {
            ...(firstName !== undefined && { firstName }),
            ...(lastName !== undefined && { lastName }),
            ...(designation !== undefined && { designation }),
            ...(idCardType !== undefined && { idCardType }),
            ...(institute !== undefined && { institute }),
            ...(eventId !== undefined && { eventId }),
            ...(eventName !== undefined && { eventName }),
            ...(backgroundImage !== undefined && { backgroundImage }),
            ...(amenities !== undefined && { amenities }),
            ...(profilePicture && { profilePicture }) // Only add if profilePicture is available
        };

        const updatedParticipant = await Participant.findByIdAndUpdate(id, { $set: updates }, { new: true });

        res.status(200).send(updatedParticipant);
    } catch (error) {
        res.status(500).send({ error: 'Error updating participant', details: error.message });
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

router.get('/design/:eventId', async (req, res) => {
    try {
      const design = await idCardDesignSchema.findOne({ eventId: req.params.eventId });
      if (!design) {
        return res.status(404).json({ message: 'Design settings not found for this event' });
      }
      res.json(design);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
  
  // Create or update design settings for an event
  router.post('/design/:eventId', async (req, res) => {
    try {
      let design = await idCardDesignSchema.findOne({ eventId: req.params.eventId });
      if (design) {
        design.visibility = req.body.visibility;
        design.backgroundColor = req.body.backgroundColor;
        design.textColor = req.body.textColor;
        design.elementStyles = req.body.elementStyles;
      } else {
        design = new idCardDesignSchema({
          eventId: req.params.eventId,
          visibility: req.body.visibility,
          backgroundColor: req.body.backgroundColor,
          textColor: req.body.textColor,
          elementStyles: req.body.elementStyles
        });
      }
      await design.save();
      res.json(design);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });


module.exports = router;
