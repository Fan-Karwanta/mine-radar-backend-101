# Permit Number Cleaning Scripts

This directory contains scripts to clean corrupted permit and contract numbers in the MongoDB database.

## Problem Description

The MongoDB collections `directorynational` and `directorylocal` have corrupted permit/contract numbers with extra characters:

**Examples of corrupted data:**
- `071-97-IV-1758080332921-0vq071-97-IV-1758080332921-0vq` → should be `071-97-IV`
- `125-98-IV-Amended B-1758080332921-0vq` → should be `125-98-IV-Amended B`
- `QP-Q-0064-1758080332921-0vqQP-Q-0064-1758080332921-0vq` → should be `QP-Q-0064`

## Scripts Available

### 1. `testPermitCleaning.js`
Tests the cleaning logic with sample data to verify it works correctly.

```bash
npm run test-clean
```

### 2. `cleanPermitNumbers.js` (Preview Mode)
Shows what changes would be made WITHOUT actually updating the database.

```bash
npm run clean-preview
```

### 3. `cleanPermitNumbers.js` (Execute Mode)
Actually performs the cleaning operation on the database.

```bash
npm run clean-execute
```

## Usage Instructions

### Step 1: Test the Logic
First, verify the cleaning logic works correctly:

```bash
cd backend
npm run test-clean
```

This will show you test cases and verify the cleaning patterns work as expected.

### Step 2: Preview Changes
See what changes would be made to your database:

```bash
npm run clean-preview
```

This will connect to your MongoDB and show you the first 10 records that would be changed in each collection.

### Step 3: Execute Cleaning
Once you're satisfied with the preview, run the actual cleaning:

```bash
npm run clean-execute
```

This will:
- Connect to MongoDB
- Process all 289 records in `directorynational` 
- Process all 334 records in `directorylocal`
- Show progress for each update
- Provide a summary of changes made

## What Gets Cleaned

### National Directory (`directorynational`)
- **Field**: `contractNumber`
- **Pattern**: Extracts `XXX-XX-IV` format (e.g., `071-97-IV`)
- **Preserves**: Valid suffixes like `Amended B`
- **Removes**: Duplicated text and long numeric suffixes

### Local Directory (`directorylocal`)
- **Field**: `permitNumber` 
- **Pattern**: Extracts `QP-Q-XXXX` or `QP-Q-XXXX-QX` format
- **Examples**: `QP-Q-0222-Q2`, `QP-Q-0063`
- **Removes**: Duplicated text and long numeric suffixes

### Hotspots Directory (`directoryhotspots`)
- **Status**: ✅ No changes needed - this collection is working fine

## Safety Features

- **Preview Mode**: Always test with preview first
- **Backup Recommended**: Consider backing up your database before running
- **Error Handling**: Script continues if individual records fail
- **Progress Logging**: Shows each change being made
- **Summary Report**: Final count of successful updates and errors

## Expected Results

After running the cleaning script:

- **National**: ~289 records processed, corrupted contract numbers fixed
- **Local**: ~334 records processed, corrupted permit numbers fixed  
- **Total**: All permit/contract numbers should match the format in the CSV files

## Troubleshooting

### MongoDB Connection Issues
Make sure your `.env` file has the correct `MONGODB_URI`:

```env
MONGODB_URI=mongodb+srv://your-connection-string
```

### Script Errors
If the script fails:
1. Check your MongoDB connection
2. Ensure you have proper database permissions
3. Review the error messages in the console
4. Try running in preview mode first

### Verification
After cleaning, you can verify the results by:
1. Checking a few records in MongoDB Compass
2. Re-downloading data in the mobile app
3. Running the preview script again (should show no changes needed)

## Technical Details

The cleaning logic uses regular expressions to:
1. Detect and remove duplicated text patterns
2. Extract the main permit/contract number format
3. Preserve valid suffixes (like "Amended B")
4. Remove long numeric/alphanumeric garbage suffixes

The script processes each record individually and only updates records that actually need cleaning, making it efficient and safe.
