const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0'; // Use 0.0.0.0 for Render to bind to all interfaces

// Middleware
app.use(cors());
app.use(express.json());
// Middleware
app.use(cors());

// ✅ التعديل هنا: سمحنا باستقبال بيانات لحد 50 ميجا بايت
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// ... (بعد سطر app.use(express.json()); )

// ✅ إعدادات الإنتاج (Production): تقديم ملفات الواجهة
if (process.env.NODE_ENV === 'production') {
  // جعل مجلد 'dist' (اللي فيه الواجهة المبنية) متاح للعامة
  app.use(express.static(path.join(__dirname, 'dist')));

  // أي رابط غير الـ API يرجعنا للصفحة الرئيسية للموقع (عشان React Router يشتغل)
  app.get('*', (req, res) => {
    // نتأكد إننا مش بنعترض مسارات الـ API
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}
// Log environment info
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
console.log('📦 Starting server...');

// Debug: Log environment variable status (without exposing secrets)
console.log('🔍 Environment Variables Check:');
console.log('   - NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('   - FIREBASE_SERVICE_ACCOUNT:', process.env.FIREBASE_SERVICE_ACCOUNT ? '✅ Set (' + process.env.FIREBASE_SERVICE_ACCOUNT.length + ' chars)' : '❌ Not set');
console.log('   - FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Not set');
console.log('   - FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '✅ Set' : '❌ Not set');
console.log('   - PORT:', process.env.PORT || 'not set (will use default 3001)');

// Initialize Firebase Admin SDK
let serviceAccount;
const isProduction = process.env.NODE_ENV === 'production';

// Priority 1: Try to load from environment variable (for Render/production)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    // Handle both string and already-parsed JSON
    if (typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string') {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    }
    console.log('✅ Loaded Firebase credentials from environment variable (FIREBASE_SERVICE_ACCOUNT)');
  } catch (error) {
    console.error('❌ Error parsing FIREBASE_SERVICE_ACCOUNT env var:', error.message);
    console.error('💡 Make sure FIREBASE_SERVICE_ACCOUNT is a valid JSON string');
    process.exit(1);
  }
} 
// Priority 2: Try individual environment variables (alternative method)
else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
  try {
    // Handle private key with escaped newlines
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
      private_key: privateKey,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID || '',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL || ''
    };
    console.log('✅ Loaded Firebase credentials from individual environment variables');
  } catch (error) {
    console.error('❌ Error constructing Firebase credentials from env vars:', error.message);
    process.exit(1);
  }
}
// Priority 3: Try to load from file (for local development only)
else {
  // Only attempt file loading if not in production
  if (isProduction) {
    console.error('\n❌ ERROR: Firebase credentials not found in production!');
    console.error('\n🔍 Debug Info:');
    console.error('   - NODE_ENV:', process.env.NODE_ENV);
    console.error('   - FIREBASE_SERVICE_ACCOUNT:', process.env.FIREBASE_SERVICE_ACCOUNT ? 'Exists (' + process.env.FIREBASE_SERVICE_ACCOUNT.length + ' chars)' : 'Missing');
    console.error('   - FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID || 'Missing');
    console.error('   - FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL || 'Missing');
    console.error('\n📋 SOLUTION: Set FIREBASE_SERVICE_ACCOUNT environment variable in Render dashboard');
    console.error('\n   Step-by-Step Instructions:');
    console.error('   1. Open your local firebase-service-account.json file');
    console.error('   2. Run this command locally: npm run prepare-firebase-env');
    console.error('   3. Copy the output (single-line JSON string)');
    console.error('   4. Go to Render Dashboard → Your Service → Environment');
    console.error('   5. Click "Add Environment Variable"');
    console.error('   6. Key: FIREBASE_SERVICE_ACCOUNT');
    console.error('   7. Value: (paste the copied JSON string)');
    console.error('   8. Click "Save Changes"');
    console.error('   9. Go to "Manual Deploy" → "Deploy latest commit"');
    console.error('\n   Alternative: Use individual environment variables (see RENDER_DEPLOYMENT.md)\n');
    process.exit(1);
  }

  // Try multiple possible paths for local development
  const possiblePaths = [
    path.join(__dirname, 'firebase-service-account.json'),
    path.join(process.cwd(), 'firebase-service-account.json'),
    './firebase-service-account.json',
    'firebase-service-account.json'
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
    console.error('\n📍 Current directory:', process.cwd());
    console.error('📍 __dirname:', __dirname);
    console.error('\n📋 To fix this:');
    console.error('   1. Go to: https://console.firebase.google.com/');
    console.error('   2. Select your project: a2z-app-3ea59');
    console.error('   3. Go to Project Settings → Service Accounts');
    console.error('   4. Click "Generate New Private Key"');
    console.error('   5. Save the JSON file as: firebase-service-account.json');
    console.error('   6. Place it in the project root directory (same folder as server.js)\n');
    process.exit(1);
  }
  
  try {
    serviceAccount = require(serviceAccountPath);
    console.log('✅ Loaded Firebase credentials from file:', serviceAccountPath);
  } catch (error) {
    console.error('❌ Error loading Firebase service account file:', error.message);
    console.error('📍 File path:', serviceAccountPath);
    process.exit(1);
  }
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:', error.message);
  process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Firebase API server is running' });
});

// ============= AUTH ENDPOINTS =============

// Create user (signup)
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, displayName, studyYear, isAdmin } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: displayName || email.split('@')[0]
    });

    // Create user document in Firestore
    const userData = {
      email,
      displayName: displayName || email.split('@')[0],
      studyYear: studyYear || '',
      followers: [],
      following: [],
      followingIds: [],
      blockedUserIds: [],
      joinedCommunities: [],
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Set admin status if provided
    if (isAdmin === true) {
      userData.isAdmin = true;
    }

    await db.collection('users').doc(userRecord.uid).set(userData);

    // Get custom token for client
    const customToken = await auth.createCustomToken(userRecord.uid);

    res.status(201).json({
      success: true,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName
      },
      customToken
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Note: Admin SDK doesn't verify passwords directly
    // This is a simplified version - you'd typically use client SDK for login
    // Or implement password verification differently
    const user = await auth.getUserByEmail(email);
    const customToken = await auth.createCustomToken(user.uid);

    res.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      },
      customToken
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Get user by ID
app.get('/api/auth/user/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const user = await auth.getUser(uid);
    res.json({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    });
  } catch (error) {
    res.status(404).json({ error: 'User not found' });
  }
});

