const express = require('express');
const router = express.Router();
const database = require('../services/database');
const { canAffordAction } = require('../utils/powerCalculator');

/**
 * GET /me/power
 * Returns current power status for the user
 */
router.get('/me/power', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(400).json({
        error: 'Missing x-user-id header'
      });
    }

    // Ensure user exists
    await database.getOrCreateUser(userId);
    
    // Get current power info
    const powerInfo = await database.getCurrentPower(userId);
    
    res.json({
      success: true,
      data: {
        current: powerInfo.current,
        max: powerInfo.maxPower,
        nextRefillInSeconds: powerInfo.nextRefillInSeconds,
        refillAmount: powerInfo.refillAmount,
        refillIntervalMinutes: powerInfo.refillIntervalMinutes,
        lastUpdate: powerInfo.lastUpdate
      }
    });

  } catch (error) {
    console.error('Get power error:', error);
    res.status(500).json({
      error: 'Failed to get power status',
      message: error.message
    });
  }
});

/**
 * POST /me/power/spend
 * Spend power for an action
 */
router.post('/me/power/spend', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { cost, reason } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        error: 'Missing x-user-id header'
      });
    }

    if (!cost || !reason) {
      return res.status(400).json({
        error: 'Missing required fields: cost, reason'
      });
    }

    if (typeof cost !== 'number' || cost <= 0) {
      return res.status(400).json({
        error: 'Cost must be a positive number'
      });
    }

    // Get current power
    const currentPowerInfo = await database.getCurrentPower(userId);
    
    // Check if user can afford the action
    if (!canAffordAction(currentPowerInfo.current, cost)) {
      return res.status(400).json({
        error: 'Insufficient power',
        current: currentPowerInfo.current,
        required: cost
      });
    }

    // Spend the power
    const result = await database.spendPower(userId, cost, `spend:${reason}`);
    
    // Get updated power info
    const updatedPowerInfo = await database.getCurrentPower(userId);

    res.json({
      success: true,
      data: {
        current: updatedPowerInfo.current,
        max: updatedPowerInfo.maxPower,
        spent: cost,
        reason: reason,
        nextRefillInSeconds: updatedPowerInfo.nextRefillInSeconds
      }
    });

  } catch (error) {
    console.error('Spend power error:', error);
    res.status(500).json({
      error: 'Failed to spend power',
      message: error.message
    });
  }
});

/**
 * GET /me/power/history
 * Get power transaction history
 */
router.get('/me/power/history', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const limit = parseInt(req.query.limit) || 50;
    
    if (!userId) {
      return res.status(400).json({
        error: 'Missing x-user-id header'
      });
    }

    const history = await database.getPowerHistory(userId, Math.min(limit, 100));
    
    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('Get power history error:', error);
    res.status(500).json({
      error: 'Failed to get power history',
      message: error.message
    });
  }
});

module.exports = router;