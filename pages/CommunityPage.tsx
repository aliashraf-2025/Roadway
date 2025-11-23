import React, { useState, useMemo, useRef } from 'react';
import { Course, User, Post, Page } from '../types';
import GlassCard from '../components/GlassCard';
import PostCard from '../components/PostCard';
import { UsersIcon, MessageSquareIcon, BookIcon, StarIcon, AttachmentIcon, LinkIcon, XIcon, ArrowLeftIcon, EditIcon, TrashIcon } from '../components/icons';

// ✅ تعديل 1: إضافة onRateCommunity للخصائص (Props)
interface CommunityPageProps {
    community: Course;
    currentUser: User;
    allUsers: User[];
    allPosts: Post[];
    courses: Course[];
    onJoinToggle: (field: string) => void;
    onViewProfile: (userId: string) => void;
    onLikePost: (postId: string) => void;
    onLikeComment: (postId: string, commentId: string) => void;
    onCommentPost: (postId: string, commentText: string) => void;
    onCreatePost: (postData: Omit<Post, 'id' | 'author' | 'likes' | 'comments' | 'timestamp' | 'likedBy' | 'repostOf'>) => void;
    onRatePost: (postId: string, rating: number) => void;
    onEditPost: (post: Post) => void;
    onDeleteRequest: (post: Post) => void;
    onReportRequest: (post: Post) => void;
    onBlockUser: (userId: string) => void;
    onRepost: (postId: string) => void;
    setCurrentPage: (page: Page) => void;
    onEditCommunity: () => void;
    onDeleteCommunity: () => void;
    onRateCommunity: (communityId: string, rating: number) => void; // ✅ دي الجديدة
}

