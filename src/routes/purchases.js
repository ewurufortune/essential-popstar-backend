const express = require('express');
const router = express.Router();
const database = require('../services/database');
const { verifyRevenueCatSignature } = require('../utils/revenueCatVerifier');

/**
 * GET /api/purchases/verify/:transactionId
 * Verify if a purchase has been processed and power granted
 */
router.get('/verify/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.headers['x-user-id']; // Get user ID from header

    if (!transactionId || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Transaction ID and User ID are required' 
      });
    }

    // Check if this transaction was processed
    const powerHistory = await database.getPowerHistory(userId, 50);

    // Look for this transaction in power history
    const transaction = powerHistory.find(entry => 
      entry.external_txn_id === transactionId ||
      entry.idempotency_key === transactionId
    );

    if (!transaction) {
      return res.status(200).json({
        success: false,
        status: 'not_found',
        message: 'Transaction not found or not yet processed'
      });
    }

    // Get current power
    const currentPower = await database.getCurrentPower(userId);

    // Return transaction status
    return res.status(200).json({
      success: true,
      status: 'completed',
      powerGranted: transaction.delta,
      currentPower: currentPower.current,
      maxPower: currentPower.max,
      transactionId: transaction.external_txn_id,
      processedAt: transaction.created_at
    });

  } catch (error) {
    console.error('Purchase verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to verify purchase'
    });
  }
});

/**
 * POST /api/purchases/verify
 * Alternative endpoint using RevenueCat receipt data
 */
router.post('/verify', async (req, res) => {
  try {
    const { transactionId, productIdentifier, appUserId } = req.body;

    console.log('🔍 Purchase verification request:', {
      transactionId,
      appUserId,
      productIdentifier
    });

    if (!transactionId || !appUserId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Transaction ID and User ID are required' 
      });
    }

    // Get user's current power
    const currentPower = await database.getCurrentPower(appUserId);
    
    // Get recent power history to find this transaction
    const powerHistory = await database.getPowerHistory(appUserId, 20);
    
    console.log('📜 Power history for user:', {
      userId: appUserId,
      historyCount: powerHistory.length,
      transactionIds: powerHistory.map(h => h.external_txn_id || h.idempotency_key)
    });

    // Look for the transaction
    const transaction = powerHistory.find(entry => 
      entry.external_txn_id === transactionId ||
      entry.idempotency_key === transactionId
    );

    if (!transaction) {
      return res.status(200).json({
        success: false,
        status: 'pending',
        message: 'Purchase not yet processed by webhook',
        currentPower: currentPower.current,
        maxPower: currentPower.max
      });
    }

    return res.status(200).json({
      success: true,
      status: 'completed',
      powerGranted: transaction.delta,
      currentPower: currentPower.current,
      maxPower: currentPower.max,
      transactionId: transaction.external_txn_id,
      processedAt: transaction.created_at
    });

  } catch (error) {
    console.error('Purchase verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to verify purchase'
    });
  }
});

module.exports = router;