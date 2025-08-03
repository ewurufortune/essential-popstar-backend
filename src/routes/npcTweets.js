const express = require('express');
const router = express.Router();
const { generateAndStoreNPCTweets, NPC_ACCOUNTS } = require('../services/npcTweetsService');

/**
 * Generate NPC tweets based on game context
 * POST /api/npc-tweets/generate
 */
router.post('/generate', async (req, res) => {
  try {
    const { userId, context } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    if (!context) {
      return res.status(400).json({
        success: false,
        error: 'Game context is required'
      });
    }

    const result = await generateAndStoreNPCTweets(userId, context);

    res.json(result);
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
    const accounts = NPC_ACCOUNTS.map(account => ({
      id: account.id,
      username: account.username,
      name: account.name,
      topic: account.topic,
      avatar: account.avatar
    }));

    res.json({
      success: true,
      accounts: accounts
    });
  } catch (error) {
    console.error('Error fetching NPC accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch NPC accounts'
    });
  }
});

module.exports = router;