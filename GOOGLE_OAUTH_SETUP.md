# Google OAuth Setup Guide

Your app has been switched from Replit Auth to Google OAuth. Follow these steps to complete the setup:

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name (e.g., "Monad") and click "Create"
4. Wait for the project to be created and select it

## Step 2: Configure OAuth Consent Screen

1. In the sidebar, go to **APIs & Services** → **OAuth consent screen**
2. Select "External" user type and click "Create"
3. Fill in the required fields:
   - **App name**: Monad (or your preferred name)
   - **User support email**: Your email address
   - **Developer contact email**: Your email address
4. Click "Save and Continue"
5. On the "Scopes" page, click "Add or Remove Scopes"
6. Add these scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
7. Click "Update" then "Save and Continue"
8. On "Test users" page (if in testing mode), add your email address
9. Click "Save and Continue" → "Back to Dashboard"

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click "Create Credentials" → "OAuth client ID"
3. Select "Web application"
4. Set the name: "Monad Web Client"
5. Under **Authorized JavaScript origins**, add:
   - `http://localhost:5000` (for development)
   - Your production URL (e.g., `https://your-app.replit.app`)
6. Under **Authorized redirect URIs**, add:
   - `http://localhost:5000/api/auth/google/callback` (for development)
   - `https://your-app.replit.app/api/auth/google/callback` (for production)
7. Click "Create"
8. **IMPORTANT**: Copy your **Client ID** and **Client Secret** - you'll need these!

## Step 4: Add Credentials to Replit

### For Development:
1. In Replit, open the "Secrets" tab (Tools → Secrets, or click the lock icon)
2. Add these secrets:
   - **Key**: `GOOGLE_CLIENT_ID` | **Value**: (paste your Client ID)
   - **Key**: `GOOGLE_CLIENT_SECRET` | **Value**: (paste your Client Secret)
   - **Key**: `SESSION_SECRET` | **Value**: (generate a random string, e.g., use https://randomkeygen.com/)

### For Production (after publishing):
1. Go to your Replit deployment settings
2. Add the same three environment variables listed above

## Step 5: Test the Integration

1. Restart your application (it will automatically restart after adding secrets)
2. Go to `/login` in your browser
3. Click "Continue with Google"
4. You should be redirected to Google's login page
5. Sign in with your Google account
6. You'll be redirected back to your app and logged in!

## Troubleshooting

### "Error 400: redirect_uri_mismatch"
- Your callback URL in Google Console doesn't match your actual callback URL
- Make sure you added the exact URL: `https://your-actual-domain.replit.app/api/auth/google/callback`

### "Error: Google OAuth credentials not configured"
- The secrets aren't set up correctly
- Make sure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are in your Replit Secrets

### "This app is blocked"
- Your OAuth consent screen is in testing mode and the user isn't added to test users
- Either add the user as a test user, or publish your OAuth consent screen

### Still seeing Replit login
- Clear your browser cookies and try again
- Make sure the app restarted after adding the secrets

## Important Notes

- **Production URL**: When you publish your app, remember to add your production URL to the authorized origins and redirect URIs in Google Console
- **Session Secret**: Keep your `SESSION_SECRET` secure - never commit it to git
- **Testing Mode**: If your OAuth consent screen is in testing mode, only test users can sign in. To allow anyone to sign in, you need to publish your consent screen (this requires verification by Google for production apps)

## Need Help?

If you encounter issues:
1. Check the browser console for errors
2. Check the Replit logs for server-side errors
3. Verify all URLs exactly match between Google Console and your app
4. Make sure all three secrets are properly set in Replit
