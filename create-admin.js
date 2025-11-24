/**
 * Script to create an admin user account
 * Run this with: node create-admin.js
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin (same as server.js)
let serviceAccount;
const isProduction = process.env.NODE_ENV === 'production';

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    if (typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string') {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    }
  } catch (error) {
    console.error('❌ Error parsing FIREBASE_SERVICE_ACCOUNT env var:', error.message);
    process.exit(1);
  }
} else {
  const fs = require('fs');
  const path = require('path');
  const possiblePaths = [
    path.join(__dirname, 'firebase-service-account.json'),
    path.join(process.cwd(), 'firebase-service-account.json'),
  ];
  
  let serviceAccountPath = null;
  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      serviceAccountPath = testPath;
      break;
    }
  }
  
  if (!serviceAccountPath) {
    console.error('\n❌ ERROR: Firebase service account file not found!');
    console.error('Please set FIREBASE_SERVICE_ACCOUNT environment variable or place firebase-service-account.json in the project root.\n');
    process.exit(1);
  }
  
  try {
    serviceAccount = require(serviceAccountPath);
  } catch (error) {
    console.error('❌ Error loading Firebase service account file:', error.message);
    process.exit(1);
  }
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin SDK initialized successfully\n');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:', error.message);
  process.exit(1);
}

const auth = admin.auth();
const db = admin.firestore();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdmin() {
  try {
    console.log('=== Create Admin Account ===\n');
    
    // Check for command line arguments
    let email, password, displayName;
    
    if (process.argv.length >= 4) {
      email = process.argv[2];
      password = process.argv[3];
      displayName = process.argv[4] || email.split('@')[0];
      console.log(`Using provided credentials:`);
      console.log(`Email: ${email}`);
      console.log(`Display Name: ${displayName}\n`);
    } else {
      email = await question('Enter admin email: ');
      password = await question('Enter admin password: ');
      displayName = await question('Enter display name (optional, press Enter to skip): ') || email.split('@')[0];
    }
    
    console.log('\n⏳ Creating admin account...');
    
    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: false
    });
    
    console.log('✅ User created in Firebase Auth');
    
    // Create user document in Firestore with admin privileges
    await db.collection('users').doc(userRecord.uid).set({
      email,
      name: displayName,
      username: email.split('@')[0],
      displayName,
      avatarUrl: `https://avatar.vercel.sh/${email.split('@')[0]}.svg?text=${displayName.substring(0,2)}`,
      specialization: 'Admin',
      studyYear: 1,
      followers: 0,
      following: 0,
      university: 'Admin',
      isActive: true,
      isAdmin: true,
      followingIds: [],
      blockedUserIds: [],
      joinedCommunities: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Admin user document created in Firestore');
    console.log('\n=== Admin Account Created Successfully ===');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`User ID: ${userRecord.uid}`);
    console.log('\nYou can now login with these credentials to access the admin page.\n');
    
  } catch (error) {
    console.error('\n❌ Error creating admin account:', error.message);
    if (error.code === 'auth/email-already-exists') {
      console.error('This email is already registered. You can use the /api/users/:id/set-admin endpoint to make this user an admin.');
    }
  } finally {
    rl.close();
    process.exit(0);
  }
}

createAdmin();

