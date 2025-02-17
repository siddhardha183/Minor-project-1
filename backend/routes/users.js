import express from 'express';
import User from '../models/User.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    const users = await User.find({
      registerNumber: { $regex: query, $options: 'i' }
    }, '-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error searching users' });
  }
});

export default router;