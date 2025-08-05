const express = require('express');
const router = express.Router();
const { supabase } = require('../services/database');

// Follow an NPC
router.post('/follow', async (req, res) => {
  try {
    const { userId, npcId } = req.body;

    if (!userId || !npcId) {
      return res.status(400).json({ error: 'User ID and NPC ID are required' });
    }

    // Get user's current data
    const { data: user, error: userError } = await supabase
      .from('app_users')
      .select('level, max_follows, followed_npc_ids')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentFollows = user.followed_npc_ids || [];

    // Check if already following
    if (currentFollows.includes(npcId)) {
      return res.status(400).json({ error: 'Already following this NPC' });
    }

    // Check follow limit
    if (currentFollows.length >= user.max_follows) {
      return res.status(400).json({ 
        error: 'Maximum follows reached',
        maxFollows: user.max_follows,
        currentCount: currentFollows.length
      });
    }

    // Add NPC to followed list
    const updatedFollows = [...currentFollows, npcId];

    const { error: updateError } = await supabase
      .from('app_users')
      .update({ followed_npc_ids: updatedFollows })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating follows:', updateError);
      return res.status(500).json({ error: 'Failed to update follows' });
    }

    res.json({
      success: true,
      message: 'Successfully followed NPC',
      followedNpcs: updatedFollows,
      currentCount: updatedFollows.length,
      maxFollows: user.max_follows
    });

  } catch (error) {
    console.error('Error following NPC:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unfollow an NPC
router.post('/unfollow', async (req, res) => {
  try {
    const { userId, npcId } = req.body;

    if (!userId || !npcId) {
      return res.status(400).json({ error: 'User ID and NPC ID are required' });
    }

    // Get user's current follows
    const { data: user, error: userError } = await supabase
      .from('app_users')
      .select('followed_npc_ids, max_follows')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentFollows = user.followed_npc_ids || [];

    // Check if actually following
    if (!currentFollows.includes(npcId)) {
      return res.status(400).json({ error: 'Not following this NPC' });
    }

    // Remove NPC from followed list
    const updatedFollows = currentFollows.filter(id => id !== npcId);

    const { error: updateError } = await supabase
      .from('app_users')
      .update({ followed_npc_ids: updatedFollows })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating follows:', updateError);
      return res.status(500).json({ error: 'Failed to update follows' });
    }

    res.json({
      success: true,
      message: 'Successfully unfollowed NPC',
      followedNpcs: updatedFollows,
      currentCount: updatedFollows.length,
      maxFollows: user.max_follows
    });

  } catch (error) {
    console.error('Error unfollowing NPC:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's follow status
router.get('/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const { data: user, error: userError } = await supabase
      .from('app_users')
      .select('level, max_follows, followed_npc_ids')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const followedNpcs = user.followed_npc_ids || [];

    res.json({
      success: true,
      followedNpcs: followedNpcs,
      currentCount: followedNpcs.length,
      maxFollows: user.max_follows,
      level: user.level
    });

  } catch (error) {
    console.error('Error getting follow status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;