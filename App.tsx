import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Page, User, Post, Course, Comment, Theme, Notification, Roadmaps, Roadmap, ChatMessage } from './types';

// استيراد db و auth من ملف firebase.ts
import { auth, db } from './firebase';
import { 
    createUserWithEmailAndPassword, 
    signInWithCustomToken,
    signOut, 
    onAuthStateChanged 
} from 'firebase/auth';

// استيراد دوال Firestore للتعامل مع قاعدة البيانات والإشعارات اللحظية
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { usersAPI, postsAPI, coursesAPI, roadmapsAPI, authAPI, notificationsAPI } from './api';

import Layout from './components/Layout';
import EditPostModal from './components/EditPostModal';
import GlassCard from './components/GlassCard';
import EditCommunityModal from './components/EditCommunityModal';

// --- 1. LAZY LOADING PAGES (لتحسين أداء الموقع وسرعة التحميل) ---
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const HomePage = React.lazy(() => import('./pages/HomePage'));
const DiscoverPage = React.lazy(() => import('./pages/DiscoverPage'));
const RoadmapPage = React.lazy(() => import('./pages/RoadmapPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const AboutPage = React.lazy(() => import('./pages/AboutPage'));
const PrivacyPage = React.lazy(() => import('./pages/PrivacyPage'));
const TermsPage = React.lazy(() => import('./pages/TermsPage'));
const SupportPage = React.lazy(() => import('./pages/SupportPage'));
const ChatPage = React.lazy(() => import('./pages/ChatPage'));
const CommunityPage = React.lazy(() => import('./pages/CommunityPage'));
const AdminPage = React.lazy(() => import('./pages/AdminPage'));

// شاشة تحميل تظهر أثناء التنقل بين الصفحات
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen bg-[var(--background)] text-[var(--primary-accent)]">
    <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold animate-pulse">Loading Roadway...</p>
    </div>
  </div>
);

type UserSignUpData = Omit<User, 'id' | 'avatarUrl' | 'followers' | 'following' | 'studyYear' | 'isActive' | 'followingIds' | 'blockedUserIds' | 'joinedCommunities'> & {
    password?: string;
    studyYear: string;
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [viewedUserId, setViewedUserId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [chattingWith, setChattingWith] = useState<User | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>('dark');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [postToReport, setPostToReport] = useState<Post | null>(null);
  const [hiddenPostIds, setHiddenPostIds] = useState<string[]>([]);
  const [viewedCommunity, setViewedCommunity] = useState<Course | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [editingCommunity, setEditingCommunity] = useState<Course | null>(null);
  const [communityToDelete, setCommunityToDelete] = useState<Course | null>(null);
  const [savedRoadmaps, setSavedRoadmaps] = useState<Roadmaps>({});
  const [initialRoadmapKey, setInitialRoadmapKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  // --- AUTH LISTENER ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userData = await usersAPI.getById(user.uid);
                // التعديل: ضفنا (userData as any) عشان نجبره يقبل البيانات
                setCurrentUser({ id: user.uid, ...(userData as any) } as User);
            } catch (error) {
                console.error("User not found in database:", error);
                await signOut(auth);
                setCurrentUser(null);
            }
        } else {
            setCurrentUser(null);
            setCurrentPage('landing');
        }
        setTimeout(() => setIsLoading(false), 300);
    });
    return () => unsubscribe();
  }, []);

  // --- 2. REAL-TIME NOTIFICATIONS (إصلاح مشكلة الإشعارات) ---
  useEffect(() => {
    if (!currentUser) {
        setNotifications([]);
        return;
    }

    // الاستماع المباشر للتغييرات في مجموعة "notifications" في Firestore
    const q = query(
        collection(db, "notifications"),
        where("targetUserId", "==", currentUser.id),
        orderBy("timestamp", "desc"),
        limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const newNotifications: Notification[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                type: data.type,
                timestamp: data.timestamp?.toDate().toISOString() || new Date().toISOString(),
                read: data.read,
                // بيانات مؤقتة للمستخدم لحين عمل Hydration
                user: {
                    id: data.userId,
                    name: 'User', 
                    username: 'user',
                    avatarUrl: 'https://avatar.vercel.sh/user.svg',
                    studyYear: 1,
                    specialization: '',
                    followers: 0, following: 0, isActive: true,
                    followingIds: [], blockedUserIds: [], joinedCommunities: []
                },
                post: data.postId ? { id: data.postId } as Post : undefined
            } as Notification;
        });
        setNotifications(newNotifications);
    }, (error) => {
        // تجاهل أخطاء الصلاحيات المبدئية
        if (error.code !== 'permission-denied') {
             console.error("Real-time notification error:", error);
        }
    });

    return () => unsubscribe();
  }, [currentUser?.id]);

  // --- CHECK URL FOR SHARED ROADMAP ---
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roadmapKey = urlParams.get('roadmap');
    if (roadmapKey) {
      setInitialRoadmapKey(roadmapKey);
      // Navigate to roadmap page if not already there
      if (currentUser && currentPage !== 'roadmap') {
        setCurrentPage('roadmap');
      }
    }
  }, [currentUser, currentPage]);

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchData = async () => {
        if (!currentUser) return;
        
        try {
            const results = await Promise.allSettled([
                usersAPI.getAll(),
                postsAPI.getAll(currentUser.id, currentUser.isAdmin), // Pass userId for admin filtering
                coursesAPI.getAll(),
                roadmapsAPI.getUserRoadmaps(currentUser.id)
            ]);

            if (results[0].status === 'fulfilled') {
                setAllUsers(results[0].value as User[]);
            }
            
            if (results[1].status === 'fulfilled') {
                const postsList = results[1].value as any[];
                const postsMap = new Map();
                postsList.forEach(post => postsMap.set(post.id, post));

                const hydratedPosts = postsList.map((p: any) => {
                    if (p.repostOf && typeof p.repostOf === 'string') {
                        return { ...p, repostOf: postsMap.get(p.repostOf) };
                    }
                    return p;
                });
                setPosts(hydratedPosts as Post[]);
            }
            
            if (results[2].status === 'fulfilled') {
                setCourses(results[2].value as Course[]);
            }
            
            if (results[3].status === 'fulfilled') {
                setSavedRoadmaps(results[3].value as Roadmaps);
            }

        } catch (error) {
            console.error("Error fetching initial data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (currentUser) {
        fetchData();
    }
  }, [currentUser?.id]);


  // --- HYDRATION (دمج البيانات) ---
  const hydratedNotifications = useMemo(() => {
      return notifications.map(notif => {
          const realUser = allUsers.find(u => u.id === notif.user.id);
          const realPost = posts.find(p => p.id === notif.post?.id);
          return { ...notif, user: realUser || notif.user, post: realPost || notif.post };
      });
  }, [notifications, allUsers, posts]);


  const hydratedPosts = useMemo(() => {
    if (!posts.length || !allUsers.length) return [];
    const usersMap = new Map(allUsers.map(u => [u.id, u]));

    const getAuthor = (authorRef: any): User => {
        if (typeof authorRef === 'string') {
            return usersMap.get(authorRef) || { id: authorRef, name: 'Unknown User', avatarUrl: '', username: 'unknown' } as User;
        }
        return authorRef as User;
    };

    return posts.map(post => {
        const hydratedPost = {
            ...post,
            author: getAuthor(post.author),
            comments: (post.comments || []).map(comment => ({
                ...comment,
                author: getAuthor(comment.author),
            })),
            repostOf: post.repostOf ? {
                ...post.repostOf,
                author: getAuthor(post.repostOf.author)
            } : undefined,
        };
        return hydratedPost;
    });
  }, [posts, allUsers]);


  // --- HANDLERS ---
  const handleToggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };
  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password) as any;
      if (response.success && response.customToken) {
        await signInWithCustomToken(auth, response.customToken);
        setCurrentPage('home');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error("Login Error:", error);
      alert(error.message || "Failed to log in.");
    }
  };

  const handleSignup = async (formData: UserSignUpData) => {
    if (!formData.password) {
        alert("Password is required.");
        return;
    }
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const newUser: Omit<User, 'id'> = { 
            name: formData.name,
            username: formData.username,
            email: formData.email,
            avatarUrl: `https://avatar.vercel.sh/${formData.username}.svg?text=${formData.name.substring(0,2)}`,
            specialization: formData.specialization,
            studyYear: parseInt(formData.studyYear, 10) || 1,
            followers: 0,
            following: 0,
            university: formData.university,
            isActive: true,
            followingIds: [],
            blockedUserIds: [],
            joinedCommunities: [],
        };
        await usersAPI.create({ id: userCredential.user.uid, ...newUser });
        setAllUsers(prev => [...prev, {id: userCredential.user.uid, ...newUser}]);
        setCurrentPage('home');
    } catch (error: any) {
        console.error("Signup Error:", error);
        alert(`Failed to sign up. Error: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleLikePost = async (postId: string) => {
    if (!currentUser) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    const isLiked = (post.likedBy || []).includes(currentUser.id);
    const newLikes = isLiked ? post.likes - 1 : post.likes + 1;

    // Optimistic update
    setPosts(posts.map(p => p.id === postId ? { 
        ...p, 
        likedBy: isLiked ? p.likedBy.filter(id => id !== currentUser.id) : [...(p.likedBy || []), currentUser.id], 
        likes: newLikes 
    } : p));

    try {
        const updatedPost = await postsAPI.like(postId, currentUser.id);
        // FIX: Cast result to Post to avoid "Spread types" error
        setPosts(posts.map(p => p.id === postId ? { ...p, ...(updatedPost as Post) } : p));
    } catch (error) {
        console.error("Error liking post:", error);
        // Revert logic can be added here if needed
    }
  };
  
  const handleLikeComment = async (postId: string, commentId: string) => {
    if (!currentUser) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    const updatedComments = post.comments.map(comment => {
        if (comment.id === commentId) {
            const isLiked = (comment.likedBy || []).includes(currentUser.id);
            return {
                ...comment,
                likes: isLiked ? comment.likes - 1 : comment.likes + 1,
                likedBy: isLiked ? comment.likedBy.filter(id => id !== currentUser.id) : [...(comment.likedBy || []), currentUser.id],
            };
        }
        return comment;
    });
    
    setPosts(posts.map(p => p.id === postId ? { ...p, comments: updatedComments } : p));
    
    try {
        const updatedPost = await postsAPI.likeComment(postId, commentId, currentUser.id);
        // FIX: Cast result to Post
        setPosts(posts.map(p => p.id === postId ? { ...p, ...(updatedPost as Post) } : p));
    } catch (error) {
        console.error("Error liking comment:", error);
    }
  };

  const handleRatePost = async (postId: string, rating: number) => {
    setPosts(posts.map(post => post.id === postId ? { ...post, rating } : post));
    try {
        const updatedPost = await postsAPI.rate(postId, rating);
        // FIX: Cast result to Post
        setPosts(posts.map(p => p.id === postId ? { ...p, ...(updatedPost as Post) } : p));
    } catch (error) {
        console.error("Error rating post:", error);
    }
  };

  // --- 3. OPTIMISTIC POST CREATION (نشر سريع جداً) ---
  const handleCreatePost = async (postData: Omit<Post, 'id' | 'author' | 'likes' | 'comments' | 'timestamp' | 'likedBy' | 'repostOf'>) => {
    if (!currentUser) return;
    
    // 1. إنشاء بوست وهمي وعرضه فوراً
    const tempId = `temp-${Date.now()}`;
    const tempPost: Post = {
        ...postData,
        id: tempId,
        author: currentUser,
        likes: 0,
        comments: [],
        likedBy: [],
        field: postData.field || currentUser.specialization,
        timestamp: new Date().toISOString()
    };

    setPosts([tempPost, ...posts]);
    
    // 2. إرسال البيانات للسيرفر
    try {
        const newPostData = {
            ...postData,
            author: currentUser.id,
            likes: 0,
            comments: [],
            likedBy: [],
            field: postData.field || currentUser.specialization,
        };
        const createdPost = await postsAPI.create(newPostData);
        
        // 3. استبدال البوست الوهمي بالحقيقي مع إصلاح خطأ الـ timestamp
        // FIX: Ensure timestamp exists and cast types properly
        const realPost = { 
            ...(createdPost as Post), 
            author: currentUser, 
            timestamp: (createdPost as any).timestamp || new Date().toISOString() 
        };
        setPosts(prev => prev.map(p => p.id === tempId ? realPost as Post : p));
        
    } catch (error) {
        console.error("Error creating post:", error);
        setPosts(prev => prev.filter(p => p.id !== tempId));
        alert("Failed to create post. Please try again.");
    }
  };

  const handleCommentPost = async (postId: string, commentText: string) => {
      if(!currentUser) return;
      
      const newCommentHydrated: Comment = {
          id: `temp-${Date.now()}`,
          author: currentUser,
          text: commentText,
          timestamp: new Date().toISOString(),
          likes: 0,
          likedBy: [],
      };
      
      setPosts(posts.map(post => post.id === postId ? { ...post, comments: [...post.comments, newCommentHydrated] } : post));

      try {
          const updatedPost = await postsAPI.addComment(postId, currentUser.id, commentText);
          // FIX: Cast result to Post
          setPosts(posts.map(p => p.id === postId ? { ...p, ...(updatedPost as Post) } : p));
      } catch (error) {
          console.error("Error adding comment:", error);
      }
   };

   const handleFollowToggle = async (targetUserId: string) => {
    if (!currentUser || currentUser.id === targetUserId) return;
    
    // 1. Find target user first to ensure existence
    const targetUser = allUsers.find(u => u.id === targetUserId);
    if (!targetUser) return;

    const isFollowing = currentUser.followingIds.includes(targetUserId);

    // 2. Prepare updated objects
    const updatedCurrentUser = {
        ...currentUser,
        following: isFollowing ? currentUser.following - 1 : currentUser.following + 1,
        followingIds: isFollowing ? currentUser.followingIds.filter(id => id !== targetUserId) : [...currentUser.followingIds, targetUserId]
    };
    
    const updatedTargetUser = {
        ...targetUser,
        followers: isFollowing ? targetUser.followers - 1 : targetUser.followers + 1
    };

    // 3. Update State
    setCurrentUser(updatedCurrentUser);
    setAllUsers(prevUsers => prevUsers.map(u => {
        if (u.id === currentUser.id) return updatedCurrentUser;
        if (u.id === targetUserId) return updatedTargetUser;
        return u;
    }));

    // 4. API Call
    try {
        const result = await usersAPI.follow(currentUser.id, targetUserId);
        // Update with real server data if needed
    } catch (error) {
        console.error("Error following user:", error);
        // Revert logic acts as safety net
        setCurrentUser(currentUser);
    }
  };
  
  const handleViewProfile = (userId: string) => {
      setViewedUserId(userId);
      setCurrentPage('profile');
      window.scrollTo(0, 0);
  };

  const getChatId = (userId1: string, userId2: string) => {
    return [userId1, userId2].sort().join('_');
  };

  const handleStartChat = (user: User) => {
    if (!currentUser) return;
    const chatId = getChatId(currentUser.id, user.id);
    setActiveChatId(chatId);
    setChattingWith(user);
  };
  
  const handleOpenEditModal = (post: Post) => {
    setEditingPost(post);
  };
  
  // ✅ التعديل هنا: الدالة بقيت تقبل Partial<Post> يعني أي بيانات تتعدل
  const handleUpdatePost = async (updatedData: Partial<Post>) => {
    if (!editingPost) return;
    
    // تحديث فوري (Optimistic Update)
    setPosts(posts.map(p => p.id === editingPost.id ? { ...p, ...updatedData } : p));
    setEditingPost(null);
    
    try {
        // إرسال للسيرفر
        const result = await postsAPI.update(editingPost.id, updatedData);
        
        // التأكد من التحديث من السيرفر
        setPosts(posts.map(p => p.id === editingPost.id ? { ...p, ...(result as Post) } : p));
    } catch (error) {
        console.error("Error updating post:", error);
        alert("Failed to update post.");
    }
  };

  const handleUpdateProfile = async (updatedData: Partial<User>) => {
    if (!currentUser) return;
    
    if (updatedData.avatarUrl && updatedData.avatarUrl.startsWith('data:image')) {
      const base64Size = updatedData.avatarUrl.length * 0.75;
      if (base64Size > 1000000) {
        alert('Image is too large. Please use an image smaller than 1MB.');
        return;
      }
    }
    
    const updatedUser = { ...currentUser, ...updatedData };
    setCurrentUser(updatedUser);
    setAllUsers(allUsers.map(u => u.id === currentUser.id ? updatedUser : u));
    
    try {
        const result = await usersAPI.update(currentUser.id, updatedData);
        // FIX: Cast result to User
        const finalUser = { id: currentUser.id, ...(result as User) } as User;
        setCurrentUser(finalUser);
        setAllUsers(allUsers.map(u => u.id === currentUser.id ? finalUser : u));
        alert('Profile updated successfully!');
    } catch (error: any) {
        console.error("Error updating profile:", error);
        alert(`Failed to update profile: ${error.message || 'Unknown error'}`);
        setCurrentUser(currentUser);
    }
  };

  const handleOpenDeleteConfirm = (post: Post) => setPostToDelete(post);
  const handleCloseDeleteConfirm = () => setPostToDelete(null);

  const handleConfirmDelete = async () => {
    if (postToDelete && currentUser) {
      const postId = postToDelete.id;
      setPosts(prev => prev.filter(p => p.id !== postId));
      setPostToDelete(null);
      
      try {
          await postsAPI.delete(postId, currentUser.id);
      } catch (error) {
          console.error("Error deleting post:", error);
          setPosts([...posts, postToDelete]);
      }
    }
  };

  const handleOpenReportConfirm = (post: Post) => setPostToReport(post);
  const handleCloseReportConfirm = () => setPostToReport(null);

  const handleConfirmReport = async () => {
    if (postToReport && currentUser) {
      console.log(`Post ${postToReport.id} reported by ${currentUser.username}.`);
      setHiddenPostIds(prev => [...prev, postToReport!.id]);
      setPostToReport(null);
    }
  };
  
  const handleBlockUser = async (userIdToBlock: string) => {
    if (!currentUser || currentUser.id === userIdToBlock) return;
    const updatedUser = { ...currentUser, blockedUserIds: [...currentUser.blockedUserIds, userIdToBlock] };
    setCurrentUser(updatedUser);
    setAllUsers(allUsers.map(u => u.id === currentUser.id ? updatedUser : u));
    
    try {
        const result = await usersAPI.block(currentUser.id, userIdToBlock);
        // FIX: Cast result to User
        const finalUser = { id: currentUser.id, ...(result as User) } as User;
        setCurrentUser(finalUser);
        setAllUsers(allUsers.map(u => u.id === currentUser.id ? finalUser : u));
    } catch (error) {
        console.error("Error blocking user:", error);
        setCurrentUser(currentUser);
    }
  };
  

  const visiblePosts = useMemo(() => {
    if (!currentUser) return hydratedPosts;
    const blockedIds = currentUser.blockedUserIds || [];
    return hydratedPosts.filter(post => {
      const authorId = (post.author as User)?.id;
      const originalAuthorId = (post.repostOf?.author as User)?.id;
      
      return !hiddenPostIds.includes(post.id) &&
             authorId && !blockedIds.includes(authorId) &&
             (!originalAuthorId || !blockedIds.includes(originalAuthorId));
    });
  }, [hydratedPosts, currentUser, hiddenPostIds]);

  // --- RENDER ---
  if (isLoading) {
    return <PageLoader />;
  }

  const navigate = (page: Page) => {
    if (page === 'profile' && currentUser) {
      setViewedUserId(currentUser.id);
    }
    setSearchQuery('');
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };
  
  const handleViewCommunity = (course: Course) => {
    setViewedCommunity(course);
    setCurrentPage('community');
    window.scrollTo(0, 0);
  };
  
  const handleJoinCommunityToggle = async (field: string) => {
    if (!currentUser) return;
    const isJoined = currentUser.joinedCommunities.includes(field);
    const action = isJoined ? 'leave' : 'join';
    
    const updatedUser = {...currentUser, joinedCommunities: isJoined ? currentUser.joinedCommunities.filter(c => c !== field) : [...currentUser.joinedCommunities, field] };
    setCurrentUser(updatedUser);
    setAllUsers(allUsers.map(u => u.id === currentUser.id ? updatedUser : u));
    
    try {
        const result = await usersAPI.joinCommunity(currentUser.id, field, action);
        // FIX: Cast result to User
        const finalUser = { id: currentUser.id, ...(result as User) } as User;
        setCurrentUser(finalUser);
        setAllUsers(allUsers.map(u => u.id === currentUser.id ? finalUser : u));
    } catch (error) {
        console.error("Error joining/leaving community:", error);
        setCurrentUser(currentUser);
    }
  };
  
  // 1. استبدل دالة handleCreateCommunity القديمة بدي (عشان السرعة)
  const handleCreateCommunity = async (communityData: Omit<Course, 'id' | 'rating' | 'platform' | 'ownerId'>) => {
    if (!currentUser) return;

    // إنشاء ID مؤقت وبيانات وهمية للعرض الفوري
    const tempId = `temp-${Date.now()}`;
    const newCommunityData: Course = {
      id: tempId,
      ...communityData,
      rating: 0,
      platform: 'Community',
      ownerId: currentUser.id,
    };
    
    // تحديث الشاشة فوراً (السرعة القصوى) 🚀
    setCourses(prev => [newCommunityData, ...prev]);
    
    // نقلك للصفحة الجديدة فوراً
    setViewedCommunity(newCommunityData);
    setCurrentPage('community');
    
    try {
        // إرسال البيانات للسيرفر في الخلفية
        const createdCourse = await coursesAPI.create({
            ...communityData,
            rating: 0,
            platform: 'Community',
            ownerId: currentUser.id,
        });
        
        // تحديث الـ ID المؤقت بالحقيقي بعد نجاح السيرفر
        const realCourse = createdCourse as Course;
        setCourses(prev => prev.map(c => c.id === tempId ? realCourse : c));
        setViewedCommunity(realCourse);
        
        // تحديث قائمة مجتمعات المستخدم
        await handleJoinCommunityToggle(communityData.field);

    } catch (error) {
        console.error("Error creating community:", error);
        // لو حصل خطأ، نرجع نمسح المجتمع المؤقت
        setCourses(prev => prev.filter(c => c.id !== tempId));
        setViewedCommunity(null);
        setCurrentPage('discover'); // ارجع لصفحة الاستكشاف
        alert("Failed to create community. Check internet or image size (max 1MB).");
    }
  };

  // 2. ضيف الدالة الجديدة دي (عشان تقييم المجتمع)
  const handleRateCommunity = async (courseId: string, rating: number) => {
    // تحديث فوري
    setCourses(courses.map(c => c.id === courseId ? { ...c, rating } : c));
    if (viewedCommunity && viewedCommunity.id === courseId) {
        setViewedCommunity({ ...viewedCommunity, rating });
    }

    try {
        await coursesAPI.rate(courseId, rating);
    } catch (error) {
        console.error("Error rating community:", error);
    }
  };
  
  const handleUpdateCommunity = async (updatedData: Partial<Course>) => {
    if (!editingCommunity) return;
    const updatedCourses = courses.map(c => c.id === editingCommunity.id ? { ...c, ...updatedData } : c);
    setCourses(updatedCourses);
    setViewedCommunity(prev => prev ? { ...prev, ...updatedData } : null);
    setEditingCommunity(null);
    
    try {
        const result = await coursesAPI.update(editingCommunity.id, updatedData);
        // FIX: Cast result to Course
        setCourses(courses.map(c => c.id === editingCommunity.id ? result as Course : c));
        setViewedCommunity(prev => prev && prev.id === editingCommunity.id ? result as Course : prev);
    } catch (error) {
        console.error("Error updating community:", error);
    }
  };

  const handleConfirmDeleteCommunity = async () => {
    if (!communityToDelete || !currentUser) return;
    const communityId = communityToDelete.id;
    setCourses(prev => prev.filter(c => c.id !== communityId));
    setCurrentPage('discover');
    setCommunityToDelete(null);
    
    try {
        await coursesAPI.delete(communityId, currentUser.id);
    } catch (error) {
        console.error("Error deleting community:", error);
        setCourses([...courses, communityToDelete]);
    }
  };
  
  const handleRepost = async (postId: string) => {
     if(!currentUser) return;
     const originalPost = posts.find(p => p.id === postId);
     if (!originalPost || originalPost.repostOf || (originalPost.author as User).id === currentUser.id) return;
     
     const tempId = `repost-${Date.now()}`;
     const newPostTemp: Post = {
         id: tempId,
         author: currentUser,
         courseName: '', review: '', rating: 0, likes: 0, comments: [], likedBy: [],
         field: originalPost.field, isCommunityPost: originalPost.isCommunityPost,
         repostOf: originalPost,
         timestamp: new Date().toISOString()
     };
     setPosts([newPostTemp, ...posts]);

     try {
        const newRepostData = {
            author: currentUser.id, courseName: '', review: '', rating: 0, likes: 0, comments: [], likedBy: [],
            field: originalPost.field, isCommunityPost: originalPost.isCommunityPost, repostOf: originalPost.id,
        };
        const createdPost = await postsAPI.create(newRepostData);
        // FIX: Cast createdPost to Post
        const realPost = { 
            ...(createdPost as Post), 
            author: currentUser, 
            repostOf: originalPost, 
            timestamp: (createdPost as any).timestamp || new Date().toISOString() 
        };
        setPosts(prev => prev.map(p => p.id === tempId ? realPost as Post : p));
    } catch (error) {
        setPosts(prev => prev.filter(p => p.id !== tempId));
        console.error("Error reposting:", error);
        alert("Failed to repost. Please try again.");
    }
  };
  
  const handleSaveRoadmap = async (roadmapKey: string, roadmapData: Roadmap) => {
    if (!currentUser) return;
    const newKey = roadmapKey.toLowerCase().replace(/\s+/g, '-');
    setSavedRoadmaps(prev => ({ ...prev, [newKey]: roadmapData }));
    
    try {
        await roadmapsAPI.saveRoadmap(currentUser.id, newKey, roadmapData);
    } catch (error) {
        console.error("Error saving roadmap:", error);
        setSavedRoadmaps(prev => {
            const updated = { ...prev };
            delete updated[newKey];
            return updated;
        });
    }
  };

  const renderAppPage = () => {
    if (!currentUser) return null;

    switch(currentPage) {
        case 'home':
            return <HomePage posts={visiblePosts} currentUser={currentUser} allUsers={allUsers} onLikePost={handleLikePost} onLikeComment={handleLikeComment} onCreatePost={handleCreatePost} onCommentPost={handleCommentPost} onViewProfile={handleViewProfile} onRatePost={handleRatePost} onEditPost={handleOpenEditModal} onDeleteRequest={handleOpenDeleteConfirm} onReportRequest={handleOpenReportConfirm} onBlockUser={handleBlockUser} onRepost={handleRepost} searchQuery={searchQuery} />;
        case 'discover':
            return <DiscoverPage courses={courses} searchQuery={searchQuery} onViewCommunity={handleViewCommunity} onCreateCommunity={handleCreateCommunity} />;
        case 'roadmap':
            return <RoadmapPage 
                        roadmaps={savedRoadmaps}
                        onSaveRoadmap={handleSaveRoadmap}
                        allPosts={visiblePosts}
                        allUsers={allUsers}
                        currentUser={currentUser}
                        initialRoadmapKey={initialRoadmapKey}
                        setCurrentPage={navigate}
                        setSearchQuery={setSearchQuery}
                        onViewProfile={handleViewProfile}
                   />;
        case 'community':
            if (!viewedCommunity) {
                return <DiscoverPage courses={courses} searchQuery={searchQuery} onViewCommunity={handleViewCommunity} onCreateCommunity={handleCreateCommunity} />;
            }
            return <CommunityPage
                community={viewedCommunity}
                currentUser={currentUser}
                allUsers={allUsers}
                allPosts={visiblePosts}
                courses={courses}
                onJoinToggle={handleJoinCommunityToggle}
                onViewProfile={handleViewProfile}
                onLikePost={handleLikePost}
                onLikeComment={handleLikeComment}
                onCommentPost={handleCommentPost}
                onCreatePost={handleCreatePost}
                onRatePost={handleRatePost}
                onEditPost={handleOpenEditModal}
                onDeleteRequest={handleOpenDeleteConfirm}
                onReportRequest={handleOpenReportConfirm}
                onBlockUser={handleBlockUser}
                onRepost={handleRepost}
                setCurrentPage={navigate}
                onEditCommunity={() => setEditingCommunity(viewedCommunity)}
                onDeleteCommunity={() => setCommunityToDelete(viewedCommunity)}
                onRateCommunity={handleRateCommunity} 
            />;
        case 'profile':
            const profileUser = allUsers.find(u => u.id === viewedUserId) ?? currentUser;
            return <ProfilePage 
                        profileUser={profileUser} 
                        currentUser={currentUser} 
                        allPosts={visiblePosts} 
                        allUsers={allUsers}
                        courses={courses}
                        onLogout={handleLogout}
                        onLikePost={handleLikePost}
                        onLikeComment={handleLikeComment}
                        onCommentPost={handleCommentPost}
                        onViewProfile={handleViewProfile}
                        onFollowToggle={handleFollowToggle}
                        setCurrentPage={navigate}
                        onStartChat={handleStartChat}
                        onRatePost={handleRatePost}
                        onEditPost={handleOpenEditModal}
                        onDeleteRequest={handleOpenDeleteConfirm}
                        onReportRequest={handleOpenReportConfirm}
                        onBlockUser={handleBlockUser}
                        onRepost={handleRepost}
                        onViewCommunity={handleViewCommunity}
                        theme={theme}
                        onToggleTheme={handleToggleTheme}
                        onUpdateProfile={handleUpdateProfile}
                    />;
        case 'admin':
            return currentUser.isAdmin ? <AdminPage 
                allUsers={allUsers} 
                allPosts={visiblePosts} 
                allCourses={courses}
                currentUser={currentUser}
                onRefreshPosts={async () => {
                    try {
                        const updatedPosts = await postsAPI.getAll(currentUser.id, true);
                        setPosts(updatedPosts as Post[]);
                    } catch (error) {
                        console.error("Error refreshing posts:", error);
                    }
                }}
                onDeleteUser={async (userId) => {
                    if (!currentUser) return;
                    try {
                        setAllUsers(prev => prev.filter(u => u.id !== userId));
                        await usersAPI.delete(userId, currentUser.id);
                        alert('User deleted successfully');
                    } catch (error: any) {
                        console.error("Error deleting user:", error);
                        alert(`Failed to delete user: ${error.message || 'Unknown error'}`);
                        const updatedUsers = await usersAPI.getAll();
                        setAllUsers(updatedUsers as User[]);
                    }
                }}
                onDeletePost={async (postId) => {
                    if (!currentUser) return;
                    try {
                        setPosts(prev => prev.filter(p => p.id !== postId));
                        await postsAPI.delete(postId, currentUser.id);
                        alert('Post deleted successfully');
                    } catch (error: any) {
                        console.error("Error deleting post:", error);
                        alert(`Failed to delete post: ${error.message || 'Unknown error'}`);
                        const updatedPosts = await postsAPI.getAll(currentUser.id, true);
                        setPosts(updatedPosts as Post[]);
                    }
                }}
                onDeleteCommunity={async (courseId) => {
                    if (!currentUser) return;
                    try {
                        setCourses(prev => prev.filter(c => c.id !== courseId));
                        await coursesAPI.delete(courseId, currentUser.id);
                        alert('Community deleted successfully');
                    } catch (error: any) {
                        console.error("Error deleting community:", error);
                        alert(`Failed to delete community: ${error.message || 'Unknown error'}`);
                        const updatedCourses = await coursesAPI.getAll();
                        setCourses(updatedCourses as Course[]);
                    }
                }}
                onUpdateUser={async (userId, data) => {
                    try {
                        const result = await usersAPI.update(userId, data);
                        const updatedUser = { id: userId, ...(result as User) } as User;
                        setAllUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
                        alert('User updated successfully');
                    } catch (error: any) {
                        console.error("Error updating user:", error);
                        alert(`Failed to update user: ${error.message || 'Unknown error'}`);
                    }
                }}
                onUpdatePost={async (postId, data) => {
                    try {
                        const result = await postsAPI.update(postId, data);
                        const updatedPost = { id: postId, ...(result as Post) } as Post;
                        setPosts(prev => prev.map(p => p.id === postId ? updatedPost : p));
                        alert('Post updated successfully');
                    } catch (error: any) {
                        console.error("Error updating post:", error);
                        alert(`Failed to update post: ${error.message || 'Unknown error'}`);
                    }
                }}
                onUpdateCommunity={async (courseId, data) => {
                    try {
                        const result = await coursesAPI.update(courseId, data);
                        const updatedCourse = { id: courseId, ...(result as Course) } as Course;
                        setCourses(prev => prev.map(c => c.id === courseId ? updatedCourse : c));
                        alert('Community updated successfully');
                    } catch (error: any) {
                        console.error("Error updating community:", error);
                        alert(`Failed to update community: ${error.message || 'Unknown error'}`);
                    }
                }}
            /> : <div>Access Denied</div>;
        default:
            return <HomePage posts={visiblePosts} currentUser={currentUser} allUsers={allUsers} onLikePost={handleLikePost} onLikeComment={handleLikeComment} onCreatePost={handleCreatePost} onCommentPost={handleCommentPost} onViewProfile={handleViewProfile} onRatePost={handleRatePost} onEditPost={handleOpenEditModal} onDeleteRequest={handleOpenDeleteConfirm} onReportRequest={handleOpenReportConfirm} onBlockUser={handleBlockUser} onRepost={handleRepost} searchQuery={searchQuery} />;
    }
  }

  const renderContent = () => {
    if (currentPage === 'about') return <AboutPage setCurrentPage={navigate} />;
    if (currentPage === 'privacy') return <PrivacyPage setCurrentPage={navigate} />;
    if (currentPage === 'terms') return <TermsPage setCurrentPage={navigate} />;
    if (currentPage === 'support') return <SupportPage setCurrentPage={navigate} />;
    
    if (!currentUser) {
        return <LandingPage onLogin={handleLogin} onSignup={handleSignup} setCurrentPage={navigate} />;
    }

    return (
        <Layout
            currentPage={currentPage}
            setCurrentPage={navigate}
            currentUser={currentUser}
            notifications={hydratedNotifications}
            onMarkNotificationAsRead={async (id) => {
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
                try { await notificationsAPI.markAsRead(id); } catch(e) {}
            }}
            onClearAllNotifications={async () => {
                setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                try { await notificationsAPI.markAllAsRead(currentUser.id); } catch(e) {}
            }}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
        >
          {renderAppPage()}
        </Layout>
    );
  };
    return (
    <Suspense fallback={<PageLoader />}>
    <div className="bg-[var(--background)] min-h-screen">
      {renderContent()}
      {currentUser && chattingWith && activeChatId && (
        <ChatPage 
          currentUser={currentUser}
          chatUser={chattingWith}
          chatId={activeChatId}
          onClose={() => {
              setChattingWith(null);
              setActiveChatId(null);
          }}
        />
      )}
      {editingPost && (
        <EditPostModal
            post={editingPost}
            onSave={handleUpdatePost}
            onClose={() => setEditingPost(null)}
        />
      )}
      {editingCommunity && (
        <EditCommunityModal
          community={editingCommunity}
          onSave={handleUpdateCommunity}
          onClose={() => setEditingCommunity(null)}
        />
      )}
      <AnimatePresence>
        {postToDelete && (
             <motion.div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleCloseDeleteConfirm}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <GlassCard className="w-full max-w-sm">
                        <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">Confirm Deletion</h2>
                        <p className="text-[var(--text-secondary)] mb-6">Are you sure you want to delete this post? This action cannot be undone.</p>
                        <div className="flex justify-end gap-4">
                            <button onClick={handleCloseDeleteConfirm} className="px-4 py-2 bg-transparent text-[var(--text-secondary)] font-semibold rounded-full hover:bg-[var(--hover-bg)]">
                                Cancel
                            </button>
                            <button onClick={handleConfirmDelete} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-full hover:bg-red-700">
                                Delete
                            </button>
                        </div>
                    </GlassCard>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {postToReport && (
             <motion.div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleCloseReportConfirm}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <GlassCard className="w-full max-w-sm">
                        <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">Report Post</h2>
                        <p className="text-[var(--text-secondary)] mb-6">Are you sure you want to report this post for review by our moderation team?</p>
                        <div className="flex justify-end gap-4">
                            <button onClick={handleCloseReportConfirm} className="px-4 py-2 bg-transparent text-[var(--text-secondary)] font-semibold rounded-full hover:bg-[var(--hover-bg)]">
                                Cancel
                            </button>
                            <button onClick={handleConfirmReport} className="px-4 py-2 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600">
                                Report
                            </button>
                        </div>
                    </GlassCard>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
       <AnimatePresence>
        {communityToDelete && (
             <motion.div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setCommunityToDelete(null)}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <GlassCard className="w-full max-w-sm">
                        <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">Delete Community</h2>
                        <p className="text-[var(--text-secondary)] mb-6">Are you sure you want to delete the <span className='font-bold'>{communityToDelete.title}</span> community? All associated posts will also be removed. This action is irreversible.</p>
                        <div className="flex justify-end gap-4">
                            <button onClick={() => setCommunityToDelete(null)} className="px-4 py-2 bg-transparent text-[var(--text-secondary)] font-semibold rounded-full hover:bg-[var(--hover-bg)]">
                                Cancel
                            </button>
                            <button onClick={handleConfirmDeleteCommunity} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-full hover:bg-red-700">
                                Delete
                            </button>
                        </div>
                    </GlassCard>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
    </Suspense>
  );
};

export default App;