const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const { authenticate } = require('../middleware/auth');

// Generate AI tweet
router.post('/generate-tweet', authenticate, async (req, res) => {
  try {
    const { context, userInput } = req.body;
    const userId = req.user.id; // Get from authenticated user

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
router.get('/power', authenticate, async (req, res) => {
  try {
    const userId = req.user.id; // Get from authenticated user

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

// Generate AI comments for a tweet
router.post('/generate-comments', authenticate, async (req, res) => {
  try {
    const { tweet, context } = req.body;
    const userId = req.user.id; // Get from authenticated user

    if (!tweet || !tweet.content) {
      return res.status(400).json({ error: 'Tweet content is required' });
    }

    // Check if AI service is available
    if (!aiService.isAvailable()) {
      return res.status(503).json({ 
        error: 'AI service is currently unavailable',
        fallback: true 
      });
    }

    // Check user power for generating comments (costs 1 power)
    const powerCheck = await aiService.checkPowerForAI(userId, 1);
    if (!powerCheck.hasEnoughPower) {
      return res.status(402).json({ 
        error: 'Insufficient power for AI comment generation',
        currentPower: powerCheck.currentPower,
        requiredPower: powerCheck.requiredPower
      });
    }

    // Generate 8 comments for the tweet
    const comments = await aiService.generateCommentsForTweet(tweet, context);

    // Deduct power after successful generation
    const newPowerAmount = await aiService.deductPowerForAI(userId, 1);

    res.json({
      success: true,
      comments: comments,
      count: comments.length,
      currentPower: newPowerAmount
    });

  } catch (error) {
    console.error('Error generating AI comments:', error);
    
    res.status(500).json({ 
      error: 'Failed to generate AI comments',
      fallback: true 
    });
  }
});

// Generate AI event narrative
router.post('/generate-event-narrative', authenticate, async (req, res) => {
  try {
    const { event, attendeeNPCs, player, context } = req.body;
    const userId = req.user.id; // Get from authenticated user

    if (!event || !attendeeNPCs || !player) {
      return res.status(400).json({ error: 'Event details, attendee NPCs, and player info are required' });
    }

    // Check if AI service is available
    if (!aiService.isAvailable()) {
      return res.status(503).json({ 
        error: 'AI service is currently unavailable',
        fallback: true 
      });
    }

    // Check user power
    const powerCheck = await aiService.checkPowerForAI(userId, 1);
    if (!powerCheck.hasEnoughPower) {
      return res.status(402).json({ 
        error: 'Insufficient power for AI generation',
        currentPower: powerCheck.currentPower,
        requiredPower: powerCheck.requiredPower
      });
    }

    // Generate the narrative
    const narrative = await aiService.generateEventNarrative(event, attendeeNPCs, player, context);

    // Deduct power after successful generation
    const newPowerAmount = await aiService.deductPowerForAI(userId, 1);

    res.json({
      success: true,
      narrative: narrative,
      currentPower: newPowerAmount
    });

  } catch (error) {
    console.error('Error generating AI event narrative:', error);
    res.status(500).json({ 
      error: 'Failed to generate AI event narrative',
      fallback: true 
    });
  }
});

// Generate AI response options
router.post('/generate-response-options', authenticate, async (req, res) => {
  try {
    const { event, attendeeNPCs, player, narrative, turnNumber, conversationHistory } = req.body;
    const userId = req.user.id; // Get from authenticated user

    if (!event || !attendeeNPCs || !player || !narrative) {
      return res.status(400).json({ error: 'Event details, attendee NPCs, player info, and narrative are required' });
    }

    // Check if AI service is available
    if (!aiService.isAvailable()) {
      return res.status(503).json({ 
        error: 'AI service is currently unavailable',
        fallback: true 
      });
    }

    // Generate response options
    const options = await aiService.generateResponseOptions(event, attendeeNPCs, player, narrative, turnNumber, conversationHistory);

    res.json({
      success: true,
      options: options
    });

  } catch (error) {
    console.error('Error generating AI response options:', error);
    res.status(500).json({ 
      error: 'Failed to generate AI response options',
      fallback: true 
    });
  }
});

// Generate AI response to player action
router.post('/generate-ai-response', authenticate, async (req, res) => {
  try {
    const { event, attendeeNPCs, player, playerResponse, turnNumber, conversationHistory } = req.body;
    const userId = req.user.id; // Get from authenticated user

    if (!event || !attendeeNPCs || !player || !playerResponse) {
      return res.status(400).json({ error: 'Event details, attendee NPCs, player info, and player response are required' });
    }

    // Check if AI service is available
    if (!aiService.isAvailable()) {
      return res.status(503).json({ 
        error: 'AI service is currently unavailable',
        fallback: true 
      });
    }

    // Check user power
    const powerCheck = await aiService.checkPowerForAI(userId, 1);
    if (!powerCheck.hasEnoughPower) {
      return res.status(402).json({ 
        error: 'Insufficient power for AI generation',
        currentPower: powerCheck.currentPower,
        requiredPower: powerCheck.requiredPower
      });
    }

    // Generate AI response
    const aiResponse = await aiService.generateAIEventResponse(event, attendeeNPCs, player, playerResponse, turnNumber, conversationHistory);

    // Deduct power after successful generation
    const newPowerAmount = await aiService.deductPowerForAI(userId, 1);

    res.json({
      success: true,
      narrative: aiResponse.narrative,
      options: aiResponse.options,
      currentPower: newPowerAmount
    });

  } catch (error) {
    console.error('Error generating AI event response:', error);
    res.status(500).json({ 
      error: 'Failed to generate AI event response',
      fallback: true 
    });
  }
});

// Analyze conversation for relationship impact
router.post('/analyze-conversation', authenticate, async (req, res) => {
  try {
    const { conversationHistory, event, attendeeNPCs, player } = req.body;
    const userId = req.user.id; // Get from authenticated user

    if (!conversationHistory || !event || !attendeeNPCs || !player) {
      return res.status(400).json({ error: 'Conversation history, event details, attendee NPCs, and player info are required' });
    }

    // Check if AI service is available
    if (!aiService.isAvailable()) {
      return res.status(503).json({ 
        error: 'AI service is currently unavailable',
        fallback: true 
      });
    }

    // Check user power for conversation analysis (costs 1 power)
    const powerCheck = await aiService.checkPowerForAI(userId, 1);
    if (!powerCheck.hasEnoughPower) {
      return res.status(402).json({ 
        error: 'Insufficient power for AI conversation analysis',
        currentPower: powerCheck.currentPower,
        requiredPower: powerCheck.requiredPower
      });
    }

    // Analyze conversation for relationship impact
    const analysis = await aiService.analyzeConversationImpact(conversationHistory, event, attendeeNPCs, player);

    // Deduct power after successful analysis
    const newPowerAmount = await aiService.deductPowerForAI(userId, 1);

    res.json({
      success: true,
      analysis: analysis,
      currentPower: newPowerAmount
    });

  } catch (error) {
    console.error('Error analyzing conversation:', error);
    
    // Handle specific error types
    if (error.message === 'Insufficient power') {
      return res.status(402).json({ 
        error: 'Insufficient power for AI conversation analysis',
        currentPower: 0 
      });
    }

    if (error.message === 'Failed to analyze conversation impact') {
      return res.status(503).json({ 
        error: 'AI service temporarily unavailable',
        fallback: true 
      });
    }

    res.status(500).json({ 
      error: 'Failed to analyze conversation',
      fallback: true 
    });
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