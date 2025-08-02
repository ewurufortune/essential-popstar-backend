const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Create Supabase client with service key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Service key bypasses RLS
);

/**
 * Middleware to get user ID from headers
 */
const getUserId = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(400).json({ error: 'x-user-id header is required' });
  }
  req.userId = userId;
  next();
};

/**
 * GET /api/referrals/code
 * Get or create user's referral code
 */
router.get('/code', getUserId, async (req, res) => {
  try {
    const { userId } = req;
    console.log(`🔗 Getting referral code for user: ${userId}`);

    // Use the SQL function to get or create referral code
    const { data: code, error } = await supabase
      .rpc('create_referral_code', { user_id: userId });

    if (error) throw error;

    console.log(`✅ Referral code: ${code}`);

    res.json({
      success: true,
      code: code
    });

  } catch (error) {
    console.error('Get referral code error:', error);
    res.status(500).json({
      error: 'Failed to get referral code',
      details: error.message
    });
  }
});

/**
 * POST /api/referrals/claim
 * Process referral code usage
 */
router.post('/claim', getUserId, async (req, res) => {
  try {
    const { userId } = req;
    const { referral_code } = req.body;

    if (!referral_code) {
      return res.status(400).json({ error: 'referral_code is required' });
    }

    console.log(`🎁 Processing referral claim: ${referral_code} for user: ${userId}`);

    // Use the SQL function to process referral claim
    const { data: result, error } = await supabase
      .rpc('process_referral_claim', {
        referral_code_input: referral_code.toUpperCase(),
        referred_user_id: userId,
        ip_addr: req.ip,
        user_agent_input: req.get('User-Agent')
      });

    if (error) throw error;

    if (!result.success) {
      return res.status(400).json({
        error: result.error
      });
    }

    console.log(`✅ Referral claim processed: ${result.message}`);

    res.json({
      success: true,
      message: result.message,
      referrer_id: result.referrer_id,
      reward_amount: result.reward_amount
    });

  } catch (error) {
    console.error('Process referral claim error:', error);
    res.status(500).json({
      error: 'Failed to process referral claim',
      details: error.message
    });
  }
});

/**
 * GET /api/referrals/stats
 * Get referral statistics for user
 */
router.get('/stats', getUserId, async (req, res) => {
  try {
    const { userId } = req;
    console.log(`📊 Getting referral stats for user: ${userId}`);

    // Get referral claims where user is the referrer
    const { data: claims, error: claimsError } = await supabase
      .from('referral_claims')
      .select('*')
      .eq('referrer_id', userId);

    if (claimsError) throw claimsError;

    // Get referral rewards for user
    const { data: rewards, error: rewardsError } = await supabase
      .from('referral_rewards')
      .select('reward_amount')
      .eq('referrer_id', userId);

    if (rewardsError) throw rewardsError;

    const stats = {
      totalReferred: claims?.length || 0,
      totalRewards: rewards?.reduce((sum, reward) => sum + reward.reward_amount, 0) || 0,
      pendingRewards: claims?.filter(claim => !claim.reward_issued).length || 0
    };

    console.log(`✅ Referral stats: ${JSON.stringify(stats)}`);

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('Get referral stats error:', error);
    res.status(500).json({
      error: 'Failed to get referral stats',
      details: error.message
    });
  }
});

module.exports = router;