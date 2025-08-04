const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get random aesthetic images for NPC avatars from local assets
const getRandomAvatarImage = (baseUrl = process.env.BACKEND_URL || 'https://essential-popstar-backend-production.up.railway.app') => {
  const avatarImages = [
    `${baseUrl}/assets/npc-avatars/avatar1.jpeg`,
    `${baseUrl}/assets/npc-avatars/avatar2.jpg`,
    `${baseUrl}/assets/npc-avatars/avatar3.jpg`,
    `${baseUrl}/assets/npc-avatars/avatar4.jpg`,
    `${baseUrl}/assets/npc-avatars/avatar5.jpg`
  ];
  return avatarImages[Math.floor(Math.random() * avatarImages.length)];
};

// Predefined NPC accounts (only 2) - they post about their own topics, not music
const getPredefinedAccounts = (baseUrl = process.env.BACKEND_URL || 'https://essential-popstar-backend-production.up.railway.app') => [
  {
    id: 'espn',
    username: '@ESPN',
    name: 'ESPN',
    topic: 'sports news and updates',
    personality: 'Professional sports broadcaster, reports on games, trades, and athletic achievements',
    avatar: `${baseUrl}/assets/npc-avatars/avatar1.jpeg`,
    aboutPlayer: false
  },
  {
    id: 'formula1',
    username: '@Formula1',
    name: 'Formula 1',
    topic: 'racing news and F1 updates',
    personality: 'High-energy racing coverage, focuses on races, drivers, and racing culture',
    avatar: `${baseUrl}/assets/npc-avatars/avatar2.jpg`,
    aboutPlayer: false
  }
];

// Player-focused account types that generate different personalities
const PLAYER_FOCUSED_ACCOUNT_TYPES = [
  {
    type: 'stan_account',
    personality: 'Obsessive fan, uses excessive emojis internally but limited in tweets, defensive of the artist, tracks every move',
    topics: ['defending the artist', 'streaming numbers', 'chart positions', 'upcoming releases']
  },
  {
    type: 'music_conspiracist',
    personality: 'Believes in industry conspiracies, thinks everything is rigged or planned, sees hidden meanings',
    topics: ['industry manipulation', 'hidden meanings in releases', 'chart rigging theories', 'label politics']
  },
  {
    type: 'industry_insider',
    personality: 'Claims to have inside information, drops hints about future projects, acts mysterious',
    topics: ['behind the scenes info', 'upcoming collaborations', 'studio sessions', 'industry gossip']
  },
  {
    type: 'music_critic',
    personality: 'Analytical and sometimes harsh, focuses on artistic merit, compares to other artists',
    topics: ['artistic analysis', 'production quality', 'lyrical content', 'career trajectory']
  },
  {
    type: 'chart_tracker',
    personality: 'Obsessed with numbers, streams, sales, and chart positions, very data-focused',
    topics: ['streaming numbers', 'chart predictions', 'sales figures', 'industry metrics']
  },
  {
    type: 'casual_fan',
    personality: 'Regular music fan, not obsessive, gives honest opinions, relatable takes',
    topics: ['general music opinions', 'playlist additions', 'casual observations', 'mainstream appeal']
  }
];

/**
 * Generate AI NPC tweets based on game context
 * @param {Object} context - Game context data
 * @param {number} numberOfTweets - Number of tweets to generate (default: 5)
 * @returns {Array} Generated NPC tweets
 */
