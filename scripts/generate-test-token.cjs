#!/usr/bin/env node
/**
 * Generate test credentials for the AI/ASR Evaluation API
 * Usage: node scripts/generate-test-token.js [--supabase]
 */

const crypto = require('crypto');

function generateDevToken() {
  return `dev-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
}

function generateApiKey() {
  return `sk_${crypto.randomBytes(32).toString('hex')}`;
}

async function generateSupabaseToken() {
  const { createClient } = require('@supabase/supabase-js');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase environment variables not configured');
    console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Create a test user
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = crypto.randomBytes(16).toString('hex');

  console.log('\n📝 Creating test user...');
  console.log(`   Email: ${testEmail}`);
  console.log(`   Password: ${testPassword}`);

  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
  });

  if (error) {
    console.error('❌ Failed to create user:', error.message);
    process.exit(1);
  }

  if (!data.session) {
    console.error('❌ No session returned. Email confirmation may be required.');
    console.log('   Check your Supabase dashboard auth settings.');
    process.exit(1);
  }

  return {
    accessToken: data.session.access_token,
    email: testEmail,
    password: testPassword,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const useSupabase = args.includes('--supabase');

  console.log('🔐 AI/ASR Evaluation API - Test Token Generator');
  console.log('═'.repeat(60));

  if (useSupabase) {
    console.log('\n📦 Generating Supabase user and token...\n');
    try {
      const { accessToken, email, password } = await generateSupabaseToken();

      console.log('\n✅ Success!\n');
      console.log('Token (use in Hoppscotch):');
      console.log('─'.repeat(60));
      console.log(accessToken);
      console.log('─'.repeat(60));
      console.log('\nCredentials (save these):');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      console.log('\nIn Hoppscotch, add header:');
      console.log('   Authorization: Bearer <token from above>');
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  } else {
    console.log('\n🔧 Development Mode Tokens (no validation)\n');

    const devToken = generateDevToken();
    const apiKey = generateApiKey();

    console.log('Option 1: Simple Dev Token');
    console.log('─'.repeat(60));
    console.log(devToken);
    console.log('─'.repeat(60));
    console.log('   Use this for quick local testing\n');

    console.log('Option 2: API Key Format');
    console.log('─'.repeat(60));
    console.log(apiKey);
    console.log('─'.repeat(60));
    console.log('   Use this if you configure API_KEYS in .env.local\n');

    console.log('💡 Tips:');
    console.log('   • In development, ANY token works by default');
    console.log('   • Add to Hoppscotch: Authorization: Bearer <token>');
    console.log('   • For production auth, run: node scripts/generate-test-token.js --supabase');
    console.log('   • To require validation in dev, set: DISABLE_AUTH=false');
  }

  console.log('\n' + '═'.repeat(60));
  console.log('Ready to test! 🚀\n');
}

main().catch(console.error);
