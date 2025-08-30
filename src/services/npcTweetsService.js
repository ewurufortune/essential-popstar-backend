const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get random aesthetic images for NPC avatars from expanded collection
const getRandomAvatarImage = (baseUrl = process.env.BACKEND_URL || 'https://essential-popstar-backend-production.up.railway.app') => {
  const avatarCategories = [
    // Original avatars
    'avatar1.jpeg', 'avatar2.jpg', 'avatar3.jpg', 'avatar4.jpg', 'avatar5.jpg',
    'Image_010.jpg', 'Image_020.jpg', 'Image_030.jpg', 'Image_040.jpg', 'Image_050.jpg',
    
    // Aesthetic avatars - fashion and trendy
    'ep_aesthetics/avatar_001.jpg', 'ep_aesthetics/avatar_002.jpg', 'ep_aesthetics/avatar_003.jpg', 'ep_aesthetics/avatar_004.jpg',
    'ep_aesthetics/avatar_005.jpg', 'ep_aesthetics/avatar_006.jpg', 'ep_aesthetics/avatar_007.jpg', 'ep_aesthetics/avatar_008.jpg',
    'ep_aesthetics/avatar_009.jpg', 'ep_aesthetics/avatar_010.jpg', 'ep_aesthetics/avatar_011.jpg', 'ep_aesthetics/avatar_012.jpg',
    'ep_aesthetics/avatar_013.jpg', 'ep_aesthetics/avatar_014.jpg', 'ep_aesthetics/avatar_015.jpg', 'ep_aesthetics/avatar_016.jpg',
    'ep_aesthetics/avatar_017.jpg', 'ep_aesthetics/avatar_018.jpg', 'ep_aesthetics/avatar_019.jpg', 'ep_aesthetics/avatar_020.jpg',
    
    // Fitness avatars - gym and sports
    'ep_fitness/avatar_001.jpg', 'ep_fitness/avatar_002.jpg', 'ep_fitness/avatar_003.jpg', 'ep_fitness/avatar_004.jpg',
    'ep_fitness/avatar_005.jpg', 'ep_fitness/avatar_006.jpg', 'ep_fitness/avatar_007.jpg', 'ep_fitness/avatar_008.jpg',
    'ep_fitness/avatar_009.jpg', 'ep_fitness/avatar_010.jpg', 'ep_fitness/avatar_011.jpg',
    
    // Professional avatars - business and academia
    'ep_grownups/avatar_001.jpg', 'ep_grownups/avatar_002.jpg', 'ep_grownups/avatar_003.jpg', 'ep_grownups/avatar_004.jpg',
    'ep_grownups/avatar_005.jpg', 'ep_grownups/avatar_006.jpg', 'ep_grownups/avatar_007.jpg', 'ep_grownups/avatar_008.jpg',
    'ep_grownups/avatar_009.jpg', 'ep_grownups/avatar_010.jpg', 'ep_grownups/avatar_011.jpg', 'ep_grownups/avatar_012.jpg',
    'ep_grownups/avatar_013.jpg', 'ep_grownups/avatar_014.jpg', 'ep_grownups/avatar_015.jpg', 'ep_grownups/avatar_016.jpg',
    
    // Hip-hop avatars
    'ep_hiphop/avatar_001.jpg', 'ep_hiphop/avatar_002.jpg', 'ep_hiphop/avatar_003.jpg', 'ep_hiphop/avatar_004.jpg',
    
    // Tech/crypto avatars
    'ep_onlinemoney/avatar_001.jpg', 'ep_onlinemoney/avatar_002.jpg', 'ep_onlinemoney/avatar_003.jpg', 'ep_onlinemoney/avatar_004.jpg',
    'ep_onlinemoney/avatar_005.jpg', 'ep_onlinemoney/avatar_006.jpg', 'ep_onlinemoney/avatar_007.jpg', 'ep_onlinemoney/avatar_008.jpg',
    'ep_onlinemoney/avatar_009.jpg', 'ep_onlinemoney/avatar_010.jpg', 'ep_onlinemoney/avatar_011.jpg', 'ep_onlinemoney/avatar_012.jpg',
    'ep_onlinemoney/avatar_013.jpg', 'ep_onlinemoney/avatar_014.jpg', 'ep_onlinemoney/avatar_015.jpg', 'ep_onlinemoney/avatar_016.jpg',
    'ep_onlinemoney/avatar_017.jpg', 'ep_onlinemoney/avatar_018.jpg', 'ep_onlinemoney/avatar_019.jpg', 'ep_onlinemoney/avatar_020.jpg'
  ];
  
  const randomAvatar = avatarCategories[Math.floor(Math.random() * avatarCategories.length)];
  return `${baseUrl}/assets/npc-avatars/${randomAvatar}`;
};

