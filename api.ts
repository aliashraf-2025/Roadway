// API Service - Centralized backend API calls
// Base URL for the backend API
// Default to Render deployment URL, can be overridden with VITE_API_URL environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://roadway-l7up.onrender.com';

// Log API base URL for debugging
if (typeof window !== 'undefined') {
  console.log('🔗 API Base URL:', API_BASE_URL);
}

interface RequestOptions extends RequestInit {
  body?: any;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, ...fetchOptions } = options;
  
  const config: RequestInit = {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      const errorMessage = error.error || `HTTP ${response.status}: ${response.statusText}`;
      console.error(`API Error [${response.status}]: ${url} - ${errorMessage}`);
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error: any) {
    // Network errors or fetch failures
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error(`Network Error: Cannot connect to ${url}. Is the backend server running?`);
      throw new Error(`Cannot connect to backend server at ${API_BASE_URL}. Make sure it's running.`);
    }
    throw error;
  }
}

// ============= AUTH API =============
export const authAPI = {
  signup: async (data: { email: string; password: string; displayName?: string; studyYear?: string }) => {
    return apiRequest('/api/auth/signup', {
      method: 'POST',
      body: data,
    });
  },

  login: async (email: string, password: string) => {
    return apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  },

  getUser: async (uid: string) => {
    return apiRequest(`/api/auth/user/${uid}`, {
      method: 'GET',
    });
  },
};

// ============= USERS API =============
export const usersAPI = {
  getAll: async () => {
    return apiRequest('/api/users', {
      method: 'GET',
    });
  },

  getById: async (id: string) => {
    return apiRequest(`/api/users/${id}`, {
      method: 'GET',
    });
  },

  create: async (data: any) => {
    return apiRequest('/api/users', {
      method: 'POST',
      body: data,
    });
  },

  update: async (id: string, data: any) => {
    return apiRequest(`/api/users/${id}`, {
      method: 'PUT',
      body: data,
    });
  },

  delete: async (id: string, adminUserId: string) => {
    return apiRequest(`/api/users/${id}`, {
      method: 'DELETE',
      body: { adminUserId },
    });
  },

  follow: async (userId: string, targetUserId: string) => {
    return apiRequest(`/api/users/${targetUserId}/follow`, {
      method: 'POST',
      body: { userId },
    });
  },

  block: async (userId: string, targetUserId: string) => {
    return apiRequest(`/api/users/${targetUserId}/block`, {
      method: 'POST',
      body: { userId },
    });
  },

  joinCommunity: async (userId: string, field: string, action: 'join' | 'leave') => {
    return apiRequest(`/api/users/${userId}/communities`, {
      method: 'POST',
      body: { field, action },
    });
  },
};

// ============= POSTS API =============

