const express = require('express');
const router = express.Router();
const db = require('../services/database');
const { authenticate } = require('../middleware/auth');

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

/**
 * POST /api/auth/google
 * Handle Google Sign In user sync
 */
router.post('/google', async (req, res) => {
  try {
    const { user_id, email, name, picture, id_token } = req.body;

    if (!user_id || !id_token) {
      return res.status(400).json({ 
        error: 'user_id and id_token are required' 
      });
    }

    console.log(`🔵 Google auth sync for user: ${user_id}`);

    // TODO: Verify Google ID token here in production
    // For now, we'll trust the client-side verification
    
    // Create or get user
    const user = await db.getOrCreateUser(user_id);
    
    // Optionally update user profile with Google data
    if (name || picture) {
      try {
        await db.supabase
          .from('app_users')
          .update({
            name: name || user.name,
            avatar_url: picture || user.avatar_url,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user_id);
      } catch (updateError) {
        console.warn('Failed to update user profile:', updateError);
        // Don't fail the auth if profile update fails
      }
    }

    console.log(`✅ Google user synced: ${user.id}`);

    res.json({
      success: true,
      message: 'Google user synced successfully',
      user_id: user.id
    });

  } catch (error) {
    console.error('Google auth sync error:', error);
    res.status(500).json({
      error: 'Failed to sync Google user',
      details: error.message
    });
  }
});

/**
 * POST /api/auth/add-experience
 * Add experience to player and update level
 */
router.post('/add-experience', authenticate, async (req, res) => {
  try {
    const { experience } = req.body;
    const userId = req.user.id;

    if (!experience || experience < 0) {
      return res.status(400).json({ 
        error: 'Valid experience amount is required' 
      });
    }

    // Get current user data
    const { data: user, error: fetchError } = await db.supabase
      .from('app_users')
      .select('experience, level')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching user:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    const currentExperience = user.experience || 0;
    const newExperience = currentExperience + experience;
    const newLevel = Math.max(1, Math.floor(Math.sqrt(newExperience / 100)) + 1);

    // Update user experience and level
    const { error: updateError } = await db.supabase
      .from('app_users')
      .update({ 
        experience: newExperience,
        level: newLevel
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user experience:', updateError);
      return res.status(500).json({ error: 'Failed to update experience' });
    }

    res.json({
      success: true,
      experienceAdded: experience,
      newExperience: newExperience,
      newLevel: newLevel,
      leveledUp: newLevel > (user.level || 1)
    });

  } catch (error) {
    console.error('Error adding experience:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;