/**
 * Power calculation utilities for Essential Popstar
 * Handles automatic refill logic without requiring background jobs
 */

/**
 * Computes current power based on base power, last update time, and config
 * @param {Date} now - Current timestamp
 * @param {number} basePower - Power at last update
 * @param {Date} lastUpdate - Last update timestamp
 * @param {Object} config - Power configuration
 * @returns {Object} Current power info
 */
function computeCurrentPower(now, basePower, lastUpdate, config) {
  const intervalMs = config.refill_interval_minutes * 60 * 1000;
  const elapsed = Math.max(0, now.getTime() - new Date(lastUpdate).getTime());
  const ticks = Math.floor(elapsed / intervalMs);
  const refilled = ticks * config.refill_amount;
  const current = Math.min(config.max_power, basePower + refilled);
  const remainder = elapsed % intervalMs;
  const needsRefill = current < config.max_power;
  const nextRefillInMs = needsRefill ? (intervalMs - remainder) : 0;
  
  return {
    current,
    nextRefillInMs,
    nextRefillInSeconds: Math.ceil(nextRefillInMs / 1000),
    maxPower: config.max_power,
    refillAmount: config.refill_amount,
    refillIntervalMinutes: config.refill_interval_minutes
  };
}

/**
 * Gets the power delta for a specific product
 * @param {string} productId - RevenueCat product identifier
 * @returns {number} Power amount to grant
 */
function getProductPowerDelta(productId) {
  const productMapping = {
    'coffee_1': parseInt(process.env.COFFEE_1_POWER) || 8,
    '1_coffee': parseInt(process.env.COFFEE_1_POWER) || 8, // Alternative naming
    'coffee_5': parseInt(process.env.COFFEE_5_POWER) || 40,
    '5_coffees': parseInt(process.env.COFFEE_5_POWER) || 40, // Alternative naming
    'coffee_50': parseInt(process.env.COFFEE_50_POWER) || 400,
    '50_coffees': parseInt(process.env.COFFEE_50_POWER) || 400,
    'coffee_120': parseInt(process.env.COFFEE_120_POWER) || 960,
    '120_coffees': parseInt(process.env.COFFEE_120_POWER) || 960,
    'coffee_400': parseInt(process.env.COFFEE_400_POWER) || 3200,
    '400_coffees': parseInt(process.env.COFFEE_400_POWER) || 3200
  };
  
  return productMapping[productId] || 0;
}

/**
 * Validates that user has enough power for an action
 * @param {number} currentPower - User's current power
 * @param {number} cost - Power cost for the action
 * @returns {boolean} Whether user can afford the action
 */
function canAffordAction(currentPower, cost) {
  return currentPower >= cost && cost > 0;
}

/**
 * Calculates time until power is fully refilled
 * @param {number} currentPower - Current power amount
 * @param {Object} config - Power configuration
 * @returns {Object} Time until full refill
 */
function timeUntilFullRefill(currentPower, config) {
  if (currentPower >= config.max_power) {
    return { minutes: 0, seconds: 0, isAtMax: true };
  }
  
  const powerNeeded = config.max_power - currentPower;
  const refillsNeeded = Math.ceil(powerNeeded / config.refill_amount);
  const totalMinutes = refillsNeeded * config.refill_interval_minutes;
  
  return {
    minutes: totalMinutes,
    seconds: totalMinutes * 60,
    isAtMax: false,
    refillsNeeded
  };
}

module.exports = {
  computeCurrentPower,
  getProductPowerDelta,
  canAffordAction,
  timeUntilFullRefill
};