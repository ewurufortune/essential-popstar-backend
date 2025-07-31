# Essential Popstar Backend

Backend API for the Essential Popstar mobile game, handling power management and coffee purchases.

## Features

- **Power System**: Track user power with automatic refill
- **Coffee Purchases**: RevenueCat webhook integration for in-app purchases
- **User Management**: Custom user ID system with Supabase integration
- **Admin Tools**: Power management and user monitoring

## API Endpoints

### Power Management
- `GET /api/me/power` - Get current power status
- `POST /api/me/power/spend` - Spend power for actions
- `GET /api/me/power/history` - Get power transaction history

### Webhooks
- `POST /api/webhooks/revenuecat` - Handle RevenueCat purchase events

### Admin
- `GET /api/admin/power/config` - Get power configuration
- `POST /api/admin/power/grant` - Grant power to users
- `GET /api/admin/users/:userId/power` - Get user power status

## Environment Variables

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret
PORT=3000
NODE_ENV=production
```

## Deployment

This backend is configured for Railway deployment:

1. Connect your GitHub repository to Railway
2. Set the environment variables in Railway dashboard
3. Railway will automatically deploy on git push

## Local Development

```bash
npm install
npm start
```

Make sure to set up your environment variables in a `.env` file (see `.env.example`).