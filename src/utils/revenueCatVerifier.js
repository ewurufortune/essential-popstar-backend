const crypto = require('crypto');

/**
 * Verifies RevenueCat webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - X-RevenueCat-Signature header
 * @param {string} secret - Webhook secret from environment
 * @returns {boolean} Whether signature is valid
 */
function verifyRevenueCatSignature(payload, signature, secret) {
  if (!payload || !signature || !secret) {
    return false;
  }
  
  try {
    // RevenueCat uses HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');
    
    // Compare signatures securely
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Extracts relevant data from RevenueCat webhook event
 * @param {Object} event - RevenueCat webhook event data
 * @returns {Object|null} Extracted data or null if invalid
 */
function extractPurchaseData(event) {
  try {
    if (!event || !event.event) {
      return null;
    }
    
    const eventType = event.event.type;
    
    // Only process successful purchase events
    if (!['INITIAL_PURCHASE', 'RENEWAL', 'NON_RENEWING_PURCHASE'].includes(eventType)) {
      return null;
    }
    
    const eventData = event.event;
    const appUserId = eventData.app_user_id;
    const productId = eventData.product_id;
    const transactionId = eventData.transaction_id || eventData.id;
    
    if (!appUserId || !productId || !transactionId) {
      return null;
    }
    
    return {
      appUserId,
      productId,
      transactionId,
      eventType,
      originalTransactionId: eventData.original_transaction_id,
      purchaseDate: eventData.purchase_date,
      environment: eventData.environment
    };
  } catch (error) {
    console.error('Error extracting purchase data:', error);
    return null;
  }
}

/**
 * Extracts data for refund/revocation events
 * @param {Object} event - RevenueCat webhook event data
 * @returns {Object|null} Extracted refund data or null if invalid
 */
function extractRefundData(event) {
  try {
    if (!event || !event.event) {
      return null;
    }
    
    const eventType = event.event.type;
    
    // Process refund and cancellation events
    if (!['CANCELLATION', 'REFUND', 'EXPIRATION'].includes(eventType)) {
      return null;
    }
    
    const eventData = event.event;
    const appUserId = eventData.app_user_id;
    const productId = eventData.product_id;
    const transactionId = eventData.transaction_id || eventData.id;
    
    if (!appUserId || !productId || !transactionId) {
      return null;
    }
    
    return {
      appUserId,
      productId,
      transactionId,
      eventType,
      originalTransactionId: eventData.original_transaction_id,
      refundDate: eventData.cancellation_date || eventData.refund_date || eventData.expiration_date
    };
  } catch (error) {
    console.error('Error extracting refund data:', error);
    return null;
  }
}

module.exports = {
  verifyRevenueCatSignature,
  extractPurchaseData,
  extractRefundData
};