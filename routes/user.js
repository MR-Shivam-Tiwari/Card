const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // Import JWT library
const User = require('../models/User');

require('dotenv').config(); // Load environment variables

const router = express.Router();

// Get the secret key from environment variables or use a default value
const SECRET_KEY = process.env.SECRET_KEY || 'default_secret_key';

// Signup Route
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({ email, password });
    await user.save();

    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    console.error(err.message); // Debug log
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    console.log(`User found: ${user}`); // Debug log
    if (!user) {
      console.log('User not found');
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`Password match: ${isMatch}`); // Debug log
    if (!isMatch) {
      console.log('Password does not match');
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: '1h' });
    console.log(`Generated token: ${token}`); // Debug log

    res.status(200).json({ message: 'Login successful', email: user.email, token });
  } catch (err) {
    console.error(err.message); // Debug log
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
