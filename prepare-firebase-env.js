#!/usr/bin/env node

/**
 * Helper script to prepare Firebase Service Account JSON for Render.com
 * This converts the JSON file to a single-line string for easy copy-paste
 * 
 * Usage: node prepare-firebase-env.js
 */

const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Error: firebase-service-account.json not found!');
  console.error('📍 Make sure the file exists in the project root directory.');
  process.exit(1);
}

try {
  // Read the JSON file
  const jsonContent = fs.readFileSync(serviceAccountPath, 'utf8');
  
  // Parse to validate it's valid JSON
  const parsed = JSON.parse(jsonContent);
  
  // Convert to single line (minified)
  const singleLine = JSON.stringify(parsed);
  
  console.log('\n✅ Firebase Service Account JSON prepared for Render.com\n');
  console.log('📋 Copy the following and paste it into Render Dashboard:');
  console.log('   Environment Variable Key: FIREBASE_SERVICE_ACCOUNT');
  console.log('   Environment Variable Value: (see below)\n');
  console.log('─'.repeat(80));
  console.log(singleLine);
  console.log('─'.repeat(80));
  console.log('\n💡 Instructions:');
  console.log('   1. Copy the entire line above (between the lines)');
  console.log('   2. Go to Render Dashboard → Your Service → Environment');
  console.log('   3. Add new environment variable:');
  console.log('      Key: FIREBASE_SERVICE_ACCOUNT');
  console.log('      Value: (paste the copied line)');
  console.log('   4. Save and redeploy\n');
  
} catch (error) {
  console.error('❌ Error processing Firebase service account:', error.message);
  console.error('💡 Make sure firebase-service-account.json is valid JSON');
  process.exit(1);
}

