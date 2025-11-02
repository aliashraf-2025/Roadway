const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin SDK
// Check if service account file exists
const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('\n❌ ERROR: Firebase service account file not found!');
  console.error('\n📋 To fix this:');
  console.error('   1. Go to: https://console.firebase.google.com/');
  console.error('   2. Select your project: a2z-app-3ea59');
  console.error('   3. Go to Project Settings → Service Accounts');
  console.error('   4. Click "Generate New Private Key"');
  console.error('   5. Save the JSON file as: firebase-service-account.json');
  console.error('   6. Place it in the project root directory\n');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

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
    const { email, password, displayName, studyYear } = req.body;
    
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
    await db.collection('users').doc(userRecord.uid).set({
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
    });

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

// Delete user
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('users').doc(id).delete();
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

// Delete post
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
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

// Delete course
app.delete('/api/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
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
    const updatedComments = comments.map(comment => {
      if (comment.id === commentId) {
        const likedBy = comment.likedBy || [];
        const isLiked = likedBy.includes(userId);
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
    const { senderId, text } = req.body;
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
      participants: req.body.participants || []
    }, { merge: true });

    const newMessage = await docRef.get();
    res.status(201).json({
      id: newMessage.id,
      ...newMessage.data(),
      timestamp: newMessage.data().timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Firebase API server running on http://localhost:${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
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