async function generateNPCTweets(context, numberOfTweets = 8) {
  try {
    const tweets = [];
    const PREDEFINED_ACCOUNTS = getPredefinedAccounts();
    
    // Generate 2 tweets from predefined accounts (ESPN, F1)
    for (const account of PREDEFINED_ACCOUNTS) {
      try {
        const tweet = await generateTweetForPredefinedAccount(account);
        if (tweet) {
          tweets.push({
            id: `npc_${account.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            username: account.username,
            name: account.name,
            avatar: account.avatar,
            content: tweet,
            timestamp: new Date().toISOString(),
            isNPC: true,
            accountType: account.id,
            topic: account.topic
          });
        }
      } catch (error) {
        console.error(`Error generating tweet for ${account.username}:`, error);
      }
    }
    
    // Check if player follows any NPCs and generate tweets from followed accounts
    const hasFollows = context.followedNPCs && context.followedNPCs !== 'None';
    let followedTweetsCount = 0;
    
    if (hasFollows && tweets.length < numberOfTweets) {
      // Extract number of followed NPCs from context (e.g., "Following 3 NPCs" -> 3)
      const followCountMatch = context.followedNPCs.match(/Following (\d+) NPCs/);
      const followedCount = followCountMatch ? parseInt(followCountMatch[1]) : 0;
      
      // Calculate probability based on followed count to manage AI costs
      let probability = 1.0; // 100% chance by default
      if (followedCount > 5) {
        // Scale down probability: 6 follows = 80%, 7 = 70%, 8 = 60%, etc.
        probability = Math.max(0.3, 1.1 - (followedCount * 0.1));
      }
      
      // Generate tweets from followed accounts with scaled probability
      followedTweetsCount = Math.min(Math.ceil(followedCount * probability), numberOfTweets - tweets.length, 4); // Cap at 4 max
      
      for (let i = 0; i < followedTweetsCount; i++) {
        // Each individual tweet still has the probability check
        if (Math.random() <= probability) {
          try {
            const followedTweet = await generateFollowedAccountTweet(context);
            if (followedTweet) {
              tweets.push(followedTweet);
            }
          } catch (error) {
            console.error('Error generating followed account tweet:', error);
          }
        }
      }
    }
    
    // Generate remaining tweets from player-focused accounts
    const remainingTweets = numberOfTweets - tweets.length;
    for (let i = 0; i < remainingTweets; i++) {
      try {
        const accountType = PLAYER_FOCUSED_ACCOUNT_TYPES[Math.floor(Math.random() * PLAYER_FOCUSED_ACCOUNT_TYPES.length)];
        const playerFocusedTweet = await generatePlayerFocusedTweet(accountType, context);
        if (playerFocusedTweet) {
          tweets.push(playerFocusedTweet);
        }
      } catch (error) {
        console.error('Error generating player-focused tweet:', error);
      }
    }
    
    return tweets;
  } catch (error) {
    console.error('Error generating NPC tweets:', error);
    throw error;
  }
}

/**
 * Generate a tweet for predefined accounts (ESPN, F1) about their own topics
 * @param {Object} account - Predefined account configuration  
 * @returns {string} Generated tweet content
 */
async function generateTweetForPredefinedAccount(account) {
  try {
    const systemPrompt = `You are ${account.name} (${account.username}), focused on ${account.topic}. 
Your personality: ${account.personality}

Generate a tweet about ${account.topic}. This should be completely unrelated to music - focus only on your specific domain (sports for ESPN, racing for Formula 1). Keep it under 100 characters, engaging, and authentic to your brand. Use minimal emojis (1-2 max) and NO hashtags.

Create a realistic ${account.topic} update that could actually be posted by this account today.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Generate a ${account.topic} tweet.`
        }
      ],
      max_tokens: 100,
      temperature: 0.8,
    });

    return completion.choices[0]?.message?.content?.trim();
  } catch (error) {
    console.error(`Error generating tweet for ${account.username}:`, error);
    return null;
  }
}

/**
 * Generate a tweet from a followed NPC account
 * @param {Object} context - Game context data
 * @returns {Object} Generated tweet with account details
 */
async function generateFollowedAccountTweet(context) {
  try {
    // Generate a tweet that directly mentions or interacts with the player
    const followedAccountTypes = [
      {
        type: 'industry_friend',
        personality: 'Friendly industry contact who supports the artist and occasionally interacts publicly',
        topics: ['supportive messages', 'collaboration hints', 'behind-the-scenes friendship']
      },
      {
        type: 'mentor_figure',
        personality: 'Established artist or industry veteran who gives advice and shows public support',
        topics: ['career advice', 'industry wisdom', 'public endorsement']
      },
      {
        type: 'collaborator',
        personality: 'Another artist or producer who has worked with or wants to work with the player',
        topics: ['collaboration announcements', 'studio sessions', 'creative process']
      }
    ];

    const accountType = followedAccountTypes[Math.floor(Math.random() * followedAccountTypes.length)];
    
    const systemPrompt = `Create a tweet from a ${accountType.type} who follows and knows this artist personally.

Account Type: ${accountType.type}
Personality: ${accountType.personality}
Topics: ${accountType.topics.join(', ')}

Artist Information:
- Artist Name: ${context.playerName || 'Unknown Artist'}
- Artist Age: ${context.playerAge || 'Unknown'}
- Last Released Single: ${context.lastReleasedSingle || 'None'}
- Current Reach: ${context.reach || 'Unknown'}

Generate a tweet that directly mentions or references the artist by name, showing a personal connection. This should feel like it comes from someone who actually knows the artist. Use minimal emojis (1-2 max) and NO hashtags.
less than 100 characters.

Response format should be a JSON object:
{
  "username": "@ExampleAccount",
  "name": "Account Display Name",
  "content": "The tweet content that mentions ${context.playerName || 'the artist'} directly",
  "accountType": "${accountType.type}"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Generate a ${accountType.type} tweet that mentions ${context.playerName || 'the artist'}.`
        }
      ],
      max_tokens: 150,
      temperature: 0.9,
    });

    const response = completion.choices[0]?.message?.content?.trim();
    
    try {
      const tweetData = JSON.parse(response);
      
      return {
        id: `followed_${accountType.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        username: tweetData.username,
        name: tweetData.name,
        avatar: getRandomAvatarImage(),
        content: tweetData.content,
        timestamp: new Date().toISOString(),
        isNPC: true,
        accountType: `followed_${accountType.type}`,
        topic: `followed-account-${accountType.type}`
      };
    } catch (parseError) {
      console.error('Error parsing followed account tweet JSON:', parseError);
      return null;
    }
  } catch (error) {
    console.error('Error generating followed account tweet:', error);
    return null;
  }
}

/**
 * Generate a player-focused tweet from a dynamically created account
 * @param {Object} accountType - Player-focused account type configuration
 * @param {Object} context - Game context data
 * @returns {Object} Generated tweet with account details
 */
async function generatePlayerFocusedTweet(accountType, context) {
  try {
    const systemPrompt = `Create a tweet about this specific artist's career from a ${accountType.type} perspective.

Account Type: ${accountType.type}
Personality: ${accountType.personality}
Topics you focus on: ${accountType.topics.join(', ')}

Artist's Current Career Status:
- Artist Name: ${context.playerName || 'Unknown Artist'}
- Artist Age: ${context.playerAge || 'Unknown'}
- Date: ${context.date || 'Current week'}
- Last Released Single: ${context.lastReleasedSingle || 'None'}
- Last Released Album: ${context.lastReleasedAlbum || 'None'}
- Current Reach: ${context.reach || 'Unknown'}
- Charting Songs: ${context.chartingSongs || 'None currently charting'}
- Next Project Hype: ${context.nextProjectHype || 'No upcoming projects announced'}
- Followed NPCs: ${context.followedNPCs || 'None'}

Generate both a fictional account and tweet content. Use minimal emojis (1-2 max) and NO hashtags. Make it remarkable and authentic to the ${accountType.type} personality.
less than 100 characters.
Response format should be a JSON object:
{
  "username": "@ExampleAccount",
  "name": "Account Display Name", 
  "content": "The tweet content about this artist (be remarkable aand witty)",
  "accountType": "${accountType.type}"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Generate a ${accountType.type} tweet about this artist.`
        }
      ],
      max_tokens: 150,
      temperature: 0.9,
    });

    const response = completion.choices[0]?.message?.content?.trim();
    
    try {
      const tweetData = JSON.parse(response);
      
      return {
        id: `player_focused_${accountType.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        username: tweetData.username,
        name: tweetData.name,
        avatar: getRandomAvatarImage(),
        content: tweetData.content,
        timestamp: new Date().toISOString(),
        isNPC: true,
        accountType: accountType.type,
        topic: `player-focused-${accountType.type}`
      };
    } catch (parseError) {
      console.error('Error parsing player-focused tweet JSON:', parseError);
      return null;
    }
  } catch (error) {
    console.error('Error generating player-focused tweet:', error);
    return null;
  }
}

/**
 * Generate a specific tweet for an NPC account (DEPRECATED - keeping for compatibility)
 * @param {Object} account - NPC account configuration  
 * @param {Object} context - Game context data
 * @returns {string} Generated tweet content
 */


/**
 * Generate remarkable context-based tweets from made-up accounts
 * @param {Object} context - Game context data
 * @param {number} numberOfTweets - Number of remarkable tweets to generate
 * @returns {Array} Generated remarkable tweets
 */

/**
 * Generate a single remarkable tweet with dynamic account
 * @param {Object} context - Game context data
 * @returns {Object} Generated remarkable tweet
 */


// Removed getRandomAccounts function - no longer needed with new implementation

/**
 * Generate and store NPC tweets for a user
 * @param {string} userId - User ID
 * @param {Object} context - Game context data
 * @returns {Object} Generation results
 */
async function generateAndStoreNPCTweets(userId, context) {
  try {
    // Generate 8 tweets total: 2 predefined (ESPN, F1) + followed NPC tweets (scaled by count) + remaining player-focused
    const allTweets = await generateNPCTweets(context, 8);
    
    // Store tweets in database (if needed for persistence)
    // For now, we'll just return them to be handled by the client
    
    const predefinedCount = allTweets.filter(t => ['espn', 'formula1'].includes(t.accountType)).length;
    const playerFocusedCount = allTweets.length - predefinedCount;
    
    return {
      success: true,
      tweets: allTweets,
      generated: allTweets.length,
      predefinedCount: predefinedCount,
      playerFocusedCount: playerFocusedCount
    };
  } catch (error) {
    console.error('Error generating and storing NPC tweets:', error);
    throw error;
  }
}

module.exports = {
  generateNPCTweets,
  generateAndStoreNPCTweets,
  getPredefinedAccounts,
  PLAYER_FOCUSED_ACCOUNT_TYPES
};