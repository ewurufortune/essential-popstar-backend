const db = require('../services/database');

/**
 * Authentication middleware that extracts user ID from Authorization header
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Authorization header required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Extract token from "Bearer token" format
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({ 
        error: 'Invalid authorization format',
        code: 'INVALID_AUTH_FORMAT'
      });
    }

    // For Apple auth tokens, extract user ID from token format: "apple_USER_ID"
    let userId = null;
    
    if (token.startsWith('apple_')) {
      userId = token.replace('apple_', '');
    } else {
      // Handle other token formats if needed (Supabase JWT, etc.)
      return res.status(401).json({ 
        error: 'Unsupported token format',
        code: 'UNSUPPORTED_TOKEN'
      });
    }

    if (!userId) {
      return res.status(401).json({ 
        error: 'Could not extract user ID from token',
        code: 'INVALID_TOKEN'
      });
    }

    // Verify user exists in database and get/create if needed
    try {
      const user = await db.getOrCreateUser(userId);
      
      // Add user info to request object
      req.user = {
        id: user.id,
        ...user
      };
      
      next();
    } catch (error) {
      console.error('User verification failed:', error);
      return res.status(401).json({ 
        error: 'User verification failed',
        code: 'USER_VERIFICATION_FAILED'
      });
    }

  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication processing failed',
      code: 'AUTH_ERROR'
    });
  }
};

module.exports = { authenticate };