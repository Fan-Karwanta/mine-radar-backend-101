# Username Index Fix

## Problem
MongoDB duplicate key error when registering new users:
```
E11000 duplicate key error collection: test.users index: username_1 dup key: { username: null }
```

## Root Cause
- The User model previously had a `username` field with a unique index
- The schema was updated to remove the `username` field (replaced with `completeName`)
- MongoDB still had the obsolete `username_1` unique index
- When creating users without `username`, MongoDB tried to insert `null` and hit duplicate key error

## Solution
Created `fixUsernameIndex.js` script to drop the obsolete index from MongoDB.

## How to Run
```bash
npm run fix-username-index
```

## What It Does
1. Connects to MongoDB
2. Lists all indexes on the `users` collection
3. Drops the `username_1` index if it exists
4. Shows final indexes (should only have `_id_` and `email_1`)

## Result
- ✅ Users can now register without the `username` field
- ✅ No more duplicate key errors on null username
- ✅ Email remains the unique identifier for users
- ✅ Registration works with: email, password, completeName, agency, position, contactNumber

## When to Run This
- After deploying to a new environment with old database schema
- If you see "username_1 dup key" errors in registration
- When migrating from old User schema to new schema

## Verification
After running the script, the users collection should only have these indexes:
- `_id_` (default MongoDB index)
- `email_1` (unique index for email field)

The obsolete `username_1` index should be removed.
