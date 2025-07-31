const { createClient } = require('@supabase/supabase-js');
const { computeCurrentPower } = require('../utils/powerCalculator');
const { generateCustomUserId, sanitizeUserId } = require('../utils/userIdGenerator');

class DatabaseService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
  }

  /**
   * Get or create user in database
   */
  async getOrCreateUser(userId) {
    const sanitizedUserId = sanitizeUserId(userId);
    if (!sanitizedUserId) {
      throw new Error('Invalid user ID format');
    }

    // Try to get existing user
    const { data: existingUser, error: selectError } = await this.supabase
      .from('app_users')
      .select('*')
      .eq('id', sanitizedUserId)
      .single();

    if (existingUser) {
      // Update last_active
      await this.supabase
        .from('app_users')
        .update({ last_active: new Date().toISOString() })
        .eq('id', sanitizedUserId);
      
      return existingUser;
    }

    // Create new user if not exists
    const { data: newUser, error: insertError } = await this.supabase
      .from('app_users')
      .insert([{ id: sanitizedUserId }])
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create user: ${insertError.message}`);
    }

    // Create initial power balance
    await this.supabase
      .from('power_balances')
      .insert([{
        user_id: sanitizedUserId,
        base_power: 0,
        last_update: new Date().toISOString()
      }]);

    return newUser;
  }

  /**
   * Get power configuration
   */
  async getPowerConfig() {
    const { data, error } = await this.supabase
      .from('power_config')
      .select('*')
      .eq('id', true)
      .single();

    if (error) {
      throw new Error(`Failed to get power config: ${error.message}`);
    }

    return data;
  }

  /**
   * Get user's power balance
   */
  async getPowerBalance(userId) {
    const sanitizedUserId = sanitizeUserId(userId);
    if (!sanitizedUserId) {
      throw new Error('Invalid user ID format');
    }

    const { data, error } = await this.supabase
      .from('power_balances')
      .select('*')
      .eq('user_id', sanitizedUserId)
      .single();

    if (error) {
      // If balance doesn't exist, create it
      if (error.code === 'PGRST116') {
        const { data: newBalance, error: insertError } = await this.supabase
          .from('power_balances')
          .insert([{
            user_id: sanitizedUserId,
            base_power: 0,
            last_update: new Date().toISOString()
          }])
          .select()
          .single();

        if (insertError) {
          throw new Error(`Failed to create power balance: ${insertError.message}`);
        }

        return newBalance;
      }
      throw new Error(`Failed to get power balance: ${error.message}`);
    }

    return data;
  }

  /**
   * Get current power for user (computed with refills)
   */
  async getCurrentPower(userId) {
    const [balance, config] = await Promise.all([
      this.getPowerBalance(userId),
      this.getPowerConfig()
    ]);

    const now = new Date();
    const powerInfo = computeCurrentPower(
      now,
      balance.base_power,
      balance.last_update,
      config
    );

    return {
      ...powerInfo,
      lastUpdate: balance.last_update,
      userId: balance.user_id
    };
  }

  /**
   * Spend power for an action
   */
  async spendPower(userId, cost, reason) {
    const sanitizedUserId = sanitizeUserId(userId);
    if (!sanitizedUserId) {
      throw new Error('Invalid user ID format');
    }

    if (cost <= 0) {
      throw new Error('Cost must be positive');
    }

    // Start transaction
    return await this.supabase.rpc('spend_power_transaction', {
      p_user_id: sanitizedUserId,
      p_cost: cost,
      p_reason: reason
    });
  }

  /**
   * Grant power to user (from purchase or admin action)
   */
  async grantPower(userId, amount, reason, idempotencyKey = null, externalTxnId = null) {
    const sanitizedUserId = sanitizeUserId(userId);
    if (!sanitizedUserId) {
      throw new Error('Invalid user ID format');
    }

    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    // Ensure user exists
    await this.getOrCreateUser(sanitizedUserId);

    const now = new Date().toISOString();
    
    try {
      // Start a transaction-like operation
      const [currentPower, config] = await Promise.all([
        this.getCurrentPower(sanitizedUserId),
        this.getPowerConfig()
      ]);

      const newBasePower = Math.min(config.max_power, currentPower.current + amount);

      // Insert ledger entry
      const ledgerData = {
        user_id: sanitizedUserId,
        delta: amount,
        reason: reason,
        created_at: now
      };

      if (idempotencyKey) {
        ledgerData.idempotency_key = idempotencyKey;
      }

      if (externalTxnId) {
        ledgerData.external_txn_id = externalTxnId;
      }

      const { error: ledgerError } = await this.supabase
        .from('power_ledger')
        .insert([ledgerData]);

      if (ledgerError) {
        // If it's a duplicate idempotency key, that's okay
        if (ledgerError.code === '23505' && idempotencyKey) {
          console.log(`Duplicate transaction ${idempotencyKey} - ignoring`);
          return { success: true, current: currentPower.current };
        }
        throw new Error(`Failed to insert ledger entry: ${ledgerError.message}`);
      }

      // Update power balance
      const { error: balanceError } = await this.supabase
        .from('power_balances')
        .update({
          base_power: newBasePower,
          last_update: now
        })
        .eq('user_id', sanitizedUserId);

      if (balanceError) {
        throw new Error(`Failed to update power balance: ${balanceError.message}`);
      }

      return {
        success: true,
        current: newBasePower,
        granted: amount,
        maxPower: config.max_power
      };

    } catch (error) {
      console.error('Grant power error:', error);
      throw error;
    }
  }

  /**
   * Get user's power transaction history
   */
  async getPowerHistory(userId, limit = 50) {
    const sanitizedUserId = sanitizeUserId(userId);
    if (!sanitizedUserId) {
      throw new Error('Invalid user ID format');
    }

    const { data, error } = await this.supabase
      .from('power_ledger')
      .select('*')
      .eq('user_id', sanitizedUserId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get power history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update power configuration (admin only)
   */
  async updatePowerConfig(updates) {
    const { data, error } = await this.supabase
      .from('power_config')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', true)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update power config: ${error.message}`);
    }

    return data;
  }
}

module.exports = new DatabaseService();