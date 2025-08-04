const OpenAI = require('openai');
const { supabase } = require('./database');

class AIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('Warning: OPENAI_API_KEY not set. AI features will be disabled.');
      this.openai = null;
      return;
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateTweet(context, userInput = null) {
    if (!this.openai) {
      throw new Error('OpenAI not configured. AI features are disabled.');
    }

    try {
      const systemPrompt = `You are an AI assistant helping to generate social media content for a pop star in the music industry simulation game "Essential Popstar".

Context about the player's current game state:
- Player Name: ${context.playerName || 'Unknown'}
- Player Age: ${context.playerAge || 'Unknown'}
- Current Date: ${context.date || 'Unknown'}
- Last Released Single: ${context.lastReleasedSingle || 'None'}
- Last Released Album: ${context.lastReleasedAlbum || 'None'}
- Audience Reach: ${context.reach || 'Unknown'}
- Charting Songs: ${context.chartingSongs || 'None'}
- Next Project Hype: ${context.nextProjectHype || 'None'}

Generate a realistic social media post that:
1. Fits the pop star's current career stage and momentum
2. References relevant context (recent releases, chart performance, etc.)
3. Sounds authentic and engaging
4. Is appropriate for the music industry
5. Keeps the tone professional but personable
6. Uses appropriate hashtags sparingly
7. Stays within 280 characters

${userInput ? `User request: "${userInput}"` : 'Generate a post that fits the current situation.'}`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          }
        ],
        max_tokens: 150,
        temperature: 0.8,
      });

      return completion.choices[0]?.message?.content?.trim() || 'Could not generate content.';
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate AI content');
    }
  }

  async checkPowerForAI(userId, requiredPower = 1) {
    try {
      // Get current power configuration
      const { data: config } = await supabase
        .from('power_config')
        .select('*')
        .single();

      // Get user's power balance
      const { data: balance } = await supabase
        .from('power_balances')
        .select('*')
        .eq('user_id', userId)
        .single();

      let currentPower;
      if (!balance) {
        // User doesn't exist, create with 0 power
        const { data: newBalance, error: insertError } = await supabase
          .from('power_balances')
          .insert({
            user_id: userId,
            base_power: 0,
            last_update: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) throw insertError;
        currentPower = this.calculateCurrentPower(newBalance, config);
      } else {
        currentPower = this.calculateCurrentPower(balance, config);
      }

      return {
        currentPower,
        requiredPower,
        hasEnoughPower: currentPower >= requiredPower
      };
    } catch (error) {
      console.error('Error checking power for AI:', error);
      throw error;
    }
  }

  calculateCurrentPower(balance, config) {
    if (!config || !balance) {
      return 0;
    }

    const now = new Date();
    const lastUpdate = new Date(balance.last_update);
    const timeDiffMs = now.getTime() - lastUpdate.getTime();
    const intervalMs = (config.refill_interval_minutes || 30) * 60 * 1000;
    
    const refillCycles = Math.floor(timeDiffMs / intervalMs);
    const refillAmount = refillCycles * (config.refill_amount || 1);
    
    const currentPower = Math.min(
      (balance.base_power || 0) + refillAmount,
      config.max_power || 24
    );
    
    return currentPower;
  }

  async deductPowerForAI(userId, powerCost = 1) {
    try {
      // Create a power ledger entry for AI usage
      const { data: ledgerEntry, error: ledgerError } = await supabase
        .from('power_ledger')
        .insert({
          user_id: userId,
          delta: -powerCost,
          reason: 'spend:ai_tweet_generation',
          idempotency_key: `ai_${userId}_${Date.now()}`
        })
        .select()
        .single();

      if (ledgerError) throw ledgerError;

      // Update power balance by first getting current power, then updating
      const { data: currentBalance, error: getCurrentError } = await supabase
        .from('power_balances')
        .select('base_power')
        .eq('user_id', userId)
        .single();

      if (getCurrentError) throw getCurrentError;

      const newPower = currentBalance.base_power - powerCost;
      
      const { data: updatedBalance, error: balanceError } = await supabase
        .from('power_balances')
        .update({
          base_power: newPower,
          last_update: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (balanceError) throw balanceError;

      // Get config to calculate current power
      const { data: config } = await supabase
        .from('power_config')
        .select('*')
        .single();

      return this.calculateCurrentPower(updatedBalance, config);
    } catch (error) {
      console.error('Error deducting power for AI:', error);
      throw error;
    }
  }

  async generateCommentsForTweet(tweet, context, numberOfComments = 8) {
    if (!this.openai) {
      throw new Error('OpenAI not configured. AI features are disabled.');
    }

    try {
      const systemPrompt = `You are generating realistic social media comments for this tweet in the music industry simulation game "Essential Popstar".

Tweet Details:
- Author: ${tweet.author || 'Unknown'}
- Username: ${tweet.username || '@unknown'}
- Content: "${tweet.content}"

Game Context:
- Player Name: ${context?.playerName || 'Unknown Artist'}
- Player Age: ${context?.playerAge || 'Unknown'}
- Current Reach: ${context?.reach || 'Unknown'}

Generate ${numberOfComments} diverse, realistic comments that people might leave on this tweet. Comments should:
1. Vary in tone (supportive, critical, neutral, excited, etc.)
2. Reference the tweet content appropriately
3. Feel authentic to real social media interactions
4. Be under 100 characters each
5. Include varied usernames and display names
6. Some should mention the player if relevant

Response format should be a JSON array:
[
  {
    "username": "@username1",
    "name": "Display Name",
    "content": "Comment text here"
  },
  ...
]`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Generate ${numberOfComments} realistic comments for this tweet.`
          }
        ],
        max_tokens: 800,
        temperature: 0.9,
      });

      const response = completion.choices[0]?.message?.content?.trim();
      
      try {
        const comments = JSON.parse(response);
        return Array.isArray(comments) ? comments : [];
      } catch (parseError) {
        console.error('Error parsing comments JSON:', parseError);
        return [];
      }
    } catch (error) {
      console.error('OpenAI API error for comments:', error);
      throw new Error('Failed to generate AI comments');
    }
  }

  isAvailable() {
    return this.openai !== null;
  }
}

module.exports = new AIService();