const CreateCommunityPostForm: React.FC<{
    currentUser: User;
    allUsers: User[];
    community: Course;
    onCreatePost: (postData: Omit<Post, 'id' | 'author' | 'likes' | 'comments' | 'timestamp' | 'likedBy' | 'repostOf'>) => void;
}> = ({ currentUser, allUsers, community, onCreatePost }) => {
    const [courseName, setCourseName] = useState('');
    const [review, setReview] = useState('');
    const [rating, setRating] = useState(0);
    const [mentionQuery, setMentionQuery] = useState('');
    const [showMentions, setShowMentions] = useState(false);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [linkUrl, setLinkUrl] = useState('');
    const [showLinkInput, setShowLinkInput] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const mentionSuggestions = useMemo(() => {
        if (!mentionQuery) return [];
        return allUsers.filter(u => u.username.toLowerCase().includes(mentionQuery.toLowerCase()) && u.id !== currentUser.id).slice(0, 5);
    }, [mentionQuery, allUsers, currentUser.id]);

    const handleReviewChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setReview(text);

        const mentionMatch = text.match(/@(\w+)$/);
        if (mentionMatch) {
            setMentionQuery(mentionMatch[1]);
            setShowMentions(true);
        } else {
            setShowMentions(false);
        }
    };
    
    const handleMentionSelect = (username: string) => {
        setReview(prev => prev.replace(/@(\w+)$/, `@${username} `));
        setShowMentions(false);
    };

    const handleAttachment = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const promises = files.map(file => {
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            });
            Promise.all(promises).then(results => {
                setImageUrls(prev => [...prev, ...results]);
            }).catch(error => console.error("Error reading files:", error));
        }
    };
    
    const removeImage = (indexToRemove: number) => {
        setImageUrls(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (courseName && review && rating > 0) {
            onCreatePost({ courseName, review, rating, imageUrls, linkUrl, field: community.field, isCommunityPost: true });
            setCourseName('');
            setReview('');
            setRating(0);
            setImageUrls([]);
            setLinkUrl('');
            setShowLinkInput(false);
        }
    };

    return (
        <GlassCard className="w-full mb-8">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
                multiple
            />
            <div className="flex items-start space-x-4">
                <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-12 h-12 rounded-full" />
                <form onSubmit={handleSubmit} className="flex-1 space-y-4">
                    <input
                        type="text"
                        placeholder="Post title..."
                        value={courseName}
                        onChange={(e) => setCourseName(e.target.value)}
                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-2 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-accent)]"
                    />
                    <div className="relative">
                        <textarea
                            placeholder={`Share something with the ${community.title} community...`}
                            value={review}
                            onChange={handleReviewChange}
                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-2 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-accent)] min-h-[80px]"
                        />
                        {showMentions && mentionSuggestions.length > 0 && (
                            <div className="absolute bottom-full mb-1 w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-lg z-10 overflow-hidden">
                                {mentionSuggestions.map(user => (
                                    <button
                                        key={user.id}
                                        type="button"
                                        onClick={() => handleMentionSelect(user.username)}
                                        className="w-full text-left flex items-center gap-2 p-2 hover:bg-[var(--hover-bg)]"
                                    >
                                        <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full"/>
                                        <div>
                                            <p className="font-semibold text-sm">{user.name}</p>
                                            <p className="text-xs text-[var(--text-secondary)]">@{user.username}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {showLinkInput && (
                         <input
                            type="url"
                            placeholder="https://example.com"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-2 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-accent)]"
                        />
                    )}
                    {imageUrls.length > 0 && (
                       <div className="flex gap-2 overflow-x-auto py-2">
                            {imageUrls.map((url, index) => (
                                <div key={index} className="relative group w-28 h-28 flex-shrink-0">
                                    <img src={url} alt="preview" className="w-full h-full object-cover rounded-lg" />
                                    <button onClick={() => removeImage(index)} className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                        <XIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center sm:justify-start">
                                {[...Array(5)].map((_, i) => (
                                    <StarIcon
                                        key={i}
                                        className={`w-6 h-6 cursor-pointer ${i < rating ? 'text-yellow-400' : 'text-[var(--star-inactive)]'}`}
                                        fill={i < rating ? 'currentColor' : 'none'}
                                        onClick={() => setRating(i + 1)}
                                    />
                                ))}
                            </div>
                             <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                                <button type="button" onClick={handleAttachment} className="p-2 hover:bg-[var(--hover-bg)] rounded-full"><AttachmentIcon className="w-5 h-5" /></button>
                                <button type="button" onClick={() => setShowLinkInput(!showLinkInput)} className={`p-2 hover:bg-[var(--hover-bg)] rounded-full ${showLinkInput ? 'text-[var(--primary-accent)]' : ''}`}><LinkIcon className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <button type="submit" className="w-full sm:w-auto px-4 py-2 bg-[var(--primary-accent)] text-[var(--primary-accent-text)] font-semibold rounded-full hover:bg-white">
                            Post
                        </button>
                    </div>
                </form>
            </div>
        </GlassCard>
    );
};

const MemberCard: React.FC<{ member: User; onViewProfile: (userId: string) => void }> = ({ member, onViewProfile }) => (
    <GlassCard className="flex items-center gap-4 p-4">
        <img src={member.avatarUrl} alt={member.name} className="w-12 h-12 rounded-full" />
        <div className="min-w-0">
            <button onClick={() => onViewProfile(member.id)} className="font-bold text-[var(--text-primary)] hover:underline truncate">{member.name}</button>
            <p className="text-sm text-[var(--text-secondary)] truncate">{member.specialization} - Year {member.studyYear}</p>
        </div>
    </GlassCard>
);

const ResourceCard: React.FC<{ course: Course }> = ({ course }) => (
    <GlassCard className="p-4">
        <h3 className="font-bold text-[var(--text-primary)] truncate">{course.title}</h3>
        <p className="text-sm text-[var(--text-secondary)]">{course.platform}</p>
    </GlassCard>
);

const CommunityPage: React.FC<CommunityPageProps> = ({
    community, currentUser, allUsers, allPosts, courses, onJoinToggle, onViewProfile, onCreatePost, onRepost, setCurrentPage, onEditCommunity, onDeleteCommunity, onRateCommunity, ...postCardProps
}) => {
    const [activeTab, setActiveTab] = useState('discussion');
    const isJoined = currentUser.joinedCommunities.includes(community.field);
    const isOwner = community.ownerId === currentUser.id;

    const [memberSort, setMemberSort] = useState<'name' | 'year'>('name');
    const [postSortBy, setPostSortBy] = useState<'recent' | 'top'>('recent');
    const [postStarFilter, setPostStarFilter] = useState<number>(0);

    const { members, posts, resources } = useMemo(() => {
        const members = allUsers.filter(u => u.joinedCommunities.includes(community.field));
        const posts = allPosts.filter(p => p.field === community.field);
        const resources = courses.filter(c => c.field === community.field && c.id !== community.id);
        return { members, posts, resources };
    }, [allUsers, allPosts, courses, community]);
    
    const sortedMembers = useMemo(() => {
        const sorted = [...members];
        if (memberSort === 'name') {
            sorted.sort((a, b) => a.name.localeCompare(b.name));
        } else {
            sorted.sort((a, b) => a.studyYear - b.studyYear);
        }
        return sorted;
    }, [members, memberSort]);

    const sortedAndFilteredPosts = useMemo(() => {
        const filtered = posts.filter(post => {
            const postToCheck = post.repostOf || post;
            return postStarFilter === 0 || postToCheck.rating >= postStarFilter
        });
        const sorted = [...filtered];
        if (postSortBy === 'top') {
            sorted.sort((a, b) => b.likes - a.likes);
        } else {
            sorted.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
        return sorted;
    }, [posts, postSortBy, postStarFilter]);

    const ratingFilters = [
        { label: 'All', value: 0 },
        { label: '4+ Stars', value: 4 },
        { label: '3+ Stars', value: 3 },
    ];

    const TABS = [
        { id: 'discussion', label: 'Discussion', icon: MessageSquareIcon },
        { id: 'members', label: 'Members', icon: UsersIcon },
        { id: 'resources', label: 'Resources', icon: BookIcon },
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'discussion':
                return (
                    <div>
                        {isJoined && <CreateCommunityPostForm currentUser={currentUser} allUsers={allUsers} community={community} onCreatePost={onCreatePost} />}
                        <div className="flex flex-wrap items-center justify-end gap-4 mb-4">
                            <div className="flex items-center gap-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-full p-1 w-fit">
                                {ratingFilters.map(filter => (
                                    <button 
                                        key={filter.value}
                                        onClick={() => setPostStarFilter(filter.value)}
                                        className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${postStarFilter === filter.value ? 'bg-[var(--primary-accent)] text-[var(--primary-accent-text)]' : 'text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]'}`}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-full p-1 w-fit">
                                <button onClick={() => setPostSortBy('recent')} className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${postSortBy === 'recent' ? 'bg-[var(--primary-accent)] text-[var(--primary-accent-text)]' : 'text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]'}`}>
                                    Recent
                                </button>
                                <button onClick={() => setPostSortBy('top')} className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${postSortBy === 'top' ? 'bg-[var(--primary-accent)] text-[var(--primary-accent-text)]' : 'text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]'}`}>
                                    Top
                                </button>
                            </div>
                        </div>
                        <div className="space-y-6">
                            {sortedAndFilteredPosts.length > 0 ? sortedAndFilteredPosts.map(post => (
                                <PostCard key={post.id} post={post} currentUser={currentUser} allUsers={allUsers} onViewProfile={onViewProfile} onRepost={onRepost} isCommentingAllowed={isJoined} {...postCardProps} />
                            )) : (
                                <GlassCard><p className="text-center text-[var(--text-secondary)] py-8">No posts yet. Be the first to share something!</p></GlassCard>
                            )}
                        </div>
                    </div>
                );
            case 'members':
                return (
                    <div>
                         <div className="flex items-center justify-end gap-2 mb-4">
                            <span className="text-sm font-semibold text-[var(--text-secondary)]">Sort by:</span>
                            <button onClick={() => setMemberSort('name')} className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${memberSort === 'name' ? 'bg-[var(--primary-accent)] text-[var(--primary-accent-text)]' : 'bg-[var(--input-bg)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]'}`}>
                                Name
                            </button>
                            <button onClick={() => setMemberSort('year')} className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${memberSort === 'year' ? 'bg-[var(--primary-accent)] text-[var(--primary-accent-text)]' : 'bg-[var(--input-bg)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]'}`}>
                                Year
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sortedMembers.map(member => (
                                <MemberCard key={member.id} member={member} onViewProfile={onViewProfile} />
                            ))}
                        </div>
                    </div>
                );
            case 'resources':
                return (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {resources.length > 0 ? resources.map(course => (
                            <ResourceCard key={course.id} course={course} />
                        )) : (
                            <GlassCard className="md:col-span-2"><p className="text-center text-[var(--text-secondary)] py-8">No resources have been added to this community yet.</p></GlassCard>
                        )}
                    </div>
                );
            default:
                return null;
        }
    }

    return (
        <div className="p-4 md:p-8">
            <div className="max-w-4xl mx-auto pb-20 lg:pb-0">
                <div className="mb-4">
                    <button
                        onClick={() => setCurrentPage('discover')}
                        className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-2 -ml-2 rounded-full hover:bg-[var(--hover-bg)]"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                        Back to Discover
                    </button>
                </div>
                <div className="relative mb-8">
                    <img src={community.imageUrl} alt={`${community.title} banner`} className="w-full h-48 md:h-64 object-cover rounded-2xl" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent rounded-2xl"></div>
                    
                    {/* ✅ تعديل 2: منطقة العنوان والتقييم الجديدة */}
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div>
                                <h1 className="text-4xl md:text-5xl font-extrabold mb-2">{community.title}</h1>
                                <p className="max-w-2xl text-lg opacity-90">{community.description}</p>
                            </div>
                            {/* نجوم التقييم */}
                            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md p-2 rounded-full border border-white/10 w-fit">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRateCommunity(community.id, star);
                                        }}
                                        className="transition-transform hover:scale-110 focus:outline-none"
                                    >
                                        <StarIcon
                                            className={`w-6 h-6 ${star <= community.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'}`}
                                        />
                                    </button>
                                ))}
                                <span className="ml-2 text-sm font-bold text-white">{community.rating}/5</span>
                            </div>
                        </div>
                    </div>
                </div>

                <GlassCard className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                    <div className="flex items-center gap-4 text-[var(--text-secondary)]">
                        <div className="flex items-center gap-2"><UsersIcon className="w-5 h-5" /> <span>{members.length} Members</span></div>
                        <div className="flex items-center gap-2"><MessageSquareIcon className="w-5 h-5" /> <span>{posts.length} Posts</span></div>
                        <div className="flex items-center gap-2"><BookIcon className="w-5 h-5" /> <span>{resources.length} Resources</span></div>
                    </div>
                     <div className="flex items-center gap-2">
                        {isOwner && (
                            <>
                                <button onClick={onEditCommunity} className="p-2 bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--card-border)] rounded-full transition-colors" aria-label="Edit community">
                                    <EditIcon className="w-5 h-5" />
                                </button>
                                 <button onClick={onDeleteCommunity} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 rounded-full transition-colors" aria-label="Delete community">
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => onJoinToggle(community.field)}
                            className={`px-6 py-2 font-semibold rounded-full transition-colors w-32 text-center ${isJoined ? 'bg-transparent text-[var(--text-primary)] border border-[var(--card-border)] hover:bg-[var(--hover-bg)]' : 'bg-[var(--primary-accent)] text-[var(--primary-accent-text)] hover:bg-white'}`}
                            disabled={isOwner}
                        >
                            {isOwner ? 'Owner' : isJoined ? 'Joined' : 'Join'}
                        </button>
                     </div>
                </GlassCard>

                <div className="border-b border-[var(--card-border)] mb-4">
                    <nav className="flex items-center gap-4 -mb-px">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-3 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === tab.id ? 'border-[var(--primary-accent)] text-[var(--primary-accent)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                            >
                                <tab.icon className="w-5 h-5" />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
                {renderTabContent()}
            </div>
        </div>
    );
};

export default CommunityPage;