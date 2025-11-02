import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Page, User, Post, Course, Comment, Theme, Notification, Roadmaps, Roadmap, ChatMessage } from './types';

import { auth } from './firebase';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signInWithCustomToken,
    signOut, 
    onAuthStateChanged 
} from 'firebase/auth';
import { usersAPI, postsAPI, coursesAPI, roadmapsAPI, authAPI } from './api';

import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import DiscoverPage from './pages/DiscoverPage';
import RoadmapPage from './pages/RoadmapPage';
import ProfilePage from './pages/ProfilePage';
import AboutPage from './pages/AboutPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import SupportPage from './pages/SupportPage';
import ChatPage from './pages/ChatPage';
import EditPostModal from './components/EditPostModal';
import GlassCard from './components/GlassCard';
import CommunityPage from './pages/CommunityPage';
import EditCommunityModal from './components/EditCommunityModal';
import AdminPage from './pages/AdminPage';


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
  
  // --- AUTH & DATA FETCHING ---
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userData = await usersAPI.getById(user.uid);
                setCurrentUser({ id: user.uid, ...userData } as User);
            } catch (error) {
                // User doesn't exist in Firestore, log them out
                console.error("User not found in database:", error);
                await signOut(auth);
                setCurrentUser(null);
            }
        } else {
            setCurrentUser(null);
            setCurrentPage('landing');
        }
        // A small delay to prevent UI flashing on fast reloads
        setTimeout(() => setIsLoading(false), 300);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
        if (!currentUser) return;
        
        setIsLoading(true);
        try {
            // Fetch all data - handle errors individually to prevent one failure from blocking others
            const results = await Promise.allSettled([
                usersAPI.getAll(),
                postsAPI.getAll(),
                coursesAPI.getAll(),
                roadmapsAPI.getUserRoadmaps(currentUser.id)
            ]);

            // Process users
            if (results[0].status === 'fulfilled') {
                setAllUsers(results[0].value as User[]);
            } else {
                console.error("Error fetching users:", results[0].reason);
            }
            
            // Process posts - create map for repost references
            if (results[1].status === 'fulfilled') {
                const postsList = results[1].value as any[];
                const postsMap = new Map();
                postsList.forEach(post => {
                    postsMap.set(post.id, post);
                });

                // Hydrate repostOf references
                const hydratedPosts = postsList.map((p: any) => {
                    if (p.repostOf && typeof p.repostOf === 'string') {
                        return { ...p, repostOf: postsMap.get(p.repostOf) };
                    }
                    return p;
                });
                setPosts(hydratedPosts as Post[]);
            } else {
                console.error("Error fetching posts:", results[1].reason);
                setPosts([]);
            }
            
            // Process courses
            if (results[2].status === 'fulfilled') {
                setCourses(results[2].value as Course[]);
            } else {
                console.error("Error fetching courses:", results[2].reason);
            }
            
            // Process roadmaps
            if (results[3].status === 'fulfilled') {
                setSavedRoadmaps(results[3].value as Roadmaps);
            } else {
                console.error("Error fetching roadmaps:", results[3].reason);
                setSavedRoadmaps({});
            }

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (currentUser) {
        fetchData();
    }
  }, [currentUser]);


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


  const handleToggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      // Call backend API to get custom token
      const response = await authAPI.login(email, password) as any;
      
      if (response.success && response.customToken) {
        // Sign in with the custom token from backend
        await signInWithCustomToken(auth, response.customToken);
        setCurrentPage('home');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error("Login Error:", error);
      const errorMessage = error.message || "Failed to log in. Please check your credentials.";
      alert(errorMessage);
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
    // State will be cleared by onAuthStateChanged listener
  };

  const handleLikePost = async (postId: string) => {
    if (!currentUser) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    const isLiked = (post.likedBy || []).includes(currentUser.id);
    const newLikes = isLiked ? post.likes - 1 : post.likes + 1;

    // Optimistic update
    setPosts(posts.map(p => p.id === postId ? { ...p, likedBy: isLiked ? p.likedBy.filter(id => id !== currentUser.id) : [...(p.likedBy || []), currentUser.id], likes: newLikes } : p));

    // API call
    try {
        const updatedPost = await postsAPI.like(postId, currentUser.id);
        setPosts(posts.map(p => p.id === postId ? { ...p, ...updatedPost } : p));
    } catch (error) {
        console.error("Error liking post:", error);
        // Revert optimistic update on error
        setPosts(posts);
    }
  };
  
  const handleLikeComment = async (postId: string, commentId: string) => {
    if (!currentUser) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    // Optimistic update
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
    
    // API call
    try {
        const updatedPost = await postsAPI.likeComment(postId, commentId, currentUser.id);
        setPosts(posts.map(p => p.id === postId ? { ...p, ...updatedPost } : p));
    } catch (error) {
        console.error("Error liking comment:", error);
        setPosts(posts);
    }
  };

  const handleRatePost = async (postId: string, rating: number) => {
    // Optimistic update
    setPosts(posts.map(post => post.id === postId ? { ...post, rating } : post));
    
    // API call
    try {
        const updatedPost = await postsAPI.rate(postId, rating);
        setPosts(posts.map(p => p.id === postId ? { ...p, ...updatedPost } : p));
    } catch (error) {
        console.error("Error rating post:", error);
        setPosts(posts);
    }
  };

  const handleCreatePost = async (postData: Omit<Post, 'id' | 'author' | 'likes' | 'comments' | 'timestamp' | 'likedBy' | 'repostOf'>) => {
    if (!currentUser) return;
    const newPostData = {
        ...postData,
        author: currentUser.id,
        likes: 0,
        comments: [],
        likedBy: [],
        field: postData.field || currentUser.specialization,
    };
    
    try {
        const createdPost = await postsAPI.create(newPostData);
        const newPost = { ...createdPost, author: currentUser, timestamp: createdPost.timestamp || new Date().toISOString() };
        setPosts([newPost as Post, ...posts]);
    } catch (error) {
        console.error("Error creating post:", error);
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
      
      // Optimistic update
      setPosts(posts.map(post => post.id === postId ? { ...post, comments: [...post.comments, newCommentHydrated] } : post));

      // API call
      try {
          const updatedPost = await postsAPI.addComment(postId, currentUser.id, commentText);
          setPosts(posts.map(p => p.id === postId ? { ...p, ...updatedPost } : p));
      } catch (error) {
          console.error("Error adding comment:", error);
          setPosts(posts);
      }
  };

  const handleFollowToggle = async (targetUserId: string) => {
      if (!currentUser || currentUser.id === targetUserId) return;
      const targetUser = allUsers.find(u=>u.id === targetUserId);
      if (!targetUser) return;
      
      const isFollowing = currentUser.followingIds.includes(targetUserId);

      // Optimistic update
      const updatedCurrentUser = {
          ...currentUser,
          following: isFollowing ? currentUser.following - 1 : currentUser.following + 1,
          followingIds: isFollowing ? currentUser.followingIds.filter(id => id !== targetUserId) : [...currentUser.followingIds, targetUserId]
      };
      const updatedTargetUser = {
          ...targetUser,
          followers: isFollowing ? targetUser.followers - 1 : targetUser.followers + 1
      };
      setCurrentUser(updatedCurrentUser);
      setAllUsers(allUsers.map(u => u.id === currentUser.id ? updatedCurrentUser : (u.id === targetUserId ? updatedTargetUser : u) ));

      // API call
      try {
          const result = await usersAPI.follow(currentUser.id, targetUserId);
          setCurrentUser(result.currentUser as User);
          setAllUsers(allUsers.map(u => u.id === currentUser.id ? result.currentUser as User : (u.id === targetUserId ? result.targetUser as User : u)));
      } catch (error) {
          console.error("Error following user:", error);
          setCurrentUser(currentUser);
          setAllUsers(allUsers);
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
  
  const handleUpdatePost = async (updatedData: { courseName: string; review: string; rating: number; }) => {
    if (!editingPost) return;
    // Optimistic update
    setPosts(posts.map(p => p.id === editingPost.id ? { ...p, ...updatedData } : p));
    setEditingPost(null);
    
    // API call
    try {
        const updatedPost = await postsAPI.update(editingPost.id, updatedData);
        setPosts(posts.map(p => p.id === editingPost.id ? { ...p, ...updatedPost } : p));
    } catch (error) {
        console.error("Error updating post:", error);
        setPosts(posts);
    }
  };

  const handleUpdateProfile = async (updatedData: Partial<User>) => {
    if (!currentUser) return;
    // Optimistic update
    const updatedUser = { ...currentUser, ...updatedData };
    setCurrentUser(updatedUser);
    setAllUsers(allUsers.map(u => u.id === currentUser.id ? updatedUser : u));
    
    // API call
    try {
        const result = await usersAPI.update(currentUser.id, updatedData);
        const finalUser = { id: currentUser.id, ...result } as User;
        setCurrentUser(finalUser);
        setAllUsers(allUsers.map(u => u.id === currentUser.id ? finalUser : u));
    } catch (error) {
        console.error("Error updating profile:", error);
        setCurrentUser(currentUser);
        setAllUsers(allUsers);
    }
  };

  const handleOpenDeleteConfirm = (post: Post) => setPostToDelete(post);
  const handleCloseDeleteConfirm = () => setPostToDelete(null);

  const handleConfirmDelete = async () => {
    if (postToDelete) {
      const postId = postToDelete.id;
      // Optimistic update
      setPosts(prev => prev.filter(p => p.id !== postId));
      setPostToDelete(null);
      
      // API call
      try {
          await postsAPI.delete(postId);
      } catch (error) {
          console.error("Error deleting post:", error);
          // Re-add post on error (simplified - in production, refetch)
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
    // Optimistic update
    const updatedUser = { ...currentUser, blockedUserIds: [...currentUser.blockedUserIds, userIdToBlock] };
    setCurrentUser(updatedUser);
    setAllUsers(allUsers.map(u => u.id === currentUser.id ? updatedUser : u));
    
    // API call
    try {
        const result = await usersAPI.block(currentUser.id, userIdToBlock);
        const finalUser = { id: currentUser.id, ...result } as User;
        setCurrentUser(finalUser);
        setAllUsers(allUsers.map(u => u.id === currentUser.id ? finalUser : u));
    } catch (error) {
        console.error("Error blocking user:", error);
        setCurrentUser(currentUser);
        setAllUsers(allUsers);
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

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-screen bg-[#0D0D0D] text-white">
            <div className="text-lg font-semibold animate-pulse">Loading A2Z...</div>
        </div>
    );
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
    
    // Optimistic update
    const updatedUser = {...currentUser, joinedCommunities: isJoined ? currentUser.joinedCommunities.filter(c => c !== field) : [...currentUser.joinedCommunities, field] };
    setCurrentUser(updatedUser);
    setAllUsers(allUsers.map(u => u.id === currentUser.id ? updatedUser : u));
    
    // API call
    try {
        const result = await usersAPI.joinCommunity(currentUser.id, field, action);
        const finalUser = { id: currentUser.id, ...result } as User;
        setCurrentUser(finalUser);
        setAllUsers(allUsers.map(u => u.id === currentUser.id ? finalUser : u));
    } catch (error) {
        console.error("Error joining/leaving community:", error);
        setCurrentUser(currentUser);
        setAllUsers(allUsers);
    }
  };
  
  const handleCreateCommunity = async (communityData: Omit<Course, 'id' | 'rating' | 'platform' | 'ownerId'>) => {
    if (!currentUser) return;
    const newCommunityData = {
      ...communityData,
      rating: 0,
      platform: 'Community',
      ownerId: currentUser.id,
    };
    
    try {
        const createdCourse = await coursesAPI.create(newCommunityData);
        setCourses(prev => [createdCourse as Course, ...prev]);
        await handleJoinCommunityToggle(communityData.field);
    } catch (error) {
        console.error("Error creating community:", error);
        alert("Failed to create community. Please try again.");
    }
  };
  
  const handleUpdateCommunity = async (updatedData: Partial<Course>) => {
    if (!editingCommunity) return;
    // Optimistic update
    const updatedCourses = courses.map(c => c.id === editingCommunity.id ? { ...c, ...updatedData } : c);
    setCourses(updatedCourses);
    setViewedCommunity(prev => prev ? { ...prev, ...updatedData } : null);
    setEditingCommunity(null);
    
    // API call
    try {
        const result = await coursesAPI.update(editingCommunity.id, updatedData);
        setCourses(courses.map(c => c.id === editingCommunity.id ? result as Course : c));
        setViewedCommunity(prev => prev && prev.id === editingCommunity.id ? result as Course : prev);
    } catch (error) {
        console.error("Error updating community:", error);
        setCourses(courses);
    }
  };

  const handleConfirmDeleteCommunity = async () => {
    if (!communityToDelete) return;
    const communityId = communityToDelete.id;
    // Optimistic update
    setCourses(prev => prev.filter(c => c.id !== communityId));
    setCurrentPage('discover');
    setCommunityToDelete(null);
    
    // API call
    try {
        await coursesAPI.delete(communityId);
    } catch (error) {
        console.error("Error deleting community:", error);
        setCourses([...courses, communityToDelete]);
    }
  };
  
  const handleRepost = async (postId: string) => {
     if(!currentUser) return;
     const originalPost = posts.find(p => p.id === postId);
     if (!originalPost || originalPost.repostOf || (originalPost.author as User).id === currentUser.id) return;
     const newRepostData = {
        author: currentUser.id,
        courseName: '', review: '', rating: 0, likes: 0, comments: [],
        likedBy: [],
        field: originalPost.field,
        isCommunityPost: originalPost.isCommunityPost,
        repostOf: originalPost.id, // Storing ID reference
    };
    
    try {
        const createdPost = await postsAPI.create(newRepostData);
        const newPost = { ...createdPost, author: currentUser, repostOf: originalPost, timestamp: createdPost.timestamp || new Date().toISOString() };
        setPosts([newPost as Post, ...posts]);
    } catch (error) {
        console.error("Error reposting:", error);
        alert("Failed to repost. Please try again.");
    }
  };
  
  const handleSaveRoadmap = async (roadmapKey: string, roadmapData: Roadmap) => {
    if (!currentUser) return;
    const newKey = roadmapKey.toLowerCase().replace(/\s+/g, '-');
    // Optimistic update
    setSavedRoadmaps(prev => ({ ...prev, [newKey]: roadmapData }));
    
    // API call
    try {
        await roadmapsAPI.saveRoadmap(currentUser.id, newKey, roadmapData);
    } catch (error) {
        console.error("Error saving roadmap:", error);
        // Remove from state on error
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
                onDeleteUser={async (userId) => { await usersAPI.delete(userId); }}
                onDeletePost={async (postId) => { await postsAPI.delete(postId); }}
                onDeleteCommunity={async (courseId) => { await coursesAPI.delete(courseId); }}
                onUpdateUser={async (userId, data) => { await usersAPI.update(userId, data); }}
                onUpdatePost={async (postId, data) => { await postsAPI.update(postId, data); }}
                onUpdateCommunity={async (courseId, data) => { await coursesAPI.update(courseId, data); }}
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
            notifications={notifications}
            onMarkNotificationAsRead={(id) => {}}
            onClearAllNotifications={() => {}}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
        >
          {renderAppPage()}
        </Layout>
    );
  };
    return (
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
  );
};

export default App;