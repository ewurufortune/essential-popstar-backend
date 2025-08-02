const express = require('express');
const router = express.Router();
const db = require('../services/database');

/**
 * POST /api/auth/apple
 * Handle Apple Sign In user sync
 */
router.post('/apple', async (req, res) => {
  try {
    const { user_id, email, name, identity_token } = req.body;

    if (!user_id) {
      return res.status(400).json({ 
        error: 'user_id is required' 
      });
    }

    console.log(`🍎 Apple auth sync for user: ${user_id}`);

    // Create or update user in app_users table
    const user = await db.getOrCreateUser(user_id);

    console.log(`✅ Apple user synced: ${user.id}`);

    res.json({
      success: true,
      message: 'Apple user synced successfully',
      user_id: user.id
    });

  } catch (error) {
    console.error('Apple auth sync error:', error);
    res.status(500).json({
      error: 'Failed to sync Apple user',
      details: error.message
    });
  }
});

module.exports = router;