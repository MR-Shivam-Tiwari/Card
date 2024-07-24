// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const eventRouter = require('./routes/events');
const participantRouter = require('./routes/participants'); // make sure to change the name for clarity
const userRoutes  = require('./routes/user'); // make sure to change the name for clarity
const app = express();

app.use(cors({
    origin: '*', // Allows all origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
}));

// Configure body-parser with a larger limit
app.use(bodyParser.json({ limit: '50mb' })); // Adjust limit as needed
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Multer setup with file size limit
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('MongoDB connected');
})
.catch(err => console.log(err));

app.use('/api/users', userRoutes);
app.use('/api/events', eventRouter);
app.use('/api/participants', participantRouter);
app.use("/", (req, res) => { 
    res.send("Hello Shivam")
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
