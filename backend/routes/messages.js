import express from 'express';
import Message from '../models/Message.js';

const router = express.Router();

const ALLOWED_FIRST_MESSAGES = ['hi', 'hello', 'I need your help'];

router.post('/', async (req, res) => {
  try {
    const { senderId, recipientId, content } = req.body;
    
    // Check if there's any previous conversation
    const existingConversation = await Message.findOne({
      $or: [
        { sender: senderId, recipient: recipientId },
        { sender: recipientId, recipient: senderId }
      ]
    });

    if (!existingConversation) {
      // This is the first message
      if (!ALLOWED_FIRST_MESSAGES.includes(content.toLowerCase())) {
        return res.status(400).json({ 
          message: 'First message must be "hi", "hello", or "I need your help"' 
        });
      }
    }

    const message = new Message({
      sender: senderId,
      recipient: recipientId,
      content,
      isFirstMessage: !existingConversation,
      status: existingConversation ? 'accepted' : 'pending'
    });

    await message.save();
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Error sending message' });
  }
});

router.put('/:messageId/status', async (req, res) => {
  try {
    const { status } = req.body;
    const message = await Message.findByIdAndUpdate(
      req.params.messageId,
      { status },
      { new: true }
    );
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: 'Error updating message status' });
  }
});

router.get('/conversation/:userId1/:userId2', async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.params.userId1, recipient: req.params.userId2 },
        { sender: req.params.userId2, recipient: req.params.userId1 }
      ]
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

export default router;