// ============= FIRESTORE ENDPOINTS =============

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('users').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create or update user
app.post('/api/users', async (req, res) => {
  try {
    const userData = req.body;
    const { id } = userData;
    
    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const userRef = db.collection('users').doc(id);
    await userRef.set({
      ...userData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    const updatedDoc = await userRef.get();
    res.status(201).json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set user as admin
app.post('/api/users/:id/set-admin', async (req, res) => {
  try {
    const { id } = req.params;
    const userRef = db.collection('users').doc(id);
    await userRef.update({
      isAdmin: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    const updatedDoc = await userRef.get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    await db.collection('users').doc(id).update({
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const updatedDoc = await db.collection('users').doc(id).get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user (Admin only)
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminUserId } = req.body; // Admin user ID making the request
    
    if (!adminUserId) {
      return res.status(400).json({ error: 'adminUserId is required' });
    }
    
    // Verify admin status
    const adminUserDoc = await db.collection('users').doc(adminUserId).get();
    if (!adminUserDoc.exists) {
      return res.status(404).json({ error: 'Admin user not found' });
    }
    
    const adminUser = adminUserDoc.data();
    if (!adminUser.isAdmin) {
      return res.status(403).json({ error: 'Only admins can delete users' });
    }
    
    // Prevent admin from deleting themselves
    if (id === adminUserId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    // Delete user from Firestore
    await db.collection('users').doc(id).delete();
    
    // Also delete from Firebase Auth
    try {
      await auth.deleteUser(id);
    } catch (authError) {
      console.warn('Could not delete user from Firebase Auth:', authError.message);
      // Continue even if Auth deletion fails
    }
    
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= POSTS ENDPOINTS =============

// Get all posts
app.get('/api/posts', async (req, res) => {
  try {
    const snapshot = await db.collection('posts')
      .orderBy('timestamp', 'desc')
      .get();
    
    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate().toISOString()
    }));
    
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get post by ID
app.get('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('posts').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create post
app.post('/api/posts', async (req, res) => {
  try {
    const postData = req.body;
    const docRef = await db.collection('posts').add({
      ...postData,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const newDoc = await docRef.get();
    const createdPost = newDoc.data();
    
    // If this is a repost, create notification for original post author
    if (createdPost.repostOf) {
      // Get the original post to find its author
      const originalPostRef = db.collection('posts').doc(createdPost.repostOf);
      const originalPostDoc = await originalPostRef.get();
      
      if (originalPostDoc.exists) {
        const originalPost = originalPostDoc.data();
        
        // Extract author IDs - handle both string and object formats
        let originalAuthorId = null;
        if (typeof originalPost.author === 'string') {
          originalAuthorId = originalPost.author;
        } else if (originalPost.author && typeof originalPost.author === 'object') {
          originalAuthorId = originalPost.author.id || originalPost.author.uid;
        }
        
        let repostAuthorId = null;
        if (typeof createdPost.author === 'string') {
          repostAuthorId = createdPost.author;
        } else if (createdPost.author && typeof createdPost.author === 'object') {
          repostAuthorId = createdPost.author.id || createdPost.author.uid;
        }
        
        // Create notification for original post author
        if (originalAuthorId && repostAuthorId && originalAuthorId !== repostAuthorId) {
          console.log('Creating repost notification:', { originalAuthorId, repostAuthorId, postId: createdPost.repostOf });
          await createNotification('repost', originalAuthorId, repostAuthorId, createdPost.repostOf);
        } else {
          console.log('Skipping repost notification:', { originalAuthorId, repostAuthorId, reason: originalAuthorId === repostAuthorId ? 'self-repost' : 'missing-ids' });
        }
      }
    }
    
    res.status(201).json({
      id: newDoc.id,
      ...newDoc.data(),
      timestamp: newDoc.data().timestamp?.toDate().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update post
app.put('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    await db.collection('posts').doc(id).update({
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const updatedDoc = await db.collection('posts').doc(id).get();
    res.json({
      id: updatedDoc.id,
      ...updatedDoc.data(),
      timestamp: updatedDoc.data().timestamp?.toDate().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete post (Admin or post author only)
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body; // User ID making the request
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    // Get the post to check ownership
    const postDoc = await db.collection('posts').doc(id).get();
    if (!postDoc.exists) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const post = postDoc.data();
    const postAuthorId = typeof post.author === 'string' ? post.author : post.author?.id;
    
    // Verify user is admin or post author
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userDoc.data();
    const isAdmin = user.isAdmin === true;
    const isAuthor = postAuthorId === userId;
    
    if (!isAdmin && !isAuthor) {
      return res.status(403).json({ error: 'Only admins or post authors can delete posts' });
    }
    
    // Delete the post
    await db.collection('posts').doc(id).delete();
    
    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= COURSES ENDPOINTS =============

// Get all courses
app.get('/api/courses', async (req, res) => {
  try {
    const snapshot = await db.collection('courses').get();
    const courses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get course by ID
app.get('/api/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('courses').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create course
app.post('/api/courses', async (req, res) => {
  try {
    const courseData = req.body;
    const docRef = await db.collection('courses').add({
      ...courseData,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const newDoc = await docRef.get();
    res.status(201).json({ id: newDoc.id, ...newDoc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update course
app.put('/api/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    await db.collection('courses').doc(id).update({
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    const updatedDoc = await db.collection('courses').doc(id).get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rate Course/Community
app.post('/api/courses/:id/rate', async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;
    if (rating === undefined) return res.status(400).json({ error: 'rating is required' });

    await db.collection('courses').doc(id).update({ 
      rating: Number(rating),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    const updatedDoc = await db.collection('courses').doc(id).get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete course (Admin only)
app.delete('/api/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminUserId } = req.body; // Admin user ID making the request
    
    if (!adminUserId) {
      return res.status(400).json({ error: 'adminUserId is required' });
    }
    
    // Verify admin status
    const adminUserDoc = await db.collection('users').doc(adminUserId).get();
    if (!adminUserDoc.exists) {
      return res.status(404).json({ error: 'Admin user not found' });
    }
    
    const adminUser = adminUserDoc.data();
    if (!adminUser.isAdmin) {
      return res.status(403).json({ error: 'Only admins can delete courses' });
    }
    
    // Delete the course
    await db.collection('courses').doc(id).delete();
    
    res.json({ success: true, message: 'Course deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= POST INTERACTIONS =============

// Like/Unlike Post
app.post('/api/posts/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const postRef = db.collection('posts').doc(id);
    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = postDoc.data();
    const likedBy = post.likedBy || [];
    const isLiked = likedBy.includes(userId);
    
    // Extract author ID - handle both string and object formats
    let postAuthorId = null;
    if (typeof post.author === 'string') {
      postAuthorId = post.author;
    } else if (post.author && typeof post.author === 'object') {
      postAuthorId = post.author.id || post.author.uid;
    }

    if (isLiked) {
      await postRef.update({
        likedBy: admin.firestore.FieldValue.arrayRemove(userId),
        likes: admin.firestore.FieldValue.increment(-1)
      });
    } else {
      await postRef.update({
        likedBy: admin.firestore.FieldValue.arrayUnion(userId),
        likes: admin.firestore.FieldValue.increment(1)
      });
      
      // Create notification for post author when someone likes their post
      if (postAuthorId && postAuthorId !== userId) {
        console.log('Creating like notification:', { postAuthorId, userId, postId: id });
        await createNotification('like', postAuthorId, userId, id);
      } else {
        console.log('Skipping like notification:', { postAuthorId, userId, reason: postAuthorId === userId ? 'self-like' : 'no-author-id' });
      }
    }

    const updatedDoc = await postRef.get();
    res.json({
      id: updatedDoc.id,
      ...updatedDoc.data(),
      timestamp: updatedDoc.data().timestamp?.toDate().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add Comment to Post
app.post('/api/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { authorId, text } = req.body;
    if (!authorId || !text) {
      return res.status(400).json({ error: 'authorId and text are required' });
    }

    const postRef = db.collection('posts').doc(id);
    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = postDoc.data();
    const comments = post.comments || [];
    
    // Extract post author ID - handle both string and object formats
    let postAuthorId = null;
    if (typeof post.author === 'string') {
      postAuthorId = post.author;
    } else if (post.author && typeof post.author === 'object') {
      postAuthorId = post.author.id || post.author.uid;
    }
    
    const newComment = {
      id: db.collection('dummy').doc().id, // Generate ID
      author: authorId,
      text,
      timestamp: new Date().toISOString(),
      likes: 0,
      likedBy: []
    };

    await postRef.update({
      comments: admin.firestore.FieldValue.arrayUnion(newComment)
    });

    // Create notification for post author when someone comments
    if (postAuthorId && postAuthorId !== authorId) {
      console.log('Creating comment notification:', { postAuthorId, authorId, postId: id });
      await createNotification('comment', postAuthorId, authorId, id);
    } else {
      console.log('Skipping comment notification:', { postAuthorId, authorId, reason: postAuthorId === authorId ? 'self-comment' : 'no-author-id' });
    }

    const updatedDoc = await postRef.get();
    res.json({
      id: updatedDoc.id,
      ...updatedDoc.data(),
      timestamp: updatedDoc.data().timestamp?.toDate().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Like/Unlike Comment
app.post('/api/posts/:postId/comments/:commentId/like', async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = postDoc.data();
    const comments = post.comments || [];
    let commentAuthorId = null;
    
    const updatedComments = comments.map(comment => {
      if (comment.id === commentId) {
        const likedBy = comment.likedBy || [];
        const isLiked = likedBy.includes(userId);
        
        // Get comment author ID for notification - handle both string and object formats
        if (!isLiked) {
          if (typeof comment.author === 'string') {
            commentAuthorId = comment.author;
          } else if (comment.author && typeof comment.author === 'object') {
            commentAuthorId = comment.author.id || comment.author.uid;
          }
        }
        
        return {
          ...comment,
          likedBy: isLiked 
            ? likedBy.filter(id => id !== userId)
            : [...likedBy, userId],
          likes: isLiked ? comment.likes - 1 : comment.likes + 1
        };
      }
      return comment;
    });

    await postRef.update({ comments: updatedComments });
    
    // Create notification for comment author when someone likes their comment
    if (commentAuthorId && commentAuthorId !== userId) {
      console.log('Creating comment like notification:', { commentAuthorId, userId, postId });
      await createNotification('like', commentAuthorId, userId, postId);
    } else {
      console.log('Skipping comment like notification:', { commentAuthorId, userId, reason: commentAuthorId === userId ? 'self-like' : 'no-author-id' });
    }
    
    const updatedDoc = await postRef.get();
    res.json({
      id: updatedDoc.id,
      ...updatedDoc.data(),
      timestamp: updatedDoc.data().timestamp?.toDate().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rate Post
app.post('/api/posts/:id/rate', async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;
    if (rating === undefined) return res.status(400).json({ error: 'rating is required' });

    await db.collection('posts').doc(id).update({ rating });
    const updatedDoc = await db.collection('posts').doc(id).get();
    res.json({
      id: updatedDoc.id,
      ...updatedDoc.data(),
      timestamp: updatedDoc.data().timestamp?.toDate().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= USER INTERACTIONS =============

// Follow/Unfollow User
app.post('/api/users/:id/follow', async (req, res) => {
  try {
    const { id } = req.params; // target user ID
    const { userId } = req.body; // current user ID
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    if (userId === id) return res.status(400).json({ error: 'Cannot follow yourself' });

    const currentUserRef = db.collection('users').doc(userId);
    const targetUserRef = db.collection('users').doc(id);

    const [currentUserDoc, targetUserDoc] = await Promise.all([
      currentUserRef.get(),
      targetUserRef.get()
    ]);

    if (!currentUserDoc.exists || !targetUserDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentUser = currentUserDoc.data();
    const followingIds = currentUser.followingIds || [];
    const isFollowing = followingIds.includes(id);

    if (isFollowing) {
      await currentUserRef.update({
        followingIds: admin.firestore.FieldValue.arrayRemove(id),
        following: admin.firestore.FieldValue.increment(-1)
      });
      await targetUserRef.update({
        followers: admin.firestore.FieldValue.increment(-1)
      });
    } else {
      await currentUserRef.update({
        followingIds: admin.firestore.FieldValue.arrayUnion(id),
        following: admin.firestore.FieldValue.increment(1)
      });
      await targetUserRef.update({
        followers: admin.firestore.FieldValue.increment(1)
      });
      
      // Create notification when someone follows
      await createNotification('follow', id, userId);
    }

    const [updatedCurrent, updatedTarget] = await Promise.all([
      currentUserRef.get(),
      targetUserRef.get()
    ]);

    res.json({
      currentUser: { id: updatedCurrent.id, ...updatedCurrent.data() },
      targetUser: { id: updatedTarget.id, ...updatedTarget.data() }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Block User
app.post('/api/users/:id/block', async (req, res) => {
  try {
    const { id } = req.params; // user to block
    const { userId } = req.body; // current user
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    await db.collection('users').doc(userId).update({
      blockedUserIds: admin.firestore.FieldValue.arrayUnion(id)
    });

    const updatedDoc = await db.collection('users').doc(userId).get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Join/Leave Community
app.post('/api/users/:id/communities', async (req, res) => {
  try {
    const { id } = req.params;
    const { field, action } = req.body; // action: 'join' or 'leave'
    if (!field || !action) return res.status(400).json({ error: 'field and action are required' });

    const userRef = db.collection('users').doc(id);
    if (action === 'join') {
      await userRef.update({
        joinedCommunities: admin.firestore.FieldValue.arrayUnion(field)
      });
    } else {
      await userRef.update({
        joinedCommunities: admin.firestore.FieldValue.arrayRemove(field)
      });
    }

    const updatedDoc = await userRef.get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= CHATS & MESSAGES =============

// Get Chat Messages
app.get('/api/chats/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    const snapshot = await db.collection('chats').doc(chatId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .get();

    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) || 'sending...'
    }));

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send Message
app.post('/api/chats/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { senderId, text, participants } = req.body; // Make sure participants are sent from frontend
    
    if (!senderId || !text) {
      return res.status(400).json({ error: 'senderId and text are required' });
    }

    const messagesRef = db.collection('chats').doc(chatId).collection('messages');
    const docRef = await messagesRef.add({
      senderId,
      text,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'sent'
    });

    // Update chat document
    await db.collection('chats').doc(chatId).set({
      lastMessage: text,
      lastMessageTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      participants: participants || []
    }, { merge: true });

    // ✅ NEW: Create Notification for the recipient
    if (participants && Array.isArray(participants)) {
        // Find the user who is NOT the sender
        const targetUserId = participants.find(id => id !== senderId);
        
        if (targetUserId) {
            console.log('🔔 Creating message notification for:', targetUserId);
            // We use a custom type 'message' and pass the text as preview
            await db.collection('notifications').add({
                type: 'message',
                targetUserId: targetUserId,
                userId: senderId,
                messagePreview: text.substring(0, 50), // First 50 chars
                read: false,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    }

    const newMessage = await docRef.get();
    res.status(201).json({
      id: newMessage.id,
      ...newMessage.data(),
      timestamp: newMessage.data().timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============= NOTIFICATIONS =============

// Get notifications for a user
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    // Try to fetch with orderBy, fallback to manual sort if index doesn't exist
    let snapshot;
    try {
      snapshot = await db.collection('notifications')
        .where('targetUserId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();
    } catch (indexError) {
      // If index doesn't exist, fetch without orderBy and sort manually
      console.warn('Notification index not found, fetching without orderBy:', indexError.message);
      snapshot = await db.collection('notifications')
        .where('targetUserId', '==', userId)
        .limit(50)
        .get();
    }
    
    const notifications = [];
    for (const doc of snapshot.docs) {
      const notif = doc.data();
      // Hydrate user and post data
      if (notif.userId) {
        try {
          const userDoc = await db.collection('users').doc(notif.userId).get();
          if (userDoc.exists) {
            notif.user = { id: userDoc.id, ...userDoc.data() };
          } else {
            console.warn(`User ${notif.userId} not found for notification ${doc.id}`);
            // Create a minimal user object to prevent errors
            notif.user = { 
              id: notif.userId, 
              name: 'Unknown User', 
              avatarUrl: `https://avatar.vercel.sh/user.svg`,
              email: '',
              username: '',
              specialization: '',
              studyYear: 1,
              followers: 0,
              following: 0,
              followingIds: [],
              blockedUserIds: [],
              joinedCommunities: [],
              isActive: true
            };
          }
        } catch (userError) {
          console.error(`Error fetching user ${notif.userId}:`, userError);
          notif.user = { 
            id: notif.userId, 
            name: 'Unknown User', 
            avatarUrl: `https://avatar.vercel.sh/user.svg`,
            email: '',
            username: '',
            specialization: '',
            studyYear: 1,
            followers: 0,
            following: 0,
            followingIds: [],
            blockedUserIds: [],
            joinedCommunities: [],
            isActive: true
          };
        }
      }
      if (notif.postId) {
        try {
          const postDoc = await db.collection('posts').doc(notif.postId).get();
          if (postDoc.exists) {
            const postData = postDoc.data();
            notif.post = { 
              id: postDoc.id, 
              ...postData,
              courseName: postData.courseName || postData.review || 'Post'
            };
          }
        } catch (postError) {
          console.error(`Error fetching post ${notif.postId}:`, postError);
        }
      }
      notifications.push({
        id: doc.id,
        ...notif,
        timestamp: notif.timestamp?.toDate().toISOString() || new Date().toISOString()
      });
    }
    
    // Sort by timestamp if we fetched without orderBy
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    console.log(`📬 Returning ${notifications.length} notifications for user ${userId}`);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('notifications').doc(id).update({
      read: true,
      readAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all notifications as read
app.put('/api/notifications/:userId/read-all', async (req, res) => {
  try {
    const { userId } = req.params;
    const snapshot = await db.collection('notifications')
      .where('targetUserId', '==', userId)
      .where('read', '==', false)
      .get();
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        read: true,
        readAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    await batch.commit();
    res.json({ success: true, count: snapshot.docs.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to create notification
async function createNotification(type, targetUserId, userId, postId = null) {
  try {
    // Don't create notification if user is notifying themselves
    if (targetUserId === userId) {
      console.log('Skipping notification: user notifying themselves');
      return;
    }
    
    if (!targetUserId || !userId) {
      console.log('Skipping notification: missing user IDs', { targetUserId, userId });
      return;
    }
    
    // For like/comment notifications, check if there's a recent unread notification (within last hour)
    // This prevents spam but allows new notifications after some time
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    try {
      const existingSnapshot = await db.collection('notifications')
        .where('targetUserId', '==', targetUserId)
        .where('userId', '==', userId)
        .where('type', '==', type)
        .where('read', '==', false)
        .limit(1)
        .get();
      
      if (!existingSnapshot.empty) {
        const existingDoc = existingSnapshot.docs[0];
        const existingData = existingDoc.data();
        const existingTimestamp = existingData.timestamp?.toDate();
        
        // If notification is less than 1 hour old, just update timestamp
        if (existingTimestamp && existingTimestamp > oneHourAgo) {
          await existingDoc.ref.update({
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            postId: postId || existingData.postId
          });
          console.log('Updated existing notification timestamp');
          return;
        }
      }
    } catch (queryError) {
      // If query fails (e.g., missing index), just create new notification
      console.warn('Notification query failed, creating new notification:', queryError.message);
    }
    
    // Create new notification
    const notificationRef = await db.collection('notifications').add({
      type,
      targetUserId,
      userId,
      postId,
      read: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Created notification:', { 
      id: notificationRef.id,
      type, 
      targetUserId, 
      userId, 
      postId 
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

// ============= ROADMAPS =============

// Get User Roadmaps
app.get('/api/users/:userId/roadmaps', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user exists first
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get roadmaps subcollection - if it doesn't exist or is empty, return empty object
    try {
      const snapshot = await db.collection('users').doc(userId)
        .collection('roadmaps')
        .get();

      const roadmaps = {};
      snapshot.forEach(doc => {
        roadmaps[doc.id] = doc.data();
      });

      res.json(roadmaps);
    } catch (subcollectionError) {
      // If subcollection doesn't exist or has no documents, return empty object
      res.json({});
    }
  } catch (error) {
    console.error('Error fetching roadmaps:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save Roadmap
app.post('/api/users/:userId/roadmaps/:roadmapKey', async (req, res) => {
  try {
    const { userId, roadmapKey } = req.params;
    const roadmapData = req.body;

    // Check if user exists first
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.collection('users').doc(userId)
      .collection('roadmaps')
      .doc(roadmapKey)
      .set(roadmapData);

    res.json({ success: true, roadmap: roadmapData });
  } catch (error) {
    console.error('Error saving roadmap:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= PRODUCTION DEPLOYMENT SETUP =============
// (ضع هذا الكود قبل app.listen مباشرة)

// تقديم ملفات الواجهة (الفرونت إند) بعد بنائها
if (process.env.NODE_ENV === 'production') {
  // جعل مجلد 'dist' متاح للعامة
  app.use(express.static(path.join(__dirname, 'dist')));

  // أي رابط مش API، رجعنا للصفحة الرئيسية (عشان React Router يشتغل)
  app.get('*', (req, res) => {
    // نتأكد إننا مش بنعترض مسارات الـ API
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Start server
app.listen(PORT, HOST, () => {
  console.log(`🚀 Firebase API server running on http://${HOST}:${PORT}`);
  console.log(`📝 Health check: http://${HOST}:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  if (isProduction) {
    console.log(`✅ Production mode: Using environment variables for configuration`);
  }
  console.log(`\n📚 Available endpoints:`);
  console.log(`   GET    /api/users`);
  console.log(`   GET    /api/users/:id`);
  console.log(`   POST   /api/users`);
  console.log(`   PUT    /api/users/:id`);
  console.log(`   DELETE /api/users/:id`);
  console.log(`   GET    /api/posts`);
  console.log(`   GET    /api/posts/:id`);
  console.log(`   POST   /api/posts`);
  console.log(`   PUT    /api/posts/:id`);
  console.log(`   DELETE /api/posts/:id`);
  console.log(`   GET    /api/courses`);
  console.log(`   GET    /api/courses/:id`);
  console.log(`   POST   /api/courses`);
  console.log(`   POST   /api/auth/signup`);
  console.log(`   POST   /api/auth/login`);
  console.log(`   GET    /api/auth/user/:uid`);
});

// Handle uncaught errors gracefully
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

