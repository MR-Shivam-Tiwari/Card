const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Participant = require('../models/participant');
const multer = require('multer');
const multerS3 = require('multer-s3');
const s3Client = require('../config'); // Ensure this exports the S3 client

const bucketName = process.env.AWS_BUCKET_NAME;

const upload = multer({
    limits: { fileSize: 10 * 1024 * 1024 }, // Set file size limit to 10 MB
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

router.post('/', upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'idcardimage', maxCount: 1 }]), async (req, res) => {
    try {
        console.log("Request Body:", req.body);

        const { eventName, address, startDate, endDate, categories = '[]', amenities = '{}' } = req.body;

        console.log("Parsed Amenities:", amenities);

        // Process the uploaded files
        const photoFile = req.files['photo'] ? req.files['photo'][0] : null;
        const idcardimageFile = req.files['idcardimage'] ? req.files['idcardimage'][0] : null;

        const photoUrl = photoFile ? photoFile.location : null;
        const idcardimage = idcardimageFile ? idcardimageFile.location : null;

        // Parse amenities from JSON string to an object
        let amenitiesObject = {};
        try {
            amenitiesObject = JSON.parse(amenities);
        } catch (error) {
            console.error('Error parsing amenities JSON:', error);
        }

        // Parse categories from JSON string to an array
        let categoriesArray = [];
        try {
            categoriesArray = JSON.parse(categories);
        } catch (error) {
            console.error('Error parsing categories JSON:', error);
        }

        // Create a new event
        const newEvent = new Event({
            eventName,
            address,
            startDate,
            endDate,
            photoUrl,
            idcardimage,
            categories: categoriesArray,
            amenities: { ...amenitiesObject } // Store amenities as an object
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

        // Ensure amenities are serialized correctly
        const eventsWithCounts = await Promise.all(events.map(async (event) => {
            const participantCount = await Participant.countDocuments({ eventId: event._id });

            // Convert Mongoose Map to plain object
            const amenities = event.amenities ? Object.fromEntries(event.amenities) : {};

            return {
                ...event.toObject(),
                participantCount, // Add participant count to the event
                amenities // Include amenities
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
// Edit route to update an event by ID
router.patch('/edit/:id', upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'idcardimage', maxCount: 1 }]), async (req, res) => {
    try {
        // Retrieve the current event
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const { eventName, address, startDate, endDate, categories = '[]', amenities = '{}' } = req.body;

        // Process the uploaded files
        const photoFile = req.files['photo'] ? req.files['photo'][0] : null;
        const idcardimageFile = req.files['idcardimage'] ? req.files['idcardimage'][0] : null;

        const photoUrl = photoFile ? photoFile.location : event.photoUrl;
        const idcardimage = idcardimageFile ? idcardimageFile.location : event.idcardimage;

        // Parse amenities from JSON string to an object
        let amenitiesObject = event.amenities;
        try {
            const parsedAmenities = JSON.parse(amenities);
            if (parsedAmenities && typeof parsedAmenities === 'object') {
                amenitiesObject = { ...parsedAmenities };
            }
        } catch (error) {
            console.error('Error parsing amenities JSON:', error);
        }

        // Parse categories from JSON string to an array
        let categoriesArray = event.categories;
        try {
            const parsedCategories = JSON.parse(categories);
            if (Array.isArray(parsedCategories)) {
                categoriesArray = [...parsedCategories];
            }
        } catch (error) {
            console.error('Error parsing categories JSON:', error);
        }

        // Create an update object with only the fields provided
        const updateFields = {
            eventName: eventName || event.eventName,
            address: address || event.address,
            startDate: startDate || event.startDate,
            endDate: endDate || event.endDate,
            photoUrl,
            idcardimage,
            categories: categoriesArray,
            amenities: amenitiesObject
        };

        // Update the event with only the provided fields
        const updatedEvent = await Event.findByIdAndUpdate(req.params.id, updateFields, { new: true });

        res.json(updatedEvent);
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).send('Server error');
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