export const postsAPI = {
  getAll: async (userId?: string, includePending?: boolean) => {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (includePending) params.append('includePending', 'true');
    const queryString = params.toString();
    return apiRequest(`/api/posts${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },

  getById: async (id: string) => {
    return apiRequest(`/api/posts/${id}`, {
      method: 'GET',
    });
  },

  create: async (data: any) => {
    return apiRequest('/api/posts', {
      method: 'POST',
      body: data,
    });
  },

  update: async (id: string, data: any) => {
    return apiRequest(`/api/posts/${id}`, {
      method: 'PUT',
      body: data,
    });
  },

  delete: async (id: string, userId: string) => {
    return apiRequest(`/api/posts/${id}`, {
      method: 'DELETE',
      body: { userId },
    });
  },

  like: async (postId: string, userId: string) => {
    return apiRequest(`/api/posts/${postId}/like`, {
      method: 'POST',
      body: { userId },
    });
  },

  addComment: async (postId: string, authorId: string, text: string) => {
    return apiRequest(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: { authorId, text },
    });
  },

  likeComment: async (postId: string, commentId: string, userId: string) => {
    return apiRequest(`/api/posts/${postId}/comments/${commentId}/like`, {
      method: 'POST',
      body: { userId },
    });
  },

  rate: async (postId: string, rating: number) => {
    return apiRequest(`/api/posts/${postId}/rate`, {
      method: 'POST',
      body: { rating },
    });
  },

  // Admin moderation endpoints
  approve: async (postId: string, userId: string) => {
    return apiRequest(`/api/posts/${postId}/approve`, {
      method: 'POST',
      body: { userId },
    });
  },

  reject: async (postId: string, userId: string, reason?: string) => {
    return apiRequest(`/api/posts/${postId}/reject`, {
      method: 'POST',
      body: { userId, reason },
    });
  },

  getPendingPosts: async (userId: string) => {
    return apiRequest(`/api/admin/pending-posts?userId=${userId}`, {
      method: 'GET',
    });
  },

  checkLink: async (userId: string, url: string) => {
    return apiRequest(`/api/admin/check-link`, {
      method: 'POST',
      body: { userId, url },
    });
  },
};

// ============= COURSES API =============
export const coursesAPI = {
  getAll: async () => {
    return apiRequest('/api/courses', {
      method: 'GET',
    });
  },

  // ... داخل coursesAPI ...
rate: async (courseId: string, rating: number) => {
  return apiRequest(`/api/courses/${courseId}/rate`, {
    method: 'POST',
    body: { rating },
  });
},
// ...

  getById: async (id: string) => {
    return apiRequest(`/api/courses/${id}`, {
      method: 'GET',
    });
  },

  create: async (data: any) => {
    return apiRequest('/api/courses', {
      method: 'POST',
      body: data,
    });
  },

  update: async (id: string, data: any) => {
    return apiRequest(`/api/courses/${id}`, {
      method: 'PUT',
      body: data,
    });
  },

  delete: async (id: string, adminUserId: string) => {
    return apiRequest(`/api/courses/${id}`, {
      method: 'DELETE',
      body: { adminUserId },
    });
  },
};

// ============= CHATS API =============
export const chatsAPI = {
  getMessages: async (chatId: string) => {
    return apiRequest(`/api/chats/${chatId}/messages`, {
      method: 'GET',
    });
  },

  sendMessage: async (chatId: string, senderId: string, text: string, participants: string[]) => {
    return apiRequest(`/api/chats/${chatId}/messages`, {
      method: 'POST',
      body: { senderId, text, participants },
    });
  },
};

// ============= ROADMAPS API =============
export const roadmapsAPI = {
  getUserRoadmaps: async (userId: string) => {
    return apiRequest(`/api/users/${userId}/roadmaps`, {
      method: 'GET',
    });
  },

  // ... داخل roadmapsAPI ...

  // ✅ دالة لجلب Roadmap عن طريق الرابط
  getSharedRoadmap: async (targetUserId: string, roadmapKey: string) => {
    return apiRequest(`/api/roadmaps/shared/${targetUserId}/${roadmapKey}`, {
      method: 'GET',
    });
  },

// ...

  saveRoadmap: async (userId: string, roadmapKey: string, roadmapData: any) => {
    return apiRequest(`/api/users/${userId}/roadmaps/${roadmapKey}`, {
      method: 'POST',
      body: roadmapData,
    });
  },
};

// ============= NOTIFICATIONS API =============
export const notificationsAPI = {
  getAll: async (userId: string) => {
    return apiRequest(`/api/notifications/${userId}`, {
      method: 'GET',
    });
  },

  markAsRead: async (notificationId: string) => {
    return apiRequest(`/api/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  },

  markAllAsRead: async (userId: string) => {
    return apiRequest(`/api/notifications/${userId}/read-all`, {
      method: 'PUT',
    });
  },
};

export default {
  auth: authAPI,
  users: usersAPI,
  posts: postsAPI,
  courses: coursesAPI,
  chats: chatsAPI,
  roadmaps: roadmapsAPI,
  notifications: notificationsAPI,
};

