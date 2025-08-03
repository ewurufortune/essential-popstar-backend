const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');

// Generate AI tweet
router.post('/generate-tweet', async (req, res) => {
  try {
    const { userId, context, userInput } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!context) {
      return res.status(400).json({ error: 'Game context is required' });
    }

    // Check if AI service is available
    if (!aiService.isAvailable()) {
      return res.status(503).json({ 
        error: 'AI service is currently unavailable',
        fallback: true 
      });
    }

    // Check user power
    const currentPower = await aiService.checkPowerForAI(userId);
    if (currentPower <= 0) {
      return res.status(402).json({ 
        error: 'Insufficient power for AI generation',
        currentPower: 0 
      });
    }

    // Generate the tweet
    const generatedTweet = await aiService.generateTweet(context, userInput);

    // Deduct power after successful generation
    const newPowerAmount = await aiService.deductPowerForAI(userId, 1);

    res.json({
      success: true,
      tweet: generatedTweet,
      currentPower: newPowerAmount
    });

  } catch (error) {
    console.error('Error generating AI tweet:', error);
    
    // Handle specific error types
    if (error.message === 'Insufficient power') {
      return res.status(402).json({ 
        error: 'Insufficient power for AI generation',
        currentPower: 0 
      });
    }

    if (error.message === 'Failed to generate AI content') {
      return res.status(503).json({ 
        error: 'AI service temporarily unavailable',
        fallback: true 
      });
    }

    res.status(500).json({ 
      error: 'Failed to generate AI content',
      fallback: true 
    });
  }
});

// Get user power status for AI
router.get('/power/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const currentPower = await aiService.checkPowerForAI(userId);

    res.json({
      success: true,
      currentPower,
      serviceAvailable: aiService.isAvailable()
    });

  } catch (error) {
    console.error('Error checking power for AI:', error);
    res.status(500).json({ error: 'Failed to check power status' });
  }
});

// Health check for AI service
router.get('/health', (req, res) => {
  res.json({
    available: aiService.isAvailable(),
    service: 'AI Tweet Generation',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;