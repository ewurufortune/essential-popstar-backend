const express = require('express');
const router = express.Router();
const database = require('../services/database');

/**
 * Simple admin authentication middleware
 * In production, replace with proper authentication
 */
const requireAdmin = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_KEY || 'admin_key_change_me';
  
  if (adminKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

/**
 * GET /admin/power/config
 * Get current power configuration
 */
router.get('/power/config', requireAdmin, async (req, res) => {
  try {
    const config = await database.getPowerConfig();
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({
      error: 'Failed to get power configuration',
      message: error.message
    });
  }
});

/**
 * PUT /admin/power/config
 * Update power configuration
 */
router.put('/power/config', requireAdmin, async (req, res) => {
  try {
    const updates = req.body;
    
    // Validate the updates
    const allowedFields = ['max_power', 'refill_amount', 'refill_interval_minutes'];
    const filteredUpdates = {};
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        const value = parseInt(updates[field]);
        if (isNaN(value) || value < 0) {
          return res.status(400).json({
            error: `Invalid value for ${field}: must be a non-negative integer`
          });
        }
        filteredUpdates[field] = value;
      }
    }
    
    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update',
        allowedFields
      });
    }
    
    const updatedConfig = await database.updatePowerConfig(filteredUpdates);
    
    res.json({
      success: true,
      data: updatedConfig,
      message: 'Power configuration updated successfully'
    });
    
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({
      error: 'Failed to update power configuration',
      message: error.message
    });
  }
});

/**
 * POST /admin/power/grant
 * Manually grant power to a user (admin action)
 */
router.post('/power/grant', requireAdmin, async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;
    
    if (!userId || !amount || !reason) {
      return res.status(400).json({
        error: 'Missing required fields: userId, amount, reason'
      });
    }
    
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        error: 'Amount must be a positive number'
      });
    }
    
    const result = await database.grantPower(
      userId,
      amount,
      `admin:${reason}`,
      `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    );
    
    res.json({
      success: true,
      data: result,
      message: `Granted ${amount} power to user ${userId}`
    });
    
  } catch (error) {
    console.error('Admin grant power error:', error);
    res.status(500).json({
      error: 'Failed to grant power',
      message: error.message
    });
  }
});

/**
 * GET /admin/users/:userId/power
 * Get power status for any user
 */
router.get('/users/:userId/power', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const powerInfo = await database.getCurrentPower(userId);
    
    res.json({
      success: true,
      data: powerInfo
    });
    
  } catch (error) {
    console.error('Admin get user power error:', error);
    res.status(500).json({
      error: 'Failed to get user power',
      message: error.message
    });
  }
});

/**
 * GET /admin/users/:userId/power/history
 * Get power history for any user
 */
router.get('/users/:userId/power/history', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const history = await database.getPowerHistory(userId, Math.min(limit, 200));
    
    res.json({
      success: true,
      data: history
    });
    
  } catch (error) {
    console.error('Admin get user power history error:', error);
    res.status(500).json({
      error: 'Failed to get user power history',
      message: error.message
    });
  }
});

module.exports = router;