// Predefined NPC accounts - they post about their own topics, not music
const getPredefinedAccounts = (baseUrl = process.env.BACKEND_URL || 'https://essential-popstar-backend-production.up.railway.app') => [
  // Tech & AI Community
  {
    id: 'techcunch',
    username: '@TechBrunch',
    name: 'TechBrunch',
    topic: 'tech news and startups',
    personality: 'Leading tech journalism, reports on startups, funding rounds, and tech industry trends',
    avatar: `${baseUrl}/assets/npc-avatars/premade/tech_journalist.jpg`,
    aboutPlayer: false
  },
  {
    id: 'sama',
    username: '@samtwinkletoes',
    name: 'Sam twinkletoes',
    topic: 'AI and OpenAI developments',
    personality: 'AI pioneer and OpenAI CEO, shares insights on artificial intelligence and the future of technology',
    avatar: `${baseUrl}/assets/npc-avatars/premade/tech_founder.jpg`,
    aboutPlayer: false
  },
  {
    id: 'pmarca',
    username: '@peamarca',
    name: 'Marc Andreason',
    topic: 'venture capital and tech thought leadership',
    personality: 'Veteran VC and tech thought leader, shares bold takes on technology and entrepreneurship',
    avatar: `${baseUrl}/assets/npc-avatars/premade/startup_founder.jpg`,
    aboutPlayer: false
  },
  
  // Crypto & Web3 Community
  {
    id: 'cz_binance',
    username: '@cz_binance',
    name: 'Changping Zhao',
    topic: 'cryptocurrency and Binance updates',
    personality: 'Binance founder, shares crypto market insights and blockchain developments',
    avatar: `${baseUrl}/assets/npc-avatars/premade/crypto_expert.jpg`,
    aboutPlayer: false
  },
  {
    id: 'vitalikbuterin',
    username: '@VitalikButerin',
    name: 'Vitalic Butterin',
    topic: 'Ethereum and blockchain technology',
    personality: 'Ethereum co-founder, discusses blockchain innovation and decentralized systems',
    avatar: `${baseUrl}/assets/npc-avatars/premade/tech_founder.jpg`,
    aboutPlayer: false
  },
  {
    id: 'coindesk',
    username: '@CoinTable',
    name: 'CoinTable',
    topic: 'cryptocurrency news and market analysis',
    personality: 'Leading crypto news outlet, reports on market trends and blockchain developments',
    avatar: `${baseUrl}/assets/npc-avatars/premade/tech_journalist.jpg`,
    aboutPlayer: false
  },

  // Finance & Investing (FinTwit)
  {
    id: 'michaelbatnick',
    username: '@michaelboatnick',
    name: 'Michael Boatnick',
    topic: 'investment commentary and market analysis',
    personality: 'Investment officer at Ritholtz Wealth, shares market insights and financial wisdom',
    avatar: `${baseUrl}/assets/npc-avatars/premade/business_exec.jpg`,
    aboutPlayer: false
  },
  {
    id: 'elerianm',
    username: '@mohamedel-rian',
    name: 'Mohamed El-Rian',
    topic: 'economic analysis and global markets',
    personality: 'Renowned economist, provides deep insights on global economic trends and policy',
    avatar: `${baseUrl}/assets/npc-avatars/premade/business_exec.jpg`,
    aboutPlayer: false
  },
  {
    id: 'rampcapitalllc',
    username: '@RampCapitalLLC',
    name: 'Ramp Capital',
    topic: 'market commentary and trading insights',
    personality: 'Popular market commentator, shares witty takes on trading and market movements',
    avatar: `${baseUrl}/assets/npc-avatars/premade/startup_founder.jpg`,
    aboutPlayer: false
  },

  // Sports Twitter
  {
    id: 'espn',
    username: '@BSPN',
    name: 'BSPN',
    topic: 'sports news and updates',
    personality: 'Professional sports broadcaster, reports on games, trades, and athletic achievements',
    avatar: `${baseUrl}/assets/npc-avatars/premade/sports_reporter.jpg`,
    aboutPlayer: false
  },
  {
    id: 'fabrizioromano',
    username: '@FabrizioRomaino',
    name: 'Fabrizio Romaino',
    topic: 'football transfers and soccer news',
    personality: 'Football transfers authority, breaks major transfer news with signature "Here we go!"',
    avatar: `${baseUrl}/assets/npc-avatars/premade/sports_reporter.jpg`,
    aboutPlayer: false
  },
  {
    id: 'bleacherreport',
    username: '@BleacherRetort',
    name: 'Bleacher Retort',
    topic: 'sports highlights and memes',
    personality: 'Sports entertainment hub, combines highlights with memes and viral sports content',
    avatar: `${baseUrl}/assets/npc-avatars/premade/journalist.jpg`,
    aboutPlayer: false
  },

  // Political Twitter
  {
    id: 'aoc',
    username: '@AlexandriaOC',
    name: 'Alexandria Osio-Cez',
    topic: 'US politics and progressive policy',
    personality: 'Progressive congresswoman, shares political commentary and policy advocacy',
    avatar: `${baseUrl}/assets/npc-avatars/premade/political_figure.jpg`,
    aboutPlayer: false
  },
  {
    id: 'tuckercarlson',
    username: '@TuckerCarlson',
    name: 'Tucker Carlson',
    topic: 'conservative commentary and politics',
    personality: 'Conservative commentator, shares right-wing political perspectives and cultural commentary',
    avatar: `${baseUrl}/assets/npc-avatars/premade/entertainment_reporter.jpg`,
    aboutPlayer: false
  },
  {
    id: 'washingtonpost',
    username: '@washingtonmail',
    name: 'The Washington Mail',
    topic: 'political reporting and breaking news',
    personality: 'Influential newspaper, reports on political developments and investigative journalism',
    avatar: `${baseUrl}/assets/npc-avatars/premade/author.jpg`,
    aboutPlayer: false
  },

  // Academic / Science Twitter
  {
    id: 'neiltyson',
    username: '@neildegressityson',
    name: 'Neil deGrassi Tyson',
    topic: 'astrophysics and science education',
    personality: 'Renowned astrophysicist, makes complex science accessible with wit and clarity',
    avatar: `${baseUrl}/assets/npc-avatars/premade/sports_reporter.jpg`,
    aboutPlayer: false
  },
  

  {
    id: 'variety',
    username: '@Variety',
    name: 'Variety',
    topic: 'entertainment industry news',
    personality: 'Entertainment industry authority, reports on Hollywood news and industry developments',
    avatar: `${baseUrl}/assets/npc-avatars/premade/sports_reporter.jpg`,
    aboutPlayer: false
  },
 
  {
    id: 'chartdata',
    username: '@chartdata',
    name: 'Chart Data',
    topic: 'music charts and streaming data',
    personality: 'Key chart updates account, provides real-time music chart data used by stan communities',
    avatar: `${baseUrl}/assets/npc-avatars/premade/entertainment_reporter.jpg`,
    aboutPlayer: false
  },

  // Gaming Twitter
  {
    id: 'ninja',
    username: '@Ninja',
    name: 'Ninja',
    topic: 'gaming and streaming content',
    personality: 'Popular streamer and gamer, shares gaming highlights and streaming culture',
    avatar: `${baseUrl}/assets/npc-avatars/premade/author.jpg`,
    aboutPlayer: false
  },
  
  {
    id: 'ign',
    username: '@ING',
    name: 'ING',
    topic: 'gaming and entertainment news',
    personality: 'Gaming and entertainment news outlet, reviews games and covers pop culture',
    avatar: `${baseUrl}/assets/npc-avatars/premade/journalist.jpg`,
    aboutPlayer: false
  },

  // Comedy / Meme Twitter
 
  {
    id: 'theonion',
    username: '@TheOnion',
    name: 'The Onion',
    topic: 'satirical news and comedy',
    personality: 'Satirical news publication, creates humorous fake news headlines and social commentary',
    avatar: `${baseUrl}/assets/npc-avatars/premade/entertainment_reporter.jpg`,
    aboutPlayer: false
  },


  // Business & Entrepreneurship Twitter

  {
    id: 'naval',
    username: '@naval',
    name: 'Naval',
    topic: 'entrepreneurship and philosophy',
    personality: 'Angel investor and philosopher, shares wisdom on entrepreneurship and life principles',
    avatar: `${baseUrl}/assets/npc-avatars/premade/journalist.jpg`,
    aboutPlayer: false
  },
  {
    id: 'business',
    username: '@boombergbusiness',
    name: 'Boomberg Business',
    topic: 'business news and market updates',
    personality: 'Bloomberg Business news, reports on corporate developments and market trends',
    avatar: `${baseUrl}/assets/npc-avatars/premade/political_figure.jpg`,
    aboutPlayer: false
  },

  // Journalism / Media Twitter
  {
    id: 'nytimes',
    username: '@newyorkpines',
    name: 'The New York Pines',
    topic: 'breaking news and journalism',
    personality: 'Prestigious newspaper, provides comprehensive news coverage and investigative reporting',
    avatar: `${baseUrl}/assets/npc-avatars/premade/entertainment_reporter.jpg`,
    aboutPlayer: false
  },
 



  // Football (Soccer) Twitter
  {
    id: 'fifaworldcup',
    username: '@FIFAWorldCup',
    name: 'FIFA World Cup',
    topic: 'World Cup and international football',
    personality: 'Official World Cup account, covers the biggest tournament in football',
    avatar: `${baseUrl}/assets/npc-avatars/premade/author.jpg`,
    aboutPlayer: false
  },
  {
    id: 'premierleague',
    username: '@premierleague',
    name: 'Premier League',
    topic: 'English Premier League football',
    personality: 'Official Premier League account, covers the most-watched football league globally',
    avatar: `${baseUrl}/assets/npc-avatars/premade/sports_reporter.jpg`,
    aboutPlayer: false
  },
  {
    id: 'uefa',
    username: '@UEFA',
    name: 'UEFA',
    topic: 'European football competitions',
    personality: 'European football governing body, covers Champions League and European competitions',
    avatar: `${baseUrl}/assets/npc-avatars/premade/journalist.jpg`,
    aboutPlayer: false
  },

  // Hip-Hop / Rap Twitter
  {
    id: 'complexmusic',
    username: '@complexmusic',
    name: 'Complex Music',
    topic: 'hip-hop culture and music news',
    personality: 'Hip-hop culture authority, covers rap music and urban culture developments',
    avatar: `${baseUrl}/assets/npc-avatars/premade/political_figure.jpg`,
    aboutPlayer: false
  },


  // Film Twitter
  {
    id: 'discussingfilm',
    username: '@DiscussingFilm',
    name: 'DiscussingFilm',
    topic: 'film discussion and movie news',
    personality: 'Big film discussion hub, covers movie releases and cinema culture',
    avatar: `${baseUrl}/assets/npc-avatars/premade/author.jpg`,
    aboutPlayer: false
  },
  {
    id: 'indiewire',
    username: '@IndieWire',
    name: 'IndieWire',
    topic: 'independent film and cinema',
    personality: 'Independent film culture publication, covers arthouse and indie cinema',
    avatar: `${baseUrl}/assets/npc-avatars/premade/sports_reporter.jpg`,
    aboutPlayer: false
  },

  // Book / Writer Twitter

  {
    id: 'nybooks',
    username: '@nybooks',
    name: 'NY Review of Books',
    topic: 'literary criticism and intellectual discourse',
    personality: 'Prestigious literary publication, provides in-depth book reviews and cultural analysis',
    avatar: `${baseUrl}/assets/npc-avatars/premade/author.jpg`,
    aboutPlayer: false
  },

  // Fashion Twitter
  {
    id: 'voguemagazine',
    username: '@voguemagazine',
    name: 'Vogue',
    topic: 'high fashion and style trends',
    personality: 'Fashion authority, sets trends and covers luxury fashion and style',
    avatar: `${baseUrl}/assets/npc-avatars/premade/sports_reporter.jpg`,
    aboutPlayer: false
  },
  {
    id: 'balenciaga',
    username: '@balenciagah',
    name: 'Balenciagah',
    topic: 'luxury fashion and avant-garde design',
    personality: 'Trendy fashion house, showcases cutting-edge design and luxury fashion',
    avatar: `${baseUrl}/assets/npc-avatars/premade/journalist.jpg`,
    aboutPlayer: false
  },


  // Food Twitter
  {
    id: 'nigella_lawson',
    username: '@Nigella_Lawson',
    name: 'Nigella Lawson',
    topic: 'cooking and food culture',
    personality: 'Celebrity chef and food writer, shares culinary wisdom and food passion',
    avatar: `${baseUrl}/assets/npc-avatars/premade/entertainment_reporter.jpg`,
    aboutPlayer: false
  },
  {
    id: 'eater',
    username: '@Eater',
    name: 'Eater',
    topic: 'food and dining journalism',
    personality: 'Food and dining publication, covers restaurant culture and culinary trends',
    avatar: `${baseUrl}/assets/npc-avatars/premade/author.jpg`,
    aboutPlayer: false
  },
  {
    id: 'gordonramsay',
    username: '@GordonRamses',
    name: 'Gordon Ramses',
    topic: 'cooking and culinary entertainment',
    personality: 'Celebrity chef with fiery personality, combines cooking expertise with entertainment',
    avatar: `${baseUrl}/assets/npc-avatars/premade/sports_reporter.jpg`,
    aboutPlayer: false
  },

  // Health & Fitness Twitter
  {
    id: 'hubermanlab',
    username: '@andrewblubberman',
    name: 'Andrew Blubberman',
    topic: 'science-based health and neuroscience',
    personality: 'Neuroscientist, shares science-based health and wellness insights',
    avatar: `${baseUrl}/assets/npc-avatars/premade/journalist.jpg`,
    aboutPlayer: false
  },

  {
    id: 'who',
    username: '@WHO',
    name: 'World Health Organization',
    topic: 'global health and public health policy',
    personality: 'Global health authority, provides public health guidance and disease prevention information',
    avatar: `${baseUrl}/assets/npc-avatars/premade/entertainment_reporter.jpg`,
    aboutPlayer: false
  },

  // Racing (keeping original Formula 1)
  {
    id: 'formula1',
    username: '@Formula1',
    name: 'Formula 1',
    topic: 'racing news and F1 updates',
    personality: 'High-energy racing coverage, focuses on races, drivers, and racing culture',
    avatar: `${baseUrl}/assets/npc-avatars/premade/author.jpg`,
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
async function generateNPCTweets(context, numberOfTweets = 7) {
  try {
    const tweets = [];
    const PREDEFINED_ACCOUNTS = getPredefinedAccounts();
    
    // Generate 2-3 tweets from random predefined accounts (not all of them)
    const shuffledAccounts = PREDEFINED_ACCOUNTS.sort(() => Math.random() - 0.5);
    const selectedAccounts = shuffledAccounts.slice(0, 3); // Take first 3 random accounts
    
    for (const account of selectedAccounts) {
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
    console.log('[FOLLOWED TWEETS] Context followedNPCs:', context.followedNPCs);
    const hasFollows = context.followedNPCs && context.followedNPCs !== 'None';
    let followedTweetsCount = 0;
    console.log('[FOLLOWED TWEETS] Has follows:', hasFollows);
    
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
      console.log(`[FOLLOWED TWEETS] followedCount: ${followedCount}, probability: ${probability}, followedTweetsCount: ${followedTweetsCount}`);
      
      for (let i = 0; i < followedTweetsCount; i++) {
        // Each individual tweet still has the probability check
        const randomCheck = Math.random();
        console.log(`[FOLLOWED TWEETS] Tweet ${i + 1}: random ${randomCheck} vs probability ${probability}`);
        if (randomCheck <= probability) {
          try {
            console.log('[FOLLOWED TWEETS] Calling generateFollowedAccountTweet...');
            const followedTweet = await generateFollowedAccountTweet(context);
            if (followedTweet) {
              console.log('[FOLLOWED TWEETS] Generated followed tweet:', followedTweet.content);
              tweets.push(followedTweet);
            } else {
              console.log('[FOLLOWED TWEETS] generateFollowedAccountTweet returned null/undefined');
            }
          } catch (error) {
            console.error('Error generating followed account tweet:', error);
          }
        } else {
          console.log(`[FOLLOWED TWEETS] Tweet ${i + 1} skipped due to probability`);
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
    
    // Randomize the order of all tweets before returning
    const shuffledTweets = tweets.sort(() => Math.random() - 0.5);
    
    return shuffledTweets;
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
      model: 'gpt-5-nano',
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
      max_completion_tokens: 100,
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
    console.log('[FOLLOWED TWEETS] Starting generateFollowedAccountTweet with context:', context.playerName);
    
    // Fetch actual followed NPCs from database
    const { data: followedNPCs, error } = await supabase
      .from('npc_profiles')
      .select('*');
    
    if (error) {
      console.error('[FOLLOWED TWEETS] Database error:', error);
      return null;
    }
    
    if (!followedNPCs || followedNPCs.length === 0) {
      console.log('[FOLLOWED TWEETS] No followed NPCs found in database');
      return null;
    }
    
    console.log(`[FOLLOWED TWEETS] Found ${followedNPCs.length} followed NPCs in database`);
    
    // Select random NPC from followed list
    const randomNPC = followedNPCs[Math.floor(Math.random() * followedNPCs.length)];
    console.log('[FOLLOWED TWEETS] Selected NPC:', randomNPC.name, randomNPC.username);
    
    const systemPrompt = `You are ${randomNPC.name} (${randomNPC.username}), a ${randomNPC.age_in_2024}-year-old ${randomNPC.genre} artist from ${randomNPC.country}.

Your personality and bio: ${randomNPC.twitter_bio || randomNPC.description}
Your current feeling: ${randomNPC.currently_feeling || 'creative and inspired'}
Your relationship with the player: ${randomNPC.your_relationship || 'supportive colleague'} (relationship score: ${randomNPC.relationship_score || 50}/100)

Artist you're tweeting about:
- Name: ${context.playerName || 'Unknown Artist'}
- Age: ${context.playerAge || 'Unknown'}
- Last Released Single: ${context.lastReleasedSingle || 'None'}
- Current Reach: ${context.reach || 'Unknown'}

Generate a tweet that either mentions the player directly, supports their work, or references something you both experienced. This should feel authentic to your personality as ${randomNPC.name}. Use minimal emojis (1-2 max) and NO hashtags. Keep it under 100 characters.

Just return the tweet content directly, no JSON formatting needed.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Generate a tweet from ${randomNPC.name} about or mentioning ${context.playerName || 'the artist'}.`
        }
      ],
      max_completion_tokens: 100,
      temperature: 0.9,
    });

    const tweetContent = completion.choices[0]?.message?.content?.trim();
    
    if (!tweetContent) {
      console.log('[FOLLOWED TWEETS] No tweet content generated');
      return null;
    }
    
    const tweetObject = {
      id: `followed_${randomNPC.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username: randomNPC.username.startsWith('@') ? randomNPC.username : `@${randomNPC.username}`,
      name: randomNPC.name,
      avatar: getRandomAvatarImage(),
      content: tweetContent,
      timestamp: new Date().toISOString(),
      isNPC: true,
      accountType: 'followed_npc',
      topic: `followed-npc-${randomNPC.genre.toLowerCase()}`
    };
    
    console.log('[FOLLOWED TWEETS] Generated tweet object:', tweetObject.username, '->', tweetObject.content);
    return tweetObject;
    
  } catch (error) {
    console.error('[FOLLOWED TWEETS] Error generating followed account tweet:', error);
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

Generate both a fictional account and tweet content. The username should sound like a REAL PERSON'S account, not obviously music-related. Use patterns like:
- Personal names + numbers: @jessica_m94, @alex_torres21, @samantha_k
- Location + name: @mikeintoronto, @brooklyn_sarah, @la_native_jen  
- Hobbies mixed: @coffee_and_books, @vintage_collector, @weekend_hiker
- Random personal: @moonlight_dreamer, @city_walker, @quiet_observer
- Subtle hints only: @melody_in_mind, @rhythm_walker (could be anyone who likes music)

AVOID obvious terms like: music, chart, critic, stan, industry, artist, song, album, beats, lyrics, streaming, etc.

Use minimal emojis (1-2 max) and NO hashtags. Make it remarkable and authentic to the ${accountType.type} personality.
Less than 100 characters.
Response format should be a JSON object:
{
  "username": "@realistic_username_here",
  "name": "Normal Person Name", 
  "content": "The tweet content about this artist (be remarkable and witty)",
  "accountType": "${accountType.type}"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-5-nano',
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
      max_completion_tokens: 150,
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
    // Generate 7 tweets total: 2-3 predefined + followed NPC tweets (scaled by count) + remaining player-focused
    const allTweets = await generateNPCTweets(context, 7);
    
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