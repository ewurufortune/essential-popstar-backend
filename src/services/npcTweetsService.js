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

// Predefined NPC accounts with their topics and personalities
const NPC_ACCOUNTS = [
  {
    id: 'espn_music',
    username: '@ESPNMusic',
    name: 'ESPN Music',
    topic: 'sports and music crossovers',
    personality: 'Professional sports broadcaster tone, focuses on athletic achievements and music collaborations',
    avatar: '/assets/npc-avatars/espn-music.jpeg'
  },
  {
    id: 'tmz_entertainment',
    username: '@TMZEntertainment',
    name: 'TMZ Entertainment',
    topic: 'celebrity gossip and entertainment news',
    personality: 'Sensational tabloid style, dramatic and attention-grabbing headlines',
    avatar: '/assets/npc-avatars/tmz-entertainment.jpg'
  },
  {
    id: 'formula1_beats',
    username: '@Formula1Beats',
    name: 'Formula 1 Beats',
    topic: 'racing and music culture',
    personality: 'High-energy racing culture mixed with music appreciation, uses racing metaphors',
    avatar: '/assets/npc-avatars/formula1-beats.jpg'
  },
  {
    id: 'popculture_insider',
    username: '@PopCultureInsider',
    name: 'Pop Culture Insider',
    topic: 'trending pop culture moments',
    personality: 'Hip, trendy, always on top of the latest cultural movements',
    avatar: '/assets/npc-avatars/popculture-insider.jpg'
  },
  {
    id: 'music_metrics',
    username: '@MusicMetrics',
    name: 'Music Metrics',
    topic: 'music industry statistics and analysis',
    personality: 'Data-driven, analytical, focuses on numbers and industry trends',
    avatar: '/assets/npc-avatars/music-metrics.jpg'
  },
  {
    id: 'celebrity_watch',
    username: '@CelebrityWatch',
    name: 'Celebrity Watch',
    topic: 'celebrity lifestyle and achievements',
    personality: 'Glamorous, aspirational, focuses on success stories and lifestyle',
    avatar: getRandomAvatarImage()
  }
];

/**
 * Generate AI NPC tweets based on game context
 * @param {Object} context - Game context data
 * @param {number} numberOfTweets - Number of tweets to generate (default: 5)
 * @returns {Array} Generated NPC tweets
 */
async function generateNPCTweets(context, numberOfTweets = 5) {
  try {
    const tweets = [];
    
    // Select random accounts for this generation
    const selectedAccounts = getRandomAccounts(numberOfTweets);
    
    for (const account of selectedAccounts) {
      try {
        const tweet = await generateTweetForAccount(account, context);
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
        // Continue with other accounts even if one fails
      }
    }
    
    return tweets;
  } catch (error) {
    console.error('Error generating NPC tweets:', error);
    throw error;
  }
}

/**
 * Generate a specific tweet for an NPC account
 * @param {Object} account - NPC account configuration  
 * @param {Object} context - Game context data
 * @returns {string} Generated tweet content
 */
async function generateTweetForAccount(account, context) {
  try {
    const systemPrompt = `You are ${account.name} (${account.username}), a social media account focused on ${account.topic}. 
Your personality: ${account.personality}

Generate a tweet that relates to the current music industry context. Keep it under 280 characters, engaging, and true to your account's voice. Use emojis appropriately but don't overuse them.

Current Context:
- Date: ${context.date || 'Current week'}
- Last Released Single: ${context.lastReleasedSingle || 'None'}
- Last Released Album: ${context.lastReleasedAlbum || 'None'}
- Current Reach: ${context.reach || 'Unknown'}
- Charting Songs: ${context.chartingSongs || 'None currently charting'}
- Next Project Hype: ${context.nextProjectHype || 'No upcoming projects announced'}

Create a tweet that could realistically come from your account, referencing the current music scene or industry trends. Be creative and make it feel authentic to your brand.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
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
    const systemPrompt = `Create a remarkable, viral-worthy tweet about the current music industry situation. 

You should:
1. Create a fictional but believable social media account name and username
2. Generate content that could realistically go viral or be highly engaging
3. Reference the current context in a creative, surprising, or humorous way
4. Keep it under 280 characters
5. Make it feel authentic to current social media trends

Current Context:
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
  "content": "The tweet content here",
  "accountType": "brief description of account type"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
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
    // Generate both regular NPC tweets and remarkable tweets
    const [npcTweets, remarkableTweets] = await Promise.all([
      generateNPCTweets(context, 3),
      generateRemarkableTweets(context, 2)
    ]);
    
    const allTweets = [...npcTweets, ...remarkableTweets];
    
    // Store tweets in database (if needed for persistence)
    // For now, we'll just return them to be handled by the client
    
    return {
      success: true,
      tweets: allTweets,
      generated: allTweets.length,
      npcCount: npcTweets.length,
      remarkableCount: remarkableTweets.length
    };
  } catch (error) {
    console.error('Error generating and storing NPC tweets:', error);
    throw error;
  }
}

module.exports = {
  generateNPCTweets,
  generateRemarkableTweets,
  generateAndStoreNPCTweets,
  NPC_ACCOUNTS
};