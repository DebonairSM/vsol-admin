# Payoneer Mass Payouts Integration - Setup Guide

## Overview

The Payoneer Mass Payouts integration allows you to view payee data from your Payoneer account. This is Phase 1 of the integration, providing read-only access to payee information.

## What Was Implemented

### Backend

1. **Database Schema**
   - New `settings` table for encrypted key-value storage
   - Stores API credentials securely with encryption
   - Migration: `0017_zippy_emma_frost.sql`

2. **Encryption Service**
   - `apps/api/src/lib/encryption.ts`
   - AES-256-GCM encryption for sensitive data
   - Requires `SETTINGS_ENCRYPTION_KEY` environment variable

3. **Settings Service**
   - `apps/api/src/services/settings-service.ts`
   - Methods: `getSetting()`, `setSetting()`, `listSettingKeys()`, `deleteSetting()`
   - Automatic encryption/decryption of values

4. **Payoneer Service**
   - `apps/api/src/services/payoneer-service.ts`
   - Methods: `testConnection()`, `getPayees()`, `getPayee(id)`
   - Axios-based HTTP client for Payoneer API v4

5. **API Routes**
   - Settings: `/api/settings/kv/:key` (GET, PUT, DELETE)
   - Settings: `/api/settings/keys` (GET)
   - Payoneer: `/api/payoneer/test` (GET)
   - Payoneer: `/api/payoneer/payees` (GET)
   - Payoneer: `/api/payoneer/payees/:id` (GET)

### Frontend

1. **Settings Page**
   - `/settings` route
   - Configure Payoneer API credentials
   - Test connection button
   - Link to payees page

2. **Payoneer Payees Page**
   - `/payoneer/payees` route
   - Display all payees in a table
   - Search/filter by name, email, or payee ID
   - Status badges (Active/Inactive/Pending)
   - Refresh button

3. **Custom Hooks**
   - `useGetSetting(key)` - fetch a setting
   - `useUpdateSetting()` - save a setting
   - `useTestPayoneerConnection()` - test API connection
   - `usePayoneerPayees()` - fetch all payees

## Setup Instructions

### Step 1: Generate Encryption Key

Generate a 64-character hex encryption key (32 bytes):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 2: Update Environment Variables

Add to `apps/api/.env`:

```bash
# Settings Encryption Key (required)
SETTINGS_ENCRYPTION_KEY=<your-64-character-hex-key-here>
```

Example:
```bash
SETTINGS_ENCRYPTION_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

### Step 3: Restart API Server

```bash
cd apps/api
pnpm dev
```

### Step 4: Configure Payoneer Credentials

1. Navigate to http://localhost:5173/settings
2. Enter your Payoneer API credentials:
   - **API Key**: Your Payoneer Mass Payouts API key
   - **Program ID**: Your Payoneer program ID
   - **API URL**: `https://api.payoneer.com/v4` (default)
3. Click "Test Connection" to verify credentials
4. Click "Save Configuration" to store credentials securely

### Step 5: View Payees

1. Navigate to http://localhost:5173/payoneer/payees
2. Or click "View Payoneer Payees" from the Settings page

## API Endpoints

### Settings Endpoints

**List all setting keys**
```
GET /api/settings/keys
Authorization: Bearer <jwt-token>
```

**Get a specific setting**
```
GET /api/settings/kv/:key
Authorization: Bearer <jwt-token>

Response:
{
  "key": "payoneer_api_key",
  "value": "<decrypted-value>"
}
```

**Set a setting**
```
PUT /api/settings/kv/:key
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "key": "payoneer_api_key",
  "value": "<value-to-encrypt>"
}

Response:
{
  "key": "payoneer_api_key",
  "success": true,
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Payoneer Endpoints

**Test connection**
```
GET /api/payoneer/test
Authorization: Bearer <jwt-token>

Response:
{
  "success": true,
  "message": "Successfully connected to Payoneer API"
}
```

**Get all payees**
```
GET /api/payoneer/payees
Authorization: Bearer <jwt-token>

Response:
{
  "success": true,
  "count": 10,
  "payees": [
    {
      "payeeId": "12345",
      "email": "consultant@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "status": "ACTIVE",
      "paymentMethod": "Bank Transfer"
    }
  ]
}
```

## Security Considerations

1. **Encryption**: All sensitive settings (API keys, credentials) are encrypted using AES-256-GCM before storage
2. **Environment Variables**: The encryption key is stored in `.env` and never committed to git
3. **Authentication**: All endpoints require JWT authentication
4. **Audit Logging**: All settings changes are logged in the audit log
5. **HTTPS**: Use HTTPS in production to encrypt data in transit

## Troubleshooting

### Error: "SETTINGS_ENCRYPTION_KEY environment variable is not set"

Add the encryption key to `apps/api/.env` as described in Step 2.

### Error: "Payoneer API configuration not found"

Configure Payoneer credentials in the Settings page (http://localhost:5173/settings).

### Error: "Failed to decrypt setting"

The encryption key has changed since the settings were stored. You need to re-enter your Payoneer credentials.

### Connection Test Fails

- Verify your Payoneer API key is correct
- Verify your Payoneer program ID is correct
- Check that the API URL is correct (default: https://api.payoneer.com/v4)
- Ensure your Payoneer account has API access enabled

## Future Enhancements

Phase 1 (Completed):
- ✅ Read-only payee data display
- ✅ Encrypted credential storage
- ✅ Settings UI
- ✅ Connection testing

Future Phases:
- Phase 2: Manual mapping of Payoneer payees to VSol consultants
- Phase 3: Export cycle payments to Payoneer (create payout requests)
- Phase 4: Import payment status from Payoneer back to VSol
- Phase 5: Automated payout workflow with approval process

## Files Created/Modified

### Backend
- `apps/api/src/db/schema.ts` - Added settings table
- `apps/api/src/lib/encryption.ts` - New encryption utilities
- `apps/api/src/services/settings-service.ts` - Extended with key-value methods
- `apps/api/src/services/payoneer-service.ts` - New Payoneer API client
- `apps/api/src/routes/settings.ts` - Added key-value endpoints
- `apps/api/src/routes/payoneer.ts` - New Payoneer endpoints
- `apps/api/src/server.ts` - Registered Payoneer routes
- `apps/api/drizzle/0017_zippy_emma_frost.sql` - Migration for settings table
- `packages/shared/src/types.ts` - Added Setting, PayoneerConfig, PayoneerPayee types
- `packages/shared/src/schemas.ts` - Added settingSchema, payoneerConfigSchema

### Frontend
- `apps/web/src/routes/settings.tsx` - New Settings page
- `apps/web/src/routes/payoneer-payees.tsx` - New Payoneer Payees page
- `apps/web/src/hooks/use-settings.ts` - Settings hooks
- `apps/web/src/hooks/use-payoneer.ts` - Payoneer hooks
- `apps/web/src/App.tsx` - Added Payoneer Payees route

### Dependencies
- Added `axios@1.13.1` to `apps/api/package.json`

