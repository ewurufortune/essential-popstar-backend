const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Create Supabase client with service key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Service key bypasses RLS
);

/**
 * Middleware to get user ID from headers and handle ID migration
 */
const getUserId = async (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(400).json({ error: 'x-user-id header is required' });
  }

  // Check if user exists in app_users table, try both with and without dots
  const userIdWithDots = userId;
  const userIdWithoutDots = userId.replace(/\./g, '');

  try {
    // First try with dots
    const { data: userWithDots } = await supabase
      .from('app_users')
      .select('id')
      .eq('id', userIdWithDots)
      .single();

    if (userWithDots) {
      req.userId = userIdWithDots;
      return next();
    }
  } catch (error) {
    // Ignore error, try without dots
  }

  try {
    // Try without dots
    const { data: userWithoutDots } = await supabase
      .from('app_users')
      .select('id')
      .eq('id', userIdWithoutDots)
      .single();

    if (userWithoutDots) {
      console.log(`🔄 Using user ID without dots: ${userIdWithoutDots}`);
      req.userId = userIdWithoutDots;
      return next();
    }
  } catch (error) {
    // Ignore error
  }

  // If neither exists, use the original ID (will be created if needed)
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

    // First check if user already has a code
    const { data: existingCode, error: fetchError } = await supabase
      .from('referral_codes')
      .select('code')
      .eq('user_id', userId)
      .single();

    if (existingCode) {
      console.log(`✅ Found existing referral code: ${existingCode.code}`);
      return res.json({
        success: true,
        code: existingCode.code
      });
    }

    // Try SQL function first
    try {
      const { data: functionCode, error: functionError } = await supabase
        .rpc('create_referral_code', { user_id: userId });

      if (functionCode && !functionError) {
        console.log(`✅ Created referral code via function: ${functionCode}`);
        return res.json({
          success: true,
          code: functionCode
        });
      }
    } catch (functionErr) {
      console.warn('SQL function failed, creating manually:', functionErr);
    }

    // Fallback: Create code manually
    console.log('🔄 Creating referral code manually...');
    
    // Generate a simple unique code
    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    let newCode = generateCode();
    let attempts = 0;
    
    // Ensure uniqueness
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from('referral_codes')
        .select('code')
        .eq('code', newCode)
        .single();

      if (!existing) {
        break; // Code is unique
      }
      
      newCode = generateCode();
      attempts++;
    }

    // Insert the new code
    const { data: insertedCode, error: insertError } = await supabase
      .from('referral_codes')
      .insert({ user_id: userId, code: newCode })
      .select('code')
      .single();

    if (insertError) throw insertError;

    console.log(`✅ Created referral code manually: ${newCode}`);

    res.json({
      success: true,
      code: newCode
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
 * GET /api/referrals/check-usage/:userId
 * Check if user has already used a referral code
 */
router.get('/check-usage/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`🔍 Checking referral usage for user: ${userId}`);

    // Check if user has already used a referral code
    const { data: existingClaim, error } = await supabase
      .from('referral_claims')
      .select('id, referral_code, created_at')
      .eq('referred_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const hasUsedReferral = !!existingClaim;
    console.log(`✅ User referral usage check: ${hasUsedReferral ? 'Used' : 'Not used'}`);

    res.json({
      success: true,
      hasUsedReferral,
      referralInfo: existingClaim || null
    });

  } catch (error) {
    console.error('Check referral usage error:', error);
    res.status(500).json({
      error: 'Failed to check referral usage',
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