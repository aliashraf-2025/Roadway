
export interface User {
  id: string;
  name: string; // Full Name
  username: string;
  email: string;
  avatarUrl: string;
  specialization: string; // Major
  studyYear: number;
  followers: number;
  following: number;
  university?: string;
  isActive: boolean;
  followingIds: string[];
  blockedUserIds: string[];
  joinedCommunities: string[];
  isAdmin?: boolean;
}

export interface Comment {
  id: string;
  author: User | string; // Can be hydrated User object or just an ID string
  text: string;
  timestamp: string;
  likes: number;
  likedBy: string[];
}

export interface Post {
  id: string;
  author: User | string; // Can be hydrated User object or just an ID string
  courseName: string;
  review: string;
  rating: number;
  likes: number;
  comments: Comment[];
  timestamp:string;
  likedBy: string[];
  imageUrls?: string[];
  linkUrl?: string;
  field: string;
  isCommunityPost: boolean;
  repostOf?: Post;
}

export interface Course {
  id: string;
  title: string;
  field: string;
  rating: number;
  platform: string;
  imageUrl: string;
  description: string;
  ownerId?: string;
}

export interface RoadmapResource {
  name: string;
  type: 'Book' | 'YouTube' | 'Course' | 'Post';
  postId?: string;
}

export interface RoadmapStep {
  id: string;
  stage: string;
  title: string;
  description: string;
  resources: RoadmapResource[];
}

export interface Roadmap {
  title: string;
  description: string;
  steps: RoadmapStep[];
}

export type Roadmaps = { [key: string]: Roadmap };

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface QuizAttempt extends QuizQuestion {
  userAnswerIndex?: number;
  isCorrect?: boolean;
}

export interface ChatMessage {
    id: string;
    senderId: string;
    text: string;
    timestamp: string;
    status: 'sent' | 'delivered' | 'read';
}


export type Theme = 'light' | 'dark';

export type Page = 'landing' | 'home' | 'discover' | 'roadmap' | 'profile' | 'about' | 'privacy' | 'terms' | 'support' | 'community' | 'admin';

export type NotificationType = 'comment' | 'follow' | 'like';

export interface Notification {
  id: string;
  type: NotificationType;
  user: User;
  post?: Post;
  timestamp: string;
  read: boolean;
}