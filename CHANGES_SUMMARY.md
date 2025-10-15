# Secret Sync Fix - Dual Wrangler Approach

## Problem
Secret syncing fails after successful deployment with wrangler 4.43.0 due to API compatibility issues:
```
Script edit failed. You attempted to deploy the latest version with modified settings, but the latest version isn't currently deployed. [code: 10214]
```

## Solution
Use wrangler 4.43.0 for deployment and wrangler 4.42.2 specifically for secret syncing.

## Files Added
- `webapp/scripts/sync-secrets-with-wrangler-4.42.2.sh` - Script that uses wrangler 4.42.2 for secret syncing

## Files Modified
- `.circleci/config.yml` - Updated secret syncing step to use the new script

## Changes Made

### 1. New Script: `webapp/scripts/sync-secrets-with-wrangler-4.42.2.sh`
- Uses wrangler 4.42.2 for secret syncing operations
- Installs wrangler 4.42.2 temporarily with `--no-save`
- Maintains same error handling and logging as original
- Works around API compatibility issues in wrangler 4.43.0

### 2. CircleCI Configuration Update
- Changed secret syncing step to use the new script
- Updated step name to indicate wrangler 4.42.2 usage
- Maintains same error handling and exit codes

## Benefits
- ✅ Resolves secret syncing issue
- ✅ Keeps successful deployment with wrangler 4.43.0
- ✅ No permanent changes to package.json
- ✅ Easy to revert if needed
- ✅ Maintains existing CI/CD workflow

## Testing
The approach can be tested by running:
```bash
cd webapp
export CLOUDFLARE_API_TOKEN=your_token
export DOPPLER_TOKEN=your_token
./scripts/sync-secrets-with-wrangler-4.42.2.sh
```
