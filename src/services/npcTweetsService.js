const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get random aesthetic images for NPC avatars
const getRandomAvatarImage = () => {
  const avatarImages = [
    '/assets/npc-avatars/espn-music.jpeg',
    '/assets/npc-avatars/tmz-entertainment.jpg', 
    '/assets/npc-avatars/formula1-beats.jpg',
    '/assets/npc-avatars/popculture-insider.jpg',
    '/assets/npc-avatars/music-metrics.jpg'
  ];
  return avatarImages[Math.floor(Math.random() * avatarImages.length)];
};

// Predefined NPC accounts (only 2) - they post about their own topics, not music
const PREDEFINED_ACCOUNTS = [
  {
    id: 'espn',
    username: '@ESPN',
    name: 'ESPN',
    topic: 'sports news and updates',
    personality: 'Professional sports broadcaster, reports on games, trades, and athletic achievements',
    avatar: '/assets/npc-avatars/espn-music.jpeg',
    aboutPlayer: false
  },
  {
    id: 'formula1',
    username: '@Formula1',
    name: 'Formula 1',
    topic: 'racing news and F1 updates',
    personality: 'High-energy racing coverage, focuses on races, drivers, and racing culture',
    avatar: '/assets/npc-avatars/formula1-beats.jpg',
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
    
    // Generate 6 tweets from player-focused accounts
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

Generate a tweet about ${account.topic}. This should be completely unrelated to music - focus only on your specific domain (sports for ESPN, racing for Formula 1). Keep it under 280 characters, engaging, and authentic to your brand. Use minimal emojis (1-2 max) and NO hashtags.

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
- Date: ${context.date || 'Current week'}
- Last Released Single: ${context.lastReleasedSingle || 'None'}
- Last Released Album: ${context.lastReleasedAlbum || 'None'}
- Current Reach: ${context.reach || 'Unknown'}
- Charting Songs: ${context.chartingSongs || 'None currently charting'}
- Next Project Hype: ${context.nextProjectHype || 'No upcoming projects announced'}

Generate both a fictional account and tweet content. Use minimal emojis (1-2 max) and NO hashtags. Make it authentic to the ${accountType.type} personality.

Response format should be a JSON object:
{
  "username": "@ExampleAccount",
  "name": "Account Display Name", 
  "content": "The tweet content about this artist",
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
async function generateTweetForAccount(account, context) {
  try {
    const systemPrompt = `You are ${account.name} (${account.username}), a social media account focused on ${account.topic}. 
Your personality: ${account.personality}

Generate a tweet about this artist's career progress and current situation. Keep it under 280 characters, engaging, and true to your account's voice. Use minimal emojis (1-2 max) and NO hashtags.

Artist's Current Career Status:
- Date: ${context.date || 'Current week'}
- Last Released Single: ${context.lastReleasedSingle || 'None'}
- Last Released Album: ${context.lastReleasedAlbum || 'None'}
- Current Reach: ${context.reach || 'Unknown'}
- Charting Songs: ${context.chartingSongs || 'None currently charting'}
- Next Project Hype: ${context.nextProjectHype || 'No upcoming projects announced'}

Create a tweet that comments on this specific artist's career trajectory, recent releases, or current chart performance. Make it feel like authentic industry commentary from your account's perspective.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: 'Generate an engaging tweet based on the current context.'
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
 * Generate remarkable context-based tweets from made-up accounts
 * @param {Object} context - Game context data
 * @param {number} numberOfTweets - Number of remarkable tweets to generate
 * @returns {Array} Generated remarkable tweets
 */
async function generateRemarkableTweets(context, numberOfTweets = 3) {
  try {
    const tweets = [];
    
    for (let i = 0; i < numberOfTweets; i++) {
      try {
        const tweet = await generateRemarkableTweet(context);
        if (tweet) {
          tweets.push(tweet);
        }
      } catch (error) {
        console.error('Error generating remarkable tweet:', error);
        // Continue with other tweets even if one fails
      }
    }
    
    return tweets;
  } catch (error) {
    console.error('Error generating remarkable tweets:', error);
    throw error;
  }
}

/**
 * Generate a single remarkable tweet with dynamic account
 * @param {Object} context - Game context data
 * @returns {Object} Generated remarkable tweet
 */
async function generateRemarkableTweet(context) {
  try {
    const systemPrompt = `Create a remarkable tweet about this specific artist's career situation from a fictional but believable social media account.

You should:
1. Create a fictional but believable social media account name and username
2. Generate content that could realistically go viral or be highly engaging
3. Reference this specific artist's career status in a creative, surprising, or humorous way
4. Keep it under 280 characters
5. Use minimal emojis (1-2 max) and NO hashtags
6. Make it feel authentic to current social media trends

Artist's Current Career Status:
- Date: ${context.date || 'Current week'}
- Last Released Single: ${context.lastReleasedSingle || 'None'}
- Last Released Album: ${context.lastReleasedAlbum || 'None'}
- Current Reach: ${context.reach || 'Unknown'}
- Charting Songs: ${context.chartingSongs || 'None currently charting'}
- Next Project Hype: ${context.nextProjectHype || 'No upcoming projects announced'}

Response format should be a JSON object with:
{
  "username": "@ExampleAccount",
  "name": "Example Account Name",
  "content": "The tweet content here about this artist",
  "accountType": "brief description of account type"
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
          content: 'Generate a remarkable tweet with account details.'
        }
      ],
      max_tokens: 150,
      temperature: 0.9,
    });

    const response = completion.choices[0]?.message?.content?.trim();
    
    try {
      const tweetData = JSON.parse(response);
      
      return {
        id: `remarkable_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        username: tweetData.username,
        name: tweetData.name,
        avatar: getRandomAvatarImage(),
        content: tweetData.content,
        timestamp: new Date().toISOString(),
        isNPC: true,
        accountType: 'remarkable',
        topic: tweetData.accountType
      };
    } catch (parseError) {
      console.error('Error parsing remarkable tweet JSON:', parseError);
      return null;
    }
  } catch (error) {
    console.error('Error generating remarkable tweet:', error);
    return null;
  }
}

/**
 * Get random selection of NPC accounts
 * @param {number} count - Number of accounts to select
 * @returns {Array} Random selection of accounts
 */
function getRandomAccounts(count) {
  const shuffled = [...NPC_ACCOUNTS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, NPC_ACCOUNTS.length));
}

/**
 * Generate and store NPC tweets for a user
 * @param {string} userId - User ID
 * @param {Object} context - Game context data
 * @returns {Object} Generation results
 */
async function generateAndStoreNPCTweets(userId, context) {
  try {
    // Generate 8 tweets total: 2 predefined (ESPN, F1) + 6 player-focused
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
  PREDEFINED_ACCOUNTS,
  PLAYER_FOCUSED_ACCOUNT_TYPES
};