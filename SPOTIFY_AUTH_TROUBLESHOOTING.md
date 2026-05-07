# Spotify Authentication Troubleshooting

## Current Error
Your app is getting `spotify_error=auth_failed`. This typically means the access token exchange failed.

## Quick Diagnostic
Visit: `https://music-app-phi-steel.vercel.app/api/spotify/diagnostic`

This will show you which environment variables are missing.

## Common Issues & Solutions

### 1. **Missing or Wrong Environment Variables on Vercel** (Most Likely)

`.env.local` is **only for local development**. Vercel doesn't use it.

**Fix:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `music-app` project
3. Settings → Environment Variables
4. Add these variables:
   ```
   SPOTIFY_CLIENT_ID = ecfaffef858b47af958c70e4e04c7044
   SPOTIFY_CLIENT_SECRET = 43aec9b75cd9480b9995778021507967
   SPOTIFY_REDIRECT_URI = https://music-app-phi-steel.vercel.app/api/spotify/callback
   ```
5. Redeploy the project (or trigger a new deployment)

### 2. **Redirect URI Mismatch**

The redirect URI must **exactly match** what's configured in your Spotify app settings.

**Fix:**
1. Go to [Spotify Dashboard](https://developer.spotify.com/dashboard)
2. Select your application
3. Settings → Redirect URIs
4. Make sure it includes:
   ```
   https://music-app-phi-steel.vercel.app/api/spotify/callback
   ```
5. For local testing, also add:
   ```
   http://localhost:3000/api/spotify/callback
   ```
6. Save changes

### 3. **Invalid Credentials**

If your Client ID/Secret are wrong or expired.

**Fix:**
1. Go to [Spotify Dashboard](https://developer.spotify.com/dashboard)
2. If your app doesn't exist, create a new one:
   - Go to "Create an App"
   - Accept terms
   - Fill in app name and description
   - Accept agreements and create
3. Copy the new Client ID and Client Secret
4. Update them in Vercel environment variables
5. Redeploy

### 4. **Code Expired**

Authorization codes from Spotify expire quickly (usually ~10 minutes).

**Fix:**
Just click "Fetch Spotify Music & Albums" again to get a fresh authorization code.

## Environment Variables Checklist

For **Local Development** (in `.env.local`):
- ✅ Already configured with your Spotify credentials
- Run `npm run dev` to test

For **Vercel Production**:
- ⚠️ Must be set in Vercel Dashboard settings
- Must match your Spotify app's Redirect URI exactly
- Need to redeploy after adding/changing variables

## Testing After Fix

1. Check diagnostic: `https://music-app-phi-steel.vercel.app/api/spotify/diagnostic`
   - Should show `status: "OK"`
2. Click "Fetch Spotify Music & Albums"
3. Should redirect to Spotify login (if not already logged in)
4. After login, should land on Liked Songs page

## Still Having Issues?

Check the browser console and Vercel logs:
1. Open Vercel Dashboard → Your Project → Logs
2. Look for errors from `/api/spotify/callback`
3. The error message should indicate what went wrong

Or restart your local dev server:
```bash
npm run dev
```
