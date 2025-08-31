const express = require('express');
const router = express.Router();
const { generateAndStoreNPCTweets, getPredefinedAccounts, PLAYER_FOCUSED_ACCOUNT_TYPES, generatePlayerTweetReactions } = require('../services/npcTweetsService');
const aiService = require('../services/aiService');
const { authenticate } = require('../middleware/auth');

/**
 * Generate NPC tweets based on game context
 * POST /api/npc-tweets/generate
 */
router.post('/generate', authenticate, async (req, res) => {
  try {
    const { context } = req.body;
    const userId = req.user.id; // Get from authenticated user

    if (!context) {
      return res.status(400).json({
        success: false,
        error: 'Game context is required'
      });
    }

    // Check if user has enough power for AI generation (1 power required)
    const powerCheck = await aiService.checkPowerForAI(userId);
    if (!powerCheck.hasEnoughPower) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient power for AI generation',
        currentPower: powerCheck.currentPower,
        requiredPower: powerCheck.requiredPower
      });
    }

    // Deduct power before generating tweets
    await aiService.deductPowerForAI(userId, 1);

    const result = await generateAndStoreNPCTweets(userId, context);

    res.json({
      ...result,
      powerDeducted: 1,
      remainingPower: powerCheck.currentPower - 1
    });
  } catch (error) {
    console.error('Error generating NPC tweets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate NPC tweets'
    });
  }
});

/**
 * Get available NPC accounts
 * GET /api/npc-tweets/accounts
 */
router.get('/accounts', (req, res) => {
  try {
    const PREDEFINED_ACCOUNTS = getPredefinedAccounts();
    const predefinedAccounts = PREDEFINED_ACCOUNTS.map(account => ({
      id: account.id,
      username: account.username,
      name: account.name,
      topic: account.topic,
      avatar: account.avatar,
      type: 'predefined'
    }));

    const playerFocusedTypes = PLAYER_FOCUSED_ACCOUNT_TYPES.map(accountType => ({
      type: accountType.type,
      personality: accountType.personality,
      topics: accountType.topics,
      category: 'player-focused'
    }));

    res.json({
      success: true,
      predefinedAccounts: predefinedAccounts,
      playerFocusedTypes: playerFocusedTypes
    });
  } catch (error) {
    console.error('Error fetching NPC accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch NPC accounts'
    });
  }
});

/**
 * Generate reactions to player tweets
 * POST /api/npc-tweets/generate-reactions
 */
router.post('/generate-reactions', authenticate, async (req, res) => {
  try {
    const { playerTweet, context } = req.body;
    const userId = req.user.id;

    if (!playerTweet || !context) {
      return res.status(400).json({
        success: false,
        error: 'Player tweet and context are required'
      });
    }

    // Check if user has enough power for AI generation (1 power required)
    const powerCheck = await aiService.checkPowerForAI(userId);
    if (!powerCheck.hasEnoughPower) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient power for AI generation',
        currentPower: powerCheck.currentPower,
        requiredPower: powerCheck.requiredPower
      });
    }

    // Deduct power before generating reactions
    await aiService.deductPowerForAI(userId, 1);

    const result = await generatePlayerTweetReactions(playerTweet, context);

    res.json({
      ...result,
      powerDeducted: 1,
      remainingPower: powerCheck.currentPower - 1
    });
  } catch (error) {
    console.error('Error generating tweet reactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate tweet reactions'
    });
  }
});

module.exports = router;