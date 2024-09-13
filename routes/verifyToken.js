// middlewares/verifyToken.js
const jwt = require('jwt-simple');
const SECRET_KEY = 'your_secret_key_here'; // Replace with your own secret key

function verifyToken(req, res, next) {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.decode(token, SECRET_KEY);
        req.eventId = decoded.eventId;
        req.eventName = decoded.eventName;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Failed to authenticate token' });
    }
}

module.exports = verifyToken;
