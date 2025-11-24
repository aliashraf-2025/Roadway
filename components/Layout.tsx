import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Page, Notification, User } from '../types';
import { HomeIcon, DiscoverIcon, ChatIcon, ProfileIcon, Logo, BellIcon, LikeIcon, CommentIcon, UsersIcon, SearchIcon, AdminIcon, RepostIcon } from './icons';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  currentUser: User;
  notifications: Notification[];
  onMarkNotificationAsRead: (id: string) => void;
  onClearAllNotifications: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const navItems: { page: Page; icon: React.FC<any>; adminOnly?: boolean }[] = [
  { page: 'home', icon: HomeIcon },
  { page: 'discover', icon: DiscoverIcon },
  { page: 'roadmap', icon: ChatIcon }, 
  { page: 'admin', icon: AdminIcon, adminOnly: true },
];

// ✅ التعديل هنا: ضفنا أيقونة الشات لنوع 'message' واستخدمنا RepostIcon
const notificationIcons = {
    like: LikeIcon,
    comment: CommentIcon,
    follow: UsersIcon,
    repost: RepostIcon, 
    message: ChatIcon, // ✅ نوع جديد للرسائل
};

const NotificationBell: React.FC<{
    notifications: Notification[];
    onMarkAsRead: (id: string) => void;
    onClearAll: () => void;
    direction?: 'up' | 'down';
}> = ({ notifications, onMarkAsRead, onClearAll, direction = 'up' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const unreadCount = notifications.filter(n => !n.read).length;
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref]);

    // ✅ التعديل هنا: ضفنا حالة الرسالة
    const getNotificationMessage = (n: Notification) => {
        switch (n.type) {
            case 'like':
                return <><span className="font-bold">{n.user.name}</span> liked your post: "{n.post?.courseName || n.post?.review || 'Post'}"</>;
            case 'comment':
                return <><span className="font-bold">{n.user.name}</span> commented on your post: "{n.post?.courseName || n.post?.review || 'Post'}"</>;
            case 'follow':
                return <><span className="font-bold">{n.user.name}</span> started following you.</>;
            case 'repost':
                return <><span className="font-bold">{n.user.name}</span> reposted your post.</>;
            case 'message': // ✅ حالة الرسالة الجديدة
                return <><span className="font-bold">{n.user.name}</span> sent you a message: "{n.messagePreview || 'New message'}"</>;
            default:
                return 'New notification';
        }
    };

    return (
        <div ref={ref} className="relative">
            <button 
                onClick={() => {
                    setIsOpen(!isOpen);
                }} 
                className="relative p-3 rounded-xl hover:bg-[var(--hover-bg)] transition-colors"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            >
                <BellIcon className="w-7 h-7 text-[var(--text-secondary)]" />
                {unreadCount > 0 && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-[var(--sidebar-bg)] min-w-[20px]">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </div>
                )}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`absolute w-80 bg-[var(--notification-bg)] backdrop-blur-xl border border-[var(--card-border)] rounded-lg shadow-2xl z-50 ${
                            direction === 'up' 
                                ? 'bottom-full mb-2 -right-4 sm:left-1/2 sm:-translate-x-1/2' 
                                : 'top-full mt-2 right-0'
                        }`}
                    >
                        <div className="p-3 flex justify-between items-center border-b border-[var(--card-border)]">
                            <h3 className="font-semibold text-[var(--text-primary)]">Notifications</h3>
                            {notifications.length > 0 && <button onClick={onClearAll} className="text-sm text-[var(--primary-accent)] hover:underline">Clear all</button>}
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {notifications.length > 0 ? (
                                notifications.map(n => {
                                    const Icon = notificationIcons[n.type] || BellIcon;
                                    return (
                                        <div 
                                            key={n.id} 
                                            onClick={() => {
                                                if (!n.read) {
                                                    onMarkAsRead(n.id);
                                                }
                                            }} 
                                            className={`flex items-start gap-3 p-3 border-b border-[var(--card-border)] hover:bg-[var(--hover-bg)] cursor-pointer transition-colors ${!n.read ? 'bg-[var(--hover-bg)]/50' : 'opacity-60'}`}
                                        >
                                            <div className="relative flex-shrink-0">
                                                <img 
                                                    src={n.user?.avatarUrl || `https://avatar.vercel.sh/${n.user?.name || 'user'}.svg`} 
                                                    alt={n.user?.name || 'User'} 
                                                    className="w-10 h-10 rounded-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = `https://avatar.vercel.sh/${n.user?.name || 'user'}.svg`;
                                                    }}
                                                />
                                                {Icon && (
                                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[var(--primary-accent)] text-black rounded-full flex items-center justify-center border-2 border-[var(--card-bg)]">
                                                        <Icon className="w-3 h-3"/>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-[var(--text-secondary)] break-words">
                                                    {getNotificationMessage(n)}
                                                </p>
                                                <p className="text-xs text-[var(--text-secondary)]/70 mt-1">
                                                    {n.timestamp ? (() => {
                                                        try {
                                                            const date = new Date(n.timestamp);
                                                            if (isNaN(date.getTime())) return 'Recently';
                                                            const now = new Date();
                                                            const diffMs = now.getTime() - date.getTime();
                                                            const diffMins = Math.floor(diffMs / 60000);
                                                            const diffHours = Math.floor(diffMs / 3600000);
                                                            const diffDays = Math.floor(diffMs / 86400000);
                                                            
                                                            if (diffMins < 1) return 'Just now';
                                                            if (diffMins < 60) return `${diffMins}m ago`;
                                                            if (diffHours < 24) return `${diffHours}h ago`;
                                                            if (diffDays < 7) return `${diffDays}d ago`;
                                                            return date.toLocaleDateString();
                                                        } catch {
                                                            return 'Recently';
                                                        }
                                                    })() : 'Recently'}
                                                </p>
                                            </div>
                                            {!n.read && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full self-center flex-shrink-0"></div>}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center text-[var(--text-secondary)] text-sm p-6">
                                    <p>No new notifications.</p>
                                    <p className="text-xs mt-2 opacity-70">You'll see notifications here when someone likes, comments, follows, or messages you.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};


const MobileNavBar: React.FC<{ currentPage: Page; setCurrentPage: (page: Page) => void; currentUser: User; }> = ({ currentPage, setCurrentPage, currentUser }) => {
    const mobileNavItems: { page: Page; icon: React.FC<any>; }[] = [...navItems.filter(item => !item.adminOnly || currentUser.isAdmin), { page: 'profile', icon: ProfileIcon }];
    return (
        <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 lg:hidden w-[calc(100%-2rem)] max-w-sm bg-[var(--sidebar-bg)] backdrop-blur-xl border border-[var(--card-border)] rounded-full p-2 z-50">
            <div className="flex justify-around">
                {mobileNavItems.map(({ page, icon: Icon }) => (
                    <button key={page} onClick={() => setCurrentPage(page)} className="relative flex-1 p-2 text-center">
                        <Icon className={`w-6 h-6 mx-auto transition-colors ${currentPage === page ? 'text-[var(--primary-accent)]' : 'text-[var(--text-secondary)]'}`} />
                        {currentPage === page && (
                            <div
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary-accent)]"
                            />
                        )}
                    </button>
                ))}
            </div>
        </nav>
    );
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, setCurrentPage, currentUser, notifications, onMarkNotificationAsRead, onClearAllNotifications, searchQuery, setSearchQuery }) => {
  const showSearch = currentPage === 'home' || currentPage === 'discover';
    
  return (
    <div className="w-full text-[var(--text-primary)]">
      <nav className="hidden lg:flex flex-col items-center gap-2 p-4 bg-[var(--sidebar-bg)] backdrop-blur-xl border-r border-[var(--card-border)] fixed top-0 left-0 h-full w-24 z-20">
        <div className="flex flex-col items-center gap-4 mt-8">
            {navItems.map(({ page, icon: Icon, adminOnly }) => {
                if (adminOnly && !currentUser.isAdmin) return null;
                return (
                    <button key={page} onClick={() => setCurrentPage(page)} className="relative p-3 rounded-xl hover:bg-[var(--hover-bg)] transition-colors">
                        <Icon className={`w-7 h-7 transition-colors ${currentPage === page ? 'text-[var(--primary-accent)]' : 'text-[var(--text-secondary)]'}`} />
                        {currentPage === page && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[var(--primary-accent)] rounded-r-full" />
                        )}
                    </button>
                );
            })}
        </div>
        <div className="mt-auto flex flex-col items-center gap-4">
            <NotificationBell notifications={notifications} onMarkAsRead={onMarkNotificationAsRead} onClearAll={onClearAllNotifications} />
            <button onClick={() => setCurrentPage('profile')} className="relative p-3 rounded-xl hover:bg-[var(--hover-bg)] transition-colors">
                <ProfileIcon className={`w-7 h-7 transition-colors ${currentPage === 'profile' ? 'text-[var(--primary-accent)]' : 'text-[var(--text-secondary)]'}`} />
                 {currentPage === 'profile' && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[var(--primary-accent)] rounded-r-full" />
                )}
            </button>
        </div>
      </nav>
      <div className="flex flex-1 flex-col overflow-hidden lg:pl-24">
        <header className="flex-shrink-0 sticky top-0 z-10 bg-[var(--background)]/80 backdrop-blur-lg border-b border-[var(--card-border)]">
            <div className={`flex items-center justify-between gap-4 max-w-6xl mx-auto p-4`}>
                <div className="flex-1 flex justify-start">
                    <Logo />
                </div>
                
                {showSearch && (
                    <div className={`relative w-full max-w-md`}>
                        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)] pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-full pl-10 pr-4 py-2 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-accent)]"
                        />
                    </div>
                )}
                
                {currentPage !== 'home' && currentPage !== 'discover' &&
                    <h1 className={`text-2xl font-bold capitalize ${currentPage === 'profile' ? 'invisible' : ''}`}>
                        {currentPage}
                    </h1>
                }

                 <div className="flex-1 flex justify-end">
                    <div className="lg:hidden">
                        <NotificationBell notifications={notifications} onMarkAsRead={onMarkNotificationAsRead} onClearAll={onClearAllNotifications} direction="down" />
                    </div>
                 </div>
            </div>
        </header>
        <main className="flex-1 overflow-y-auto">
            {children}
        </main>
      </div>
      <MobileNavBar currentPage={currentPage} setCurrentPage={setCurrentPage} currentUser={currentUser} />
    </div>
  );
};

export default Layout;