const express = require('express');
const router = express.Router();
const database = require('../services/database');
const { verifyRevenueCatSignature, extractPurchaseData, extractRefundData } = require('../utils/revenueCatVerifier');
const { getProductPowerDelta } = require('../utils/powerCalculator');

/**
 * POST /webhooks/revenuecat
 * Handle RevenueCat webhook events
 */
router.post('/revenuecat', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.get('X-RevenueCat-Signature');
    const payload = req.body.toString();
    const secret = process.env.REVENUECAT_WEBHOOK_SECRET;

    // Verify signature
    if (!verifyRevenueCatSignature(payload, signature, secret)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse the event
    let event;
    try {
      event = JSON.parse(payload);
    } catch (parseError) {
      console.error('Failed to parse webhook payload:', parseError);
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    console.log('🔔 RevenueCat webhook received:', {
      type: event.event?.type,
      appUserId: event.event?.app_user_id,
      productId: event.event?.product_id,
      transactionId: event.event?.transaction_id,
      id: event.event?.id
    });

    // Handle purchase events
    const purchaseData = extractPurchaseData(event);
    if (purchaseData) {
      console.log('💰 Processing purchase event:', purchaseData);
      await handlePurchaseEvent(purchaseData);
      console.log('✅ Purchase processing completed');
      return res.status(200).json({ success: true, message: 'Purchase processed' });
    }

    // Handle refund events
    const refundData = extractRefundData(event);
    if (refundData) {
      console.log('💸 Processing refund event:', refundData);
      await handleRefundEvent(refundData);
      console.log('✅ Refund processing completed');
      return res.status(200).json({ success: true, message: 'Refund processed' });
    }

    // For other event types, just acknowledge
    console.log('Unhandled event type:', event.event?.type);
    res.status(200).json({ success: true, message: 'Event acknowledged' });

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Handle successful purchase events
 */
async function handlePurchaseEvent(purchaseData) {
  const { appUserId, productId, transactionId, eventType } = purchaseData;
  
  // Get power delta for this product
  const powerDelta = getProductPowerDelta(productId);
  
  if (powerDelta <= 0) {
    console.log(`No power configured for product: ${productId}`);
    return;
  }

  try {
    // Grant power to user
    const result = await database.grantPower(
      appUserId,
      powerDelta,
      `purchase:${productId}`,
      transactionId, // idempotency key
      transactionId  // external transaction ID
    );

    console.log('Power granted successfully:', {
      userId: appUserId,
      productId,
      powerGranted: powerDelta,
      newTotal: result.current,
      transactionId
    });

  } catch (error) {
    console.error('Failed to grant power for purchase:', error);
    throw error;
  }
}

/**
 * Handle refund/cancellation events
 */
async function handleRefundEvent(refundData) {
  const { appUserId, productId, transactionId, eventType } = refundData;
  
  // Get power delta for this product (to subtract)
  const powerDelta = getProductPowerDelta(productId);
  
  if (powerDelta <= 0) {
    console.log(`No power configured for product: ${productId}`);
    return;
  }

  try {
    // Remove power from user (but don't let it go below 0)
    const currentPower = await database.getCurrentPower(appUserId);
    const powerToRemove = Math.min(powerDelta, currentPower.current);
    
    if (powerToRemove > 0) {
      // Record the refund as a negative delta
      await database.grantPower(
        appUserId,
        -powerToRemove,
        `refund:${productId}`,
        `refund_${transactionId}`, // idempotency key
        transactionId  // external transaction ID
      );

      console.log('Power refunded successfully:', {
        userId: appUserId,
        productId,
        powerRemoved: powerToRemove,
        transactionId,
        eventType
      });
    } else {
      console.log('No power to refund for user:', appUserId);
    }

  } catch (error) {
    console.error('Failed to process refund:', error);
    throw error;
  }
}

/**
 * GET /webhooks/test
 * Test endpoint to verify webhook setup
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Webhook endpoint is working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;