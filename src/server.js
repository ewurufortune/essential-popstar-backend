require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Import routes
const powerRoutes = require('./routes/power');
const webhookRoutes = require('./routes/webhooks');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourapp.com'] // Add your production domains
    : true, // Allow all origins in development
  credentials: true
}));

// Health check endpoint (before body parsing)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'essential-popstar-backend' 
  });
});

// Body parsing middleware (except for webhooks)
app.use('/webhooks', webhookRoutes); // Webhooks handle their own body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API routes
app.use('/api', powerRoutes);
app.use('/api/admin', adminRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Essential Popstar Backend API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      power: {
        current: 'GET /api/me/power',
        spend: 'POST /api/me/power/spend',
        history: 'GET /api/me/power/history'
      },
      webhooks: {
        revenuecat: 'POST /webhooks/revenuecat',
        test: 'GET /webhooks/test'
      },
      admin: {
        config: 'GET|PUT /api/admin/power/config',
        grant: 'POST /api/admin/power/grant',
        userPower: 'GET /api/admin/users/:userId/power',
        userHistory: 'GET /api/admin/users/:userId/power/history'
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.originalUrl 
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  res.status(error.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Essential Popstar Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Supabase URL: ${process.env.SUPABASE_URL ? 'configured' : 'missing'}`);
  console.log(`RevenueCat webhook secret: ${process.env.REVENUECAT_WEBHOOK_SECRET ? 'configured' : 'missing'}`);
});

module.exports = app;