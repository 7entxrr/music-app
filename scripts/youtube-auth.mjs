// Run this script ONCE to authenticate with YouTube:
//   node scripts/youtube-auth.mjs
//
// It will print a URL and code. Visit the URL, enter the code, and approve access.
// Then it prints the tokens — paste them into Vercel.

import { Innertube, UniversalCache } from 'youtubei.js';

const yt = await Innertube.create({ generate_session_locally: true });

yt.session.on('auth-pending', (data) => {
  console.log('\n=== YouTube OAuth2 Setup ===');
  console.log(`\n1. Visit: ${data.verification_url}`);
  console.log(`2. Enter code: ${data.user_code}`);
  console.log(`3. Sign in with your Google account\n`);
  console.log('Waiting for authorization...\n');
});

yt.session.on('auth', (data) => {
  console.log('\n=== SUCCESS! Add these to Vercel ===\n');
  console.log('Run: vercel env add YOUTUBE_ACCESS_TOKEN production');
  console.log('Value:', data.credentials.access_token);
  console.log('\nRun: vercel env add YOUTUBE_REFRESH_TOKEN production');
  console.log('Value:', data.credentials.refresh_token);
  console.log('\nThen redeploy: vercel --prod\n');
  process.exit(0);
});

yt.session.on('auth-error', (err) => {
  console.error('Auth error:', err);
  process.exit(1);
});

await yt.session.signIn();

// Keep the process alive while waiting
await new Promise(r => setTimeout(r, 10 * 60 * 1000));
