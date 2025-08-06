const express = require('express');
const router = express.Router();
const database = require('../services/database');
const { authenticate } = require('../middleware/auth');

// Follow an NPC
router.post('/follow', authenticate, async (req, res) => {
  try {
    const { npcId, npcData } = req.body;
    const userId = req.user.id; // Get from authenticated user

    if (!npcId) {
      return res.status(400).json({ error: 'NPC ID is required' });
    }

    // User data already available from authentication middleware
    const user = req.user;

    const currentFollows = user.followed_npc_ids || [];

    // Check if already following
    if (currentFollows.includes(npcId)) {
      return res.status(400).json({ error: 'Already following this NPC' });
    }

    // Check follow limit
    if (currentFollows.length >= user.max_follows) {
      return res.status(400).json({ 
        error: `Follow limit reached (${user.max_follows}). Level up to follow more NPCs!`,
        maxFollows: user.max_follows,
        currentCount: currentFollows.length,
        currentLevel: user.level,
        nextLevelAt: user.level * user.level * 100 // Experience needed for next level
      });
    }

    // Add NPC to database profiles if npcData is provided
    if (npcData) {
      console.log(`[FOLLOW] Storing NPC profile for ${npcData.name} (ID: ${npcId})`);
      const { error: upsertError } = await database.supabase
        .from('npc_profiles')
        .upsert({
          id: npcId,
          name: npcData.name,
          age_in_2024: npcData.ageIn2024,
          pronoun: npcData.pronoun,
          possessive: npcData.possessive,
          objective: npcData.objective,
          fans: npcData.fans,
          genre: npcData.genre,
          country: npcData.country,
          awards: npcData.awards || 0,
          nominations: npcData.nominations || 0,
          username: npcData.username || `@${npcData.name?.toLowerCase().replace(/\s+/g, '') || 'unknown'}`,
          twitter_bio: npcData.twitterbio || '',
          description: npcData.description || '',
          currently_feeling: npcData.currentlyFeeling || 'neutral',
          your_relationship: npcData.yourRelationship || 'stranger',
          relationship_score: npcData.relationshipScore || 0,
          is_verified: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (upsertError) {
        console.warn('Warning: Could not save NPC profile:', upsertError);
        // Continue anyway - the follow can still work
      } else {
        console.log(`[FOLLOW] Successfully stored NPC profile for ${npcData.name}`);
      }
    } else {
      console.warn(`[FOLLOW] No NPC data provided for ${npcId}, only storing ID`);
    }

    // Add NPC to followed list
    const updatedFollows = [...currentFollows, npcId];

    const { error: updateError } = await database.supabase
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
router.post('/unfollow', authenticate, async (req, res) => {
  try {
    const { npcId } = req.body;
    const userId = req.user.id; // Get from authenticated user

    if (!npcId) {
      return res.status(400).json({ error: 'NPC ID is required' });
    }

    // User data already available from authentication middleware
    const user = req.user;

    const currentFollows = user.followed_npc_ids || [];

    // Check if actually following
    if (!currentFollows.includes(npcId)) {
      return res.status(400).json({ error: 'Not following this NPC' });
    }

    // Remove NPC from followed list
    const updatedFollows = currentFollows.filter(id => id !== npcId);

    const { error: updateError } = await database.supabase
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

    // Ensure user exists and get their data
    const user = await database.getOrCreateUser(userId);

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

/**
 * Get user's followed NPCs with full details
 * GET /api/follows/followed
 */
router.get('/followed', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's followed NPC IDs
    const user = req.user;
    const followedIds = user.followed_npc_ids || [];

    if (followedIds.length === 0) {
      return res.json({
        success: true,
        followedNPCs: [],
        count: 0
      });
    }

    // Get full NPC details from npc_profiles
    const { data: npcData, error: npcError } = await database.supabase
      .from('npc_profiles')
      .select('*')
      .in('id', followedIds);

    if (npcError) {
      console.error('Error fetching NPCs:', npcError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch NPC details'
      });
    }

    res.json({
      success: true,
      followedNPCs: npcData || [],
      count: npcData?.length || 0
    });

  } catch (error) {
    console.error('Error getting followed NPCs:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Update NPC relationship (for use by relationship system)
 * POST /api/follows/update-relationship
 */
router.post('/update-relationship', authenticate, async (req, res) => {
  try {
    const { npcId, relationshipChange, newFeeling, newRelationship } = req.body;
    const userId = req.user.id;

    if (!npcId) {
      return res.status(400).json({
        success: false,
        error: 'NPC ID is required'
      });
    }

    // Use the database function to update relationship
    const { data: result, error: updateError } = await database.supabase
      .rpc('update_npc_relationship', {
        npc_id: npcId,
        score_change: relationshipChange || 0,
        feeling: newFeeling,
        relationship: newRelationship
      });

    if (updateError) {
      console.error('Error updating NPC relationship:', updateError);
      // Fallback to direct update if function fails
      const { error: directUpdateError } = await database.supabase
        .from('npc_profiles')
        .update({
          currently_feeling: newFeeling,
          your_relationship: newRelationship,
          relationship_score: database.supabase.raw(`GREATEST(-100, LEAST(100, COALESCE(relationship_score, 0) + ${relationshipChange || 0}))`),
          updated_at: new Date().toISOString()
        })
        .eq('id', npcId);

      if (directUpdateError) {
        console.error('Error with direct update:', directUpdateError);
        return res.status(500).json({
          success: false,
          error: 'Failed to update relationship'
        });
      }
    }

    res.json({
      success: true,
      result: result,
      message: 'Relationship updated successfully'
    });

  } catch (error) {
    console.error('Error updating NPC relationship:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Debug endpoint to check follow status and NPC profiles
 * GET /api/follows/debug
 */
router.get('/debug', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's follow data
    const user = req.user;
    
    // Get all NPC profiles
    const { data: allProfiles, error: profilesError } = await database.supabase
      .from('npc_profiles')
      .select('*');

    if (profilesError) {
      console.error('Error fetching all profiles:', profilesError);
    }

    // Get user's followed NPCs from profiles
    const { data: followedProfiles, error: followedError } = await database.supabase
      .from('npc_profiles')
      .select('*')
      .in('id', user.followed_npc_ids || []);

    if (followedError) {
      console.error('Error fetching followed profiles:', followedError);
    }

    res.json({
      success: true,
      debug: {
        userId: userId,
        level: user.level,
        maxFollows: user.max_follows,
        followedIds: user.followed_npc_ids || [],
        followedCount: (user.followed_npc_ids || []).length,
        totalNPCProfiles: allProfiles?.length || 0,
        followedNPCProfiles: followedProfiles || [],
        experienceNeededForNextLevel: (user.level + 1) * (user.level + 1) * 100
      }
    });

  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;