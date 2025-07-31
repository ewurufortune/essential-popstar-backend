# Essential Popstar Backend - Power System

This backend provides AI credits (power) purchase functionality through RevenueCat integration and Supabase database management.

## Features

- ⚡ **Power System**: Automatic refill system (1 power every 30 minutes)
- ☕ **Coffee Purchases**: Buy power through RevenueCat (1 coffee = 8 power)
- 🔐 **Secure Webhooks**: RevenueCat signature verification
- 🗄️ **Database**: Supabase PostgreSQL with proper transactions
- 📊 **Admin Panel**: Configuration and user management endpoints

## Quick Setup

### 1. Database Setup (Supabase)

1. Go to your Supabase project: https://flhjukijsrrbvqhgiekt.supabase.co
2. Navigate to the SQL Editor
3. Run the schema from `supabase-schema.sql`

### 2. Backend Environment

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your values
npm run dev
```

### 3. RevenueCat Configuration

1. In RevenueCat dashboard, add your webhook URL: `https://your-backend-url.com/webhooks/revenuecat`
2. Copy the webhook signing secret to your `.env` file
3. Configure your products:
   - `1_coffee` - Single coffee (8 power)
   - `5_coffees` - Coffee pack (40 power)

### 4. Mobile App Configuration

Update the API base URL in `esspop/store/powerSlice.tsx`:
```typescript
const API_BASE_URL = 'https://your-backend-url.com/api';
```

## API Endpoints

### Power Management
- `GET /api/me/power` - Get current power status
- `POST /api/me/power/spend` - Spend power for actions
- `GET /api/me/power/history` - Get transaction history

### Webhooks
- `POST /webhooks/revenuecat` - RevenueCat purchase webhooks
- `GET /webhooks/test` - Test webhook connectivity

### Admin (require x-admin-key header)
- `GET /api/admin/power/config` - Get power configuration
- `PUT /api/admin/power/config` - Update power settings
- `POST /api/admin/power/grant` - Manually grant power to users

## Environment Variables

```env
# Supabase Configuration
SUPABASE_URL=https://flhjukijsrrbvqhgiekt.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key

# RevenueCat Configuration
REVENUECAT_WEBHOOK_SECRET=ABEgb5VhnER78

# Server Configuration
PORT=3000
NODE_ENV=production

# Product Configuration
COFFEE_1_POWER=8
COFFEE_5_POWER=40

# Admin Security
ADMIN_KEY=your_secure_admin_key
```

## Power System Logic

### Automatic Refills
- Power automatically refills +1 every 30 minutes
- Maximum power: 24 (configurable)
- Computed on-demand (no background jobs required)

### Purchases
- 1 Coffee = 8 Power bars
- 5 Coffees = 40 Power bars
- Webhook processes purchases idempotently
- Power granted immediately after successful purchase

### Spending
- Actions cost power (configurable per action)
- Transactions are atomic
- Cannot spend more power than available

## Database Schema

### Tables
- `app_users` - User records with custom IDs
- `power_config` - System configuration (refill rates, maximums)
- `power_balances` - Current power snapshots per user
- `power_ledger` - Append-only transaction log

### Key Features
- **Idempotent purchases** using RevenueCat transaction IDs
- **Computed refills** - no cron jobs needed
- **Atomic transactions** for spending/granting
- **Row Level Security** enabled

## Deployment

### Option 1: Railway/Render/Heroku
1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically

### Option 2: VPS/Docker
```bash
# Build and run
npm run build
npm start

# Or with PM2
npm install -g pm2
pm2 start src/server.js --name "essential-popstar-backend"
```

### Option 3: Serverless (Vercel/Netlify)
The backend is compatible with serverless deployment. Add a `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/server.js"
    }
  ]
}
```

## Testing

### Test Purchases (Development)
1. Use RevenueCat sandbox environment
2. Test with sandbox Apple/Google accounts
3. Monitor webhook deliveries in RevenueCat dashboard

### API Testing
```bash
# Test health
curl https://your-backend-url.com/health

# Test power endpoint (replace USER_ID)
curl -H "x-user-id: test_user_123" https://your-backend-url.com/api/me/power

# Test webhook endpoint
curl https://your-backend-url.com/webhooks/test
```

## Monitoring & Maintenance

### Logs
- All transactions are logged
- Webhook events are logged with details
- Error handling with proper HTTP status codes

### Admin Tasks
```bash
# Update power configuration
curl -X PUT -H "x-admin-key: your_admin_key" \
  -H "Content-Type: application/json" \
  -d '{"max_power": 30, "refill_interval_minutes": 25}' \
  https://your-backend-url.com/api/admin/power/config

# Grant power to user
curl -X POST -H "x-admin-key: your_admin_key" \
  -H "Content-Type: application/json" \
  -d '{"userId": "EP_20250131_ABC123", "amount": 50, "reason": "compensation"}' \
  https://your-backend-url.com/api/admin/power/grant
```

## Security Features

- **Signature Verification**: All RevenueCat webhooks verified with HMAC-SHA256
- **SQL Injection Protection**: Parameterized queries throughout
- **Rate Limiting**: Built-in request logging and error handling  
- **Environment Isolation**: Separate development/production configurations
- **Admin Authentication**: Secure admin endpoints with API keys

## Troubleshooting

### Common Issues

**Webhooks not working:**
- Check RevenueCat webhook URL configuration
- Verify webhook secret in environment variables
- Check server logs for signature verification errors

**Power not updating:**
- Ensure webhook is properly configured and firing
- Check Supabase connection and permissions
- Verify user ID format matches between app and backend

**Database connection issues:**
- Verify Supabase URL and API key
- Check Row Level Security policies
- Ensure database schema is properly created

### Support
For issues related to the Essential Popstar backend, check:
1. Server logs for detailed error messages
2. Supabase dashboard for database issues
3. RevenueCat dashboard for webhook delivery status