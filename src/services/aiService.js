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
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          }
        ],
        max_completion_tokens: 150,
        temperature: 1,
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
          reason: 'spend:ai_generation',
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
      // Check if there are followed NPCs that could comment
      const followedNPCs = context?.followedNPCs || [];
      const hasFollowedNPCs = Array.isArray(followedNPCs) && followedNPCs.length > 0;
      
      let followedNPCsInfo = '';
      if (hasFollowedNPCs) {
        followedNPCsInfo = `\nFollowed NPCs (should occasionally comment):
${followedNPCs.map(npc => `- ${npc.name} (@${npc.username || npc.name.toLowerCase().replace(/\s+/g, '')}): ${npc.description || npc.twitterbio || 'Music artist'}`).join('\n')}`;
      }

      const systemPrompt = `You are generating realistic social media comments for this tweet in the music industry simulation game "Essential Popstar".

Tweet Details:
- Author: ${tweet.author || 'Unknown'}
- Username: ${tweet.username || '@unknown'}
- Content: "${tweet.content}"

Game Context:
- Player Name: ${context?.playerName || 'Unknown Artist'}
- Player Age: ${context?.playerAge || 'Unknown'}
- Current Reach: ${context?.reach || 'Unknown'}${followedNPCsInfo}

Generate ${numberOfComments} diverse, realistic comments that people might leave on this tweet. Comments should:
1. Vary in tone (supportive, critical, neutral, excited, etc.)
2. Reference the tweet content appropriately
3. Feel authentic to real social media interactions
4. Be under 100 characters each
5. Include varied usernames and display names
6. Some should mention the player if relevant
7. Include some banter where comments react to each other (use @username to reference other commenters)
8. Create conversational threads with back-and-forth exchanges
9. IMPORTANT: The original poster (${tweet.author || 'Unknown'}) should NEVER respond or banter in the comments
${hasFollowedNPCs ? '10. 1-2 comments should be from the followed NPCs listed above, using their actual usernames and personality' : ''}

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
        model: 'gpt-4.1-mini',
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
        max_completion_tokens: 800,
        temperature: 1,
      });

      const response = completion.choices[0]?.message?.content?.trim();
      
      try {
        // Clean the response to extract JSON from markdown formatting
        let cleanedResponse = response;
        
        // Remove markdown code blocks (```json ... ```)
        if (response.includes('```json')) {
          const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            cleanedResponse = jsonMatch[1].trim();
          }
        } else if (response.includes('```')) {
          // Handle generic code blocks
          const codeMatch = response.match(/```\s*([\s\S]*?)\s*```/);
          if (codeMatch) {
            cleanedResponse = codeMatch[1].trim();
          }
        }
        
        console.log('Twitter Comments - Original:', response.substring(0, 100));
        console.log('Twitter Comments - Cleaned:', cleanedResponse.substring(0, 100));
        
        const comments = JSON.parse(cleanedResponse);
        return Array.isArray(comments) ? comments : [];
      } catch (parseError) {
        console.error('Error parsing comments JSON:', parseError);
        console.error('Raw comments response:', response);
        
        // Return fallback comments instead of empty array
        return [
          {
            username: '@MusicFan2024',
            name: 'Music Lover',
            content: 'Great post! 🎵',
            timestamp: new Date().toISOString(),
            isAI: true
          },
          {
            username: '@PopCultureCritic',
            name: 'Pop Culture Critic', 
            content: 'Interesting perspective on this.',
            timestamp: new Date().toISOString(),
            isAI: true
          }
        ];
      }
    } catch (error) {
      console.error('OpenAI API error for comments:', error);
      throw new Error('Failed to generate AI comments');
    }
  }

  async generateEventNarrative(event, attendeeNPCs, player, context, eventMemories = []) {
    if (!this.openai) {
      throw new Error('OpenAI not configured. AI features are disabled.');
    }

    try {
      const primaryNPC = attendeeNPCs[0];
      const otherNPCs = attendeeNPCs.slice(1);

      // Build memory context if available
      const memoryContext = eventMemories.length > 0 ? `
PREVIOUS EVENT HISTORY:
${eventMemories.map(memory => `- "${memory.event_title}" with ${memory.attendee_names?.join(', ') || 'various attendees'} - ${memory.outcome?.overallSuccess ? 'went well' : 'had mixed results'}`).join('\n')}

Use this history to add continuity if relevant, but don't force references.` : '';

      const systemPrompt = `You are creating an immersive narrative opening for an AI roleplay event in the music industry simulation game "Essential Popstar".

EVENT DETAILS:
- Title: "${event.title}"
- Description: "${event.description}"
- Location Context: ${this.getLocationFromDescription(event.description)}
${memoryContext}

PLAYER CHARACTER:
- Name: ${player.name}
- Age: ${player.age}
- Genre: ${player.genre}
- Current Status: ${player.role}

PRIMARY NPC:
- Name: ${primaryNPC.name}
- Role: ${primaryNPC.role}
- Relationship Score: ${primaryNPC.relationshipScore || 0} (-100 to 100)
- Current Feeling: ${primaryNPC.currentlyFeeling || 'neutral'}
- Your Relationship: ${primaryNPC.yourRelationship || 'acquaintance'}
- Personality: ${primaryNPC.description || 'Professional musician'}

${otherNPCs.length > 0 ? `OTHER ATTENDEES: ${otherNPCs.map(npc => `${npc.name} (${npc.role})`).join(', ')}` : ''}

GAME CONTEXT:
- Current Date: ${context.currentDate || 'Unknown'}
- Player's Recent Activity: ${context.recentActivity || 'Continuing their music career'}

Create a vivid, immersive opening narrative (2-3 sentences) that:
1. Sets the scene with rich sensory details
2. Establishes the atmosphere and location
3. Shows the primary NPC's initial reaction/mood based on their relationship with the player
4. Hints at the dynamic between characters
5. Creates anticipation for the interaction to unfold
6. Keeps it realistic to the music industry setting
7. Reflects the relationship score in the NPC's demeanor

Write in third person, present tense. Make it feel like the opening of an engaging story.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: 'Generate the opening narrative for this AI roleplay event.'
          }
        ],
        max_completion_tokens: 300,
        temperature: 1,
      });

      return completion.choices[0]?.message?.content?.trim() || 'The event begins as everyone gathers together...';
    } catch (error) {
      console.error('OpenAI API error for event narrative:', error);
      throw new Error('Failed to generate AI event narrative');
    }
  }

  async generateResponseOptions(event, attendeeNPCs, player, narrative, turnNumber, conversationHistory) {
    if (!this.openai) {
      throw new Error('OpenAI not configured. AI features are disabled.');
    }

    try {
      const primaryNPC = attendeeNPCs[0];
      const activityType = this.getActivityType(event.description);
      const relationshipScore = primaryNPC.relationshipScore || 0;

      const systemPrompt = `You are generating realistic response options for a player in an AI roleplay event in "Essential Popstar".

CURRENT SITUATION:
- Event: "${event.title}" - ${event.description}
- Activity Type: ${activityType}
- Turn: ${turnNumber}/6
- Current Narrative: "${narrative}"

PLAYER:
- Name: ${player.name}
- Genre: ${player.genre}

PRIMARY NPC:
- Name: ${primaryNPC.name}
- Role: ${primaryNPC.role}
- Relationship Score: ${relationshipScore} (-100=enemy, 0=neutral, 100=soulmate)
- Current Feeling: ${primaryNPC.currentlyFeeling || 'neutral'}
- Your Relationship: ${primaryNPC.yourRelationship || 'acquaintance'}

CONVERSATION HISTORY:
${conversationHistory.map((turn, i) => `Turn ${i + 1}: ${turn.playerResponse || 'No response yet'}`).join('\n')}

Generate exactly 3 diverse response options that:
1. Are short, decisive actions (5-10 words maximum)
2. Drive the narrative forward with meaningful choices
3. Create clear consequences and story progression
4. Reflect different approaches (aggressive, diplomatic, strategic, emotional, etc.)
5. Focus on actions that change the dynamic or situation
6. Avoid passive gestures - use impactful, story-driving verbs
7. Each option should lead to distinctly different narrative paths
8. Consider the turn number (early turns = set direction, later turns = climactic choices)

Return as a JSON array of strings:
["Option 1", "Option 2", "Option 3"]`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: 'Generate 3 response options for this situation.'
          }
        ],
        max_completion_tokens: 400,
        temperature: 1,
      });

      const response = completion.choices[0]?.message?.content?.trim();
      
      try {
        // Clean the response to extract JSON from markdown formatting
        let cleanedResponse = response;
        
        // Remove markdown code blocks (```json ... ```)
        if (response.includes('```json')) {
          const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            cleanedResponse = jsonMatch[1].trim();
          }
        } else if (response.includes('```')) {
          // Handle generic code blocks
          const codeMatch = response.match(/```\s*([\s\S]*?)\s*```/);
          if (codeMatch) {
            cleanedResponse = codeMatch[1].trim();
          }
        }
        
        console.log('Response Options - Original:', response.substring(0, 100));
        console.log('Response Options - Cleaned:', cleanedResponse.substring(0, 100));
        
        const options = JSON.parse(cleanedResponse);
        return Array.isArray(options) ? options : ['Continue the conversation...', 'Take a moment to think...', 'Respond thoughtfully...'];
      } catch (parseError) {
        console.error('Error parsing response options JSON:', parseError);
        console.error('Raw options response:', response);
        return ['Continue the conversation...', 'Take a moment to think...', 'Respond thoughtfully...'];
      }
    } catch (error) {
      console.error('OpenAI API error for response options:', error);
      throw new Error('Failed to generate AI response options');
    }
  }

  async generateAIEventResponse(event, attendeeNPCs, player, playerResponse, turnNumber, conversationHistory) {
    if (!this.openai) {
      throw new Error('OpenAI not configured. AI features are disabled.');
    }

    try {
      const primaryNPC = attendeeNPCs[0];
      const activityType = this.getActivityType(event.description);
      const relationshipScore = primaryNPC.relationshipScore || 0;

      const systemPrompt = `You are generating an AI response to player actions in a music industry roleplay event in "Essential Popstar".

EVENT CONTEXT:
- Event: "${event.title}" - ${event.description}
- Activity Type: ${activityType}
- Turn: ${turnNumber}/6
- Player just did: "${playerResponse}"

CHARACTERS:
Player: ${player.name} (${player.genre} artist)
Primary NPC: ${primaryNPC.name} (${primaryNPC.role})
- Relationship Score: ${relationshipScore} (-100 to 100)
- Current Feeling: ${primaryNPC.currentlyFeeling || 'neutral'}
- Your Relationship: ${primaryNPC.yourRelationship || 'acquaintance'}
- Personality: ${primaryNPC.description || 'Professional musician'}

CONVERSATION HISTORY:
${conversationHistory.map((turn, i) => 
  `Turn ${i + 1}: Player: "${turn.playerResponse || 'None'}" | AI: "${turn.narrative || 'None'}"`
).join('\n')}

Generate a response that includes:
1. A narrative describing the NPC's reaction and the scene (2-3 sentences)
2. 3 new response options for the player's next turn

The narrative should:
- Show the NPC's reaction based on their personality and relationship score
- Advance the conversation naturally
- Include dialogue from the NPC
- Set up the next interaction
- Be consistent with their established character
- Reflect the activity's progression
- Consider if this is getting toward the end (turns 5-6)

Return as JSON:
{
  "narrative": "The narrative response here...",
  "options": ["Option 1", "Option 2", "Option 3"]
}`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: 'Generate the AI response to the player\'s action.'
          }
        ],
        max_completion_tokens: 600,
        temperature: 1,
      });

      const response = completion.choices[0]?.message?.content?.trim();
      
      try {
        // Clean the response to extract JSON from markdown formatting
        let cleanedResponse = response;
        
        // Remove markdown code blocks (```json ... ```)
        if (response.includes('```json')) {
          const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            cleanedResponse = jsonMatch[1].trim();
          }
        } else if (response.includes('```')) {
          // Handle generic code blocks
          const codeMatch = response.match(/```\s*([\s\S]*?)\s*```/);
          if (codeMatch) {
            cleanedResponse = codeMatch[1].trim();
          }
        }
        
        console.log('AI Event Response - Original:', response.substring(0, 100));
        console.log('AI Event Response - Cleaned:', cleanedResponse.substring(0, 100));
        
        const aiResponse = JSON.parse(cleanedResponse);
        return {
          narrative: aiResponse.narrative || 'The conversation continues...',
          options: Array.isArray(aiResponse.options) ? aiResponse.options : ['Continue...', 'Respond...', 'React...']
        };
      } catch (parseError) {
        console.error('Error parsing AI response JSON:', parseError);
        console.error('Raw AI response:', response);
        
        // Return a user-friendly error that the frontend can handle
        return {
          error: 'AI_PARSE_ERROR',
          narrative: 'Something went wrong generating the AI response.',
          options: ['Try again', 'Continue anyway', 'End event'],
          shouldRetry: true
        };
      }
    } catch (error) {
      console.error('OpenAI API error for AI event response:', error);
      throw new Error('Failed to generate AI event response');
    }
  }

  getLocationFromDescription(description) {
    const desc = description.toLowerCase();
    if (desc.includes('lunch') || desc.includes('dinner')) return 'restaurant';
    if (desc.includes('coffee')) return 'coffee shop';
    if (desc.includes('park')) return 'park';
    if (desc.includes('meeting') || desc.includes('business')) return 'office/meeting room';
    if (desc.includes('studio')) return 'recording studio';
    if (desc.includes('party')) return 'event venue';
    return 'private space';
  }

  async analyzeConversationImpact(conversationHistory, event, attendeeNPCs, player, lastReleasedSingle = null, lastReleasedAlbum = null, eventAims = null) {
    if (!this.openai) {
      throw new Error('OpenAI not configured. AI features are disabled.');
    }

    try {
      const systemPrompt = `You are analyzing a roleplay conversation to determine its impact on relationships and aims achievement in the music industry simulation game "Essential Popstar".

EVENT CONTEXT:
- Event: "${event.title}" - ${event.description}
- Activity Type: ${this.getActivityType(event.description)}
- Event Aims: ${eventAims || 'None specified'}

PLAYER:
- Name: ${player.name}
- Genre: ${player.genre}

MUSIC CONTEXT:
${lastReleasedSingle ? `- Last Released Single: "${lastReleasedSingle.name}" (${lastReleasedSingle.genre})` : '- No recent singles'}
${lastReleasedAlbum ? `- Last Released Album: "${lastReleasedAlbum.name}" (${lastReleasedAlbum.childPackageIds ? lastReleasedAlbum.childPackageIds.length : 0} tracks)` : '- No recent albums'}

CONVERSATION HISTORY:
${conversationHistory.map((turn, i) => 
  `Turn ${i + 1}:\nAI: "${turn.narrative || 'None'}"\nPlayer: "${turn.playerResponse || 'No response yet'}"`
).join('\n\n')}

ATTENDEE NPCs:
${attendeeNPCs.map(npc => 
  `- ${npc.name} (${npc.role}) - Current Relationship Score: ${npc.relationshipScore || 0} (-100 to 100), Feeling: ${npc.currentlyFeeling || 'neutral'}`
).join('\n')}

Analyze this conversation and determine:
1. Relationship impact for each NPC
2. Which event aims (if any) were achieved

RELATIONSHIP ANALYSIS - Consider:
1. Player's tone and approach throughout the conversation
2. How well the player matched the NPC's personality and preferences
3. Whether the player was respectful, engaging, or dismissive
4. If the activity type was appropriate for the relationship level
5. Overall conversation flow and player's social skills demonstrated

AIMS ANALYSIS - Check if the conversation achieved these specific goals:
- "discuss record deal": Look for explicit discussion about record labels, contracts, signing deals, or business partnerships
- "feature on a track": Look for agreements to collaborate musically, featuring on songs, or working together on tracks
- "joint album": Look for discussion about creating an album together, collaborative projects, or multi-artist releases

For each NPC, provide:
- relationshipChange: A number from -20 to +20 representing the impact on their relationship score
- reasoning: Brief explanation of why this change occurred
- xpGained: XP from 10-30 based on how well the player handled the social interaction

For aims achievement, list any aims that were clearly accomplished through the conversation.

Return as JSON:
{
  "npcAnalysis": [
    {
      "npcId": "npc_id_here",
      "npcName": "NPC Name", 
      "relationshipChange": 5,
      "reasoning": "Brief explanation of the analysis",
      "xpGained": 15
    }
  ],
  "achievedAims": ["aim1", "aim2"]
}`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: 'Analyze this conversation and determine the relationship impact.'
          }
        ],
        max_completion_tokens: 800,
        temperature: 0.3, // Lower temperature for more consistent analysis
      });

      const response = completion.choices[0]?.message?.content?.trim();
      
      try {
        // Clean the response to extract JSON from markdown formatting
        let cleanedResponse = response;
        
        // Remove markdown code blocks (```json ... ```)
        if (response.includes('```json')) {
          const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            cleanedResponse = jsonMatch[1].trim();
          }
        } else if (response.includes('```')) {
          // Handle generic code blocks
          const codeMatch = response.match(/```\s*([\s\S]*?)\s*```/);
          if (codeMatch) {
            cleanedResponse = codeMatch[1].trim();
          }
        }
        
        console.log('Conversation Analysis - Original:', response.substring(0, 100));
        console.log('Conversation Analysis - Cleaned:', cleanedResponse.substring(0, 100));
        
        const analysis = JSON.parse(cleanedResponse);
        return analysis;
      } catch (parseError) {
        console.error('Error parsing conversation analysis JSON:', parseError);
        console.error('Raw analysis response:', response);
        // Fallback analysis
        return {
          npcAnalysis: attendeeNPCs.map(npc => ({
            npcId: npc.id.toString(),
            npcName: npc.name,
            relationshipChange: 5, // Default positive for completing event
            reasoning: 'AI analysis failed, using default positive outcome',
            xpGained: 15
          })),
          achievedAims: [] // No aims achieved in fallback
        };
      }
    } catch (error) {
      console.error('OpenAI API error for conversation analysis:', error);
      throw new Error('Failed to analyze conversation impact');
    }
  }

  getActivityType(description) {
    const desc = description.toLowerCase();
    if (desc.includes('business') || desc.includes('meeting') || desc.includes('professional')) return 'business';
    if (desc.includes('romantic') || desc.includes('date') || desc.includes('intimate')) return 'romantic';
    if (desc.includes('fun') || desc.includes('party') || desc.includes('game')) return 'recreational';
    if (desc.includes('lunch') || desc.includes('dinner') || desc.includes('coffee')) return 'social';
    return 'general';
  }

  async generatePlayerTweetReactions(playerTweet, followedNPCs, context) {
    if (!this.openai) {
      throw new Error('OpenAI not configured. AI features are disabled.');
    }

    try {
      console.log('🔥 generatePlayerTweetReactions called with:', {
        playerTweetContent: playerTweet.content,
        followedNPCsCount: Array.isArray(followedNPCs) ? followedNPCs.length : 0,
        contextPlayerName: context.playerName
      });

      const reactions = [];
      const { getRandomAvatarImage } = require('./npcTweetsService');
      
      // Generate 2-3 reactions from AI-created accounts
      const reactionCount = Math.floor(Math.random() * 2) + 2; // 2-3 reactions
      
      for (let i = 0; i < reactionCount; i++) {
        try {
          const systemPrompt = `Generate a realistic Twitter reaction to this post: "${playerTweet.content}" by artist ${context.playerName}.

Create both a fictional Twitter account and their reaction tweet.

Return as JSON:
{
  "username": "@realistic_username",
  "displayName": "Real Person Name",
  "content": "reaction tweet content under 100 chars"
}`;

          const completion = await this.openai.chat.completions.create({
            model: 'gpt-4.1-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Generate reaction tweet #${i + 1}` }
            ],
            max_completion_tokens: 150,
            temperature: 0.8,
          });

          const response = completion.choices[0]?.message?.content?.trim();
          
          try {
            const reactionData = JSON.parse(response);
            console.log(`🔥 Generated reaction #${i + 1}:`, reactionData);
            reactions.push({
              npcId: `reaction_${i}`,
              content: reactionData.content,
              npcName: reactionData.displayName,
              npcUsername: reactionData.username,
              profileImage: getRandomAvatarImage()
            });
          } catch (parseError) {
            console.error(`🔥 JSON parse error for reaction #${i + 1}:`, parseError, response);
          }
        } catch (error) {
          console.error(`🔥 Error generating reaction #${i + 1}:`, error);
        }
      }
      
      console.log(`🔥 Returning ${reactions.length} reactions`);
      return reactions;
    } catch (error) {
      console.error('🔥 OpenAI API error for player tweet reactions:', error);
      throw new Error('Failed to generate player tweet reactions');
    }
  }

  async generateEventCoverage(event, player, context, isPublicEvent) {
    if (!this.openai) {
      throw new Error('OpenAI not configured. AI features are disabled.');
    }

    try {
      const systemPrompt = `Generate 2-3 realistic social media posts about a celebrity event. 

Event Details:
- Event: ${event.title}
- Player: ${player.name}
- Location: ${event.location || 'undisclosed location'}
- Public Event: ${isPublicEvent ? 'Yes' : 'No (private/secretive)'}
- Player Fame Level: ${context.reach || 'Rising star'}

${isPublicEvent 
  ? 'Generate PUBLIC coverage tweets (sightings, red carpet, official coverage)'
  : 'Generate RUMOR tweets (whispers, insider sources, speculation)'
}

Blog account options: @PopBuzz, @chartdata, @PopBase, @PopCrave, @theshaderoom, @pagesix, @enews, @tmz

Generate as JSON array with realistic usernames and display names:
[{"username": "@account", "name": "Account Name", "content": "tweet content"}]

Keep tweets under 280 characters, use minimal emojis, make them feel authentic.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate realistic event coverage tweets.' }
        ],
        max_completion_tokens: 300,
        temperature: 1,
      });

      const response = completion.choices[0]?.message?.content?.trim();
      
      let cleanedResponse = response;
      
      // Remove markdown code blocks if present
      if (response.includes('```json')) {
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          cleanedResponse = jsonMatch[1].trim();
        }
      } else if (response.includes('```')) {
        // Handle generic code blocks
        const codeMatch = response.match(/```\s*([\s\S]*?)\s*```/);
        if (codeMatch) {
          cleanedResponse = codeMatch[1].trim();
        }
      }
      
      console.log('Event Coverage - Original:', response.substring(0, 100));
      console.log('Event Coverage - Cleaned:', cleanedResponse.substring(0, 100));
      
      try {
        const coverage = JSON.parse(cleanedResponse);
        return coverage;
      } catch (parseError) {
        console.error('Error parsing event coverage JSON:', parseError);
        console.error('Raw coverage response:', response);
        
        // Return fallback coverage
        return [
          {
            username: '@SportsUpdate',
            name: 'Sports News',
            content: 'Great event happening right now! 🏆',
            profileImage: '/images/news-avatar.png',
            isBlueCheck: false,
            timestamp: new Date().toISOString()
          }
        ];
      }
    } catch (error) {
      console.error('OpenAI API error for event coverage:', error);
      throw new Error('Failed to generate event coverage');
    }
  }

  isAvailable() {
    return this.openai !== null;
  }
}

module.exports = new AIService();