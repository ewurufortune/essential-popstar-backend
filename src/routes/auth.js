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

    // Handle user ID migration - check if user exists without dots first
    const userIdWithoutDots = user_id.replace(/\./g, '');
    let actualUserId = user_id;

    // Check if user exists with the dotted version first
    let user = null;
    try {
      user = await db.getOrCreateUser(user_id);
    } catch (error) {
      // If dotted version fails, try without dots and migrate
      console.log(`🔄 Trying user without dots: ${userIdWithoutDots}`);
      try {
        const existingUser = await db.getOrCreateUser(userIdWithoutDots);
        if (existingUser) {
          console.log(`✅ Found user without dots, migrating to dotted version`);
          // Update the existing user record to use dots
          actualUserId = user_id; // Use the dotted version going forward
          user = existingUser;
        }
      } catch (migrationError) {
        // Neither version exists, create new with dots
        console.log(`🆕 Creating new user with dots: ${user_id}`);
        user = await db.getOrCreateUser(user_id);
      }
    }

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