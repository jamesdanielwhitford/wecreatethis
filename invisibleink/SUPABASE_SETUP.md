# Supabase Setup Guide for Invisible Ink

This guide will walk you through setting up Supabase for the Invisible Ink app's one-time cipher key storage.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up for a free account (if you don't have one)
3. Click "New Project"
4. Fill in the details:
   - **Name**: invisibleink (or any name you prefer)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest region to your users
   - **Pricing Plan**: Free tier is sufficient
5. Click "Create new project" and wait for it to initialize (~2 minutes)

## Step 2: Create the Database Table

1. In your Supabase project dashboard, click on the **SQL Editor** tab (or **Table Editor**)
2. Click "New Query" or use the SQL editor
3. Paste the following SQL and click "Run":

```sql
-- Create the cipher_keys table
CREATE TABLE cipher_keys (
  id TEXT PRIMARY KEY,
  cipher_map JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Create an index on expires_at for faster cleanup queries
CREATE INDEX idx_cipher_keys_expires_at ON cipher_keys(expires_at);

-- Enable Row Level Security (RLS)
ALTER TABLE cipher_keys ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to INSERT cipher keys
CREATE POLICY "Allow public insert" ON cipher_keys
  FOR INSERT
  WITH CHECK (true);

-- Create policy to allow anyone to SELECT cipher keys
CREATE POLICY "Allow public select" ON cipher_keys
  FOR SELECT
  USING (true);

-- Create policy to allow anyone to DELETE cipher keys
CREATE POLICY "Allow public delete" ON cipher_keys
  FOR DELETE
  USING (true);
```

## Step 3: Set Up Automatic Cleanup (Optional but Recommended)

To automatically delete expired cipher keys after 30 days, create a scheduled function:

1. In the SQL Editor, run this query:

```sql
-- Create a function to delete expired cipher keys
CREATE OR REPLACE FUNCTION delete_expired_ciphers()
RETURNS void AS $$
BEGIN
  DELETE FROM cipher_keys
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

2. Set up a cron job (requires Supabase Pro, but you can manually run cleanup):
   - If you have Supabase Pro, go to **Database > Cron Jobs**
   - Create a new job that runs `SELECT delete_expired_ciphers();` daily

**Alternative for Free Tier**: You can manually run the cleanup query periodically:
```sql
DELETE FROM cipher_keys WHERE expires_at < NOW();
```

## Step 4: Get Your API Credentials

1. In your Supabase project dashboard, click on **Settings** (gear icon in sidebar)
2. Click on **API**
3. You'll see two important values:
   - **Project URL** (e.g., `https://abcdefghijk.supabase.co`)
   - **anon/public key** (a long string starting with `eyJ...`)

## Step 5: Configure the Invisible Ink App

1. Open `invisibleink/api.js`
2. Find the `SUPABASE_CONFIG` object at the top of the file
3. Replace the placeholder values:

```javascript
const SUPABASE_CONFIG = {
    url: 'https://YOUR_PROJECT_ID.supabase.co', // Replace with your Project URL
    anonKey: 'YOUR_ANON_KEY', // Replace with your anon/public key
    tableName: 'cipher_keys'
};
```

**Example:**
```javascript
const SUPABASE_CONFIG = {
    url: 'https://abcdefghijk.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODk4OTI0MDAsImV4cCI6MjAwNTQ2ODQwMH0...',
    tableName: 'cipher_keys'
};
```

## Step 6: Test the Setup

1. Open your Invisible Ink app in a browser
2. Try creating a message
3. Check the browser console for any errors
4. If successful, you should see the cipher key stored in Supabase:
   - Go to **Table Editor** > **cipher_keys** in Supabase
   - You should see a new row with the cipher data

## Security Notes

### Why RLS Policies Allow Public Access

The app uses **public read/write** policies because:

1. **No user authentication** - This is a simple app without user accounts
2. **Cipher keys are one-time use** - After first access, they're deleted
3. **Keys expire after 30 days** - Prevents database bloat
4. **IDs are randomly generated** - Hard to guess without the URL
5. **Data is encrypted** - The cipher map is meaningless without the ciphertext (which is in the URL)

### What's Actually Secure

The security comes from:
- **One-time access**: Cipher key is deleted after first use
- **Unique cipher per message**: Each message has a completely unique shuffled alphabet
- **Key separate from ciphertext**: The cipher map is NOT in the URL
- **Expiration**: Abandoned messages auto-delete after 30 days

### Production Considerations

For a production app, you might want to:
1. Add rate limiting to prevent spam
2. Monitor database usage
3. Set up automated backups
4. Consider adding CAPTCHA to message creation
5. Implement IP-based rate limiting

## Troubleshooting

### Error: "Supabase library not loaded"
- Make sure you're loading the app through a web server (not `file://`)
- Check that the Supabase CDN script is loading in index.html

### Error: "Failed to store cipher key"
- Check your Supabase credentials in `api.js`
- Verify the table exists in Supabase Table Editor
- Check browser console for detailed error messages
- Verify RLS policies are set up correctly

### Error: "Link Expired" immediately
- Check that the cipher key was actually stored in Supabase
- Verify your table name matches in both SQL and `api.js`
- Check for network errors in browser DevTools

### Database fills up quickly
- Make sure the cleanup function is working
- Manually delete old entries: `DELETE FROM cipher_keys WHERE expires_at < NOW();`
- Check if expiration dates are being set correctly

## Free Tier Limits

Supabase Free Tier includes:
- **500 MB database space** (plenty for cipher keys)
- **Unlimited API requests**
- **50 MB file storage** (not used in this app)
- **2 GB bandwidth/month**

Each cipher key takes ~1-2 KB of storage, so you can store hundreds of thousands of messages on the free tier.

## Next Steps

Once configured:
1. Test creating and receiving messages
2. Verify one-time link burning works
3. Check that expired links show the correct error
4. Share the app with friends to test end-to-end!
