const crypto = require('crypto');

/**
 * Generates a custom user ID for Essential Popstar
 * Format: EP_YYYYMMDD_XXXXX (where XXXXX is random alphanumeric)
 * Example: EP_20250131_A7K9M
 */
function generateCustomUserId() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // Generate 5 random alphanumeric characters
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomPart = '';
  for (let i = 0; i < 5; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `EP_${year}${month}${day}_${randomPart}`;
}

/**
 * Validates a user ID format
 */
function isValidUserId(userId) {
  if (!userId || typeof userId !== 'string') return false;
  
  // Check if it matches our custom format, Apple UUID format, or is a simple string
  const customFormat = /^EP_\d{8}_[A-Z0-9]{5}$/;
  const uuidFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const simpleFormat = /^[a-zA-Z0-9_-]{3,50}$/;
  
  return customFormat.test(userId) || uuidFormat.test(userId) || simpleFormat.test(userId);
}

/**
 * Sanitizes user ID to prevent injection attacks
 */
function sanitizeUserId(userId) {
  if (!userId) return null;
  
  // Allow hyphens for UUIDs (Apple user IDs), alphanumeric, underscores, and hyphens
  const sanitized = userId.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 50);
  
  return isValidUserId(sanitized) ? sanitized : null;
}

module.exports = {
  generateCustomUserId,
  isValidUserId,
  sanitizeUserId
};