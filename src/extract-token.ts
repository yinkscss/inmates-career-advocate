/**
 * Helper script to extract token from curl response
 * Usage: Paste your curl response JSON and it will extract the token
 */

import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function extractToken() {
  console.log('🔍 Token Extractor\n');
  console.log('Paste your login response JSON below (or just the token):');
  console.log('Press Enter twice when done\n');

  const lines: string[] = [];
  let emptyLineCount = 0;

  while (true) {
    const line = await question('');
    if (line.trim() === '') {
      emptyLineCount++;
      if (emptyLineCount >= 2) break;
    } else {
      emptyLineCount = 0;
      lines.push(line);
    }
  }

  const input = lines.join('\n').trim();
  
  try {
    // Try to parse as JSON
    let token: string | null = null;
    
    try {
      const json = JSON.parse(input);
      
      // Try different possible structures
      token = 
        json.data?.accessToken ||
        json.data?.data?.accessToken ||
        json.accessToken ||
        json.token;
      
      if (token) {
        console.log('\n✅ Found token in JSON response!\n');
      }
    } catch {
      // Not JSON, might be just the token
      token = input.trim();
    }

    if (!token) {
      console.error('\n❌ Could not find accessToken in the response');
      console.error('Please ensure you paste the full JSON response or just the token');
      rl.close();
      process.exit(1);
    }

    // Clean the token
    token = token.trim().replace(/^["']|["']$/g, '');

    // Validate token format
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('\n❌ Invalid token format!');
      console.error(`Expected 3 parts separated by dots, got ${parts.length}`);
      console.error(`Token preview: ${token.substring(0, 50)}...`);
      console.error(`Token length: ${token.length} characters`);
      rl.close();
      process.exit(1);
    }

    // Check if it starts correctly
    if (!token.startsWith('eyJ')) {
      console.error('\n⚠️  Warning: Token does not start with "eyJ"');
      console.error(`Token preview: ${token.substring(0, 50)}...`);
    }

    console.log('✅ Valid token format!\n');
    console.log('📋 Your JWT Token:');
    console.log('─'.repeat(80));
    console.log(token);
    console.log('─'.repeat(80));
    console.log(`\nToken length: ${token.length} characters`);
    console.log(`Token parts: ${parts.length} (header.payload.signature)`);
    console.log(`Token preview: ${token.substring(0, 50)}...\n`);

    console.log('💡 Add this to your .env file:');
    console.log(`TEST_JWT_TOKEN=${token}\n`);

    // Optionally save to .env
    const saveToEnv = await question('Save to .env file? (y/n): ');
    if (saveToEnv.toLowerCase() === 'y') {
      const fs = await import('fs/promises');
      const envPath = '.env';
      try {
        let envContent = await fs.readFile(envPath, 'utf-8');

        // Remove existing TEST_JWT_TOKEN if present
        envContent = envContent.replace(/^TEST_JWT_TOKEN=.*$/m, '');

        // Add new token
        if (!envContent.endsWith('\n')) {
          envContent += '\n';
        }
        envContent += `TEST_JWT_TOKEN=${token}\n`;

        await fs.writeFile(envPath, envContent);
        console.log('✅ Token saved to .env file!\n');
      } catch (error) {
        console.error('❌ Failed to save to .env:', (error as Error).message);
        console.log('Please manually add it to your .env file\n');
      }
    }

    rl.close();
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    rl.close();
    process.exit(1);
  }
}

extractToken();
