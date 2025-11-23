import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI, Type } from "@google/genai";
import GlassCard from '../components/GlassCard';
import PostCard from '../components/PostCard';
import { Roadmap, RoadmapStep, Roadmaps, Post, User, QuizQuestion, QuizAttempt, RoadmapResource, Page } from '../types';
import { BookIcon, CourseIcon, YouTubeIcon, ArrowLeftIcon, BotIcon, PlusCircleIcon, ClipboardCheckIcon, PinIcon, SearchIcon, XIcon, ShareIcon, CopyIcon } from '../components/icons';

const resourceIcons = {
    Book: BookIcon,
    YouTube: YouTubeIcon,
    Course: CourseIcon,
    Post: PinIcon,
};

// --- AI GENERATION LOADER ---
const GenerationLoader: React.FC<{ topic: string }> = ({ topic }) => (
    <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
        <motion.div
            className="w-full max-w-md text-center"
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        >
            <GlassCard>
                <BotIcon className="w-16 h-16 text-glow mx-auto animate-pulse" />
                <h2 className="text-2xl font-bold mt-4">Generating Roadmap...</h2>
                <p className="text-[var(--text-secondary)] mt-2">Our AI is crafting a personalized learning path for <span className="font-bold text-[var(--text-primary)]">{topic}</span>. This may take a moment.</p>
            </GlassCard>
        </motion.div>
    </motion.div>
);


// --- PIN POST MODAL ---
const PinPostModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    allPosts: Post[];
    onPinPost: (post: Post) => void;
    currentUser: User;
    allUsers: User[];
    // FIX: Changed userId type from number to string
    onViewProfile: (userId: string) => void;
}> = ({ isOpen, onClose, allPosts, onPinPost, currentUser, allUsers, onViewProfile }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const filteredPosts = useMemo(() =>
        allPosts.filter(p => !p.isCommunityPost && (p.courseName.toLowerCase().includes(searchQuery.toLowerCase()) || p.review.toLowerCase().includes(searchQuery.toLowerCase())))
    , [allPosts, searchQuery]);

    if (!isOpen) return null;

    return (
        <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="w-full max-w-2xl bg-[var(--notification-bg)] rounded-2xl shadow-2xl flex flex-col max-h-[80vh] border border-[var(--card-border)]"
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-4 border-b border-[var(--card-border)] sticky top-0 bg-[var(--notification-bg)]/80 backdrop-blur-lg">
                    <h2 className="text-xl font-bold">Pin a Post</h2>
                    <div className="relative mt-2">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search posts by course or review..."
                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-full pl-10 pr-4 py-2"
                        />
                    </div>
                </header>
                <main className="p-4 overflow-y-auto space-y-4">
                    {filteredPosts.length > 0 ? filteredPosts.map(post => (
                       <PostCard
                            key={post.id}
                            post={post}
                            currentUser={currentUser}
                            allUsers={allUsers}
                            onViewProfile={onViewProfile}
                            pinConfig={{
                                onPin: (postId) => {
                                    const postToPin = allPosts.find(p => p.id === postId);
                                    if (postToPin) {
                                        onPinPost(postToPin);
                                    }
                                    onClose();
                                }
                            }}
                        />
                    )) : <p className="text-center text-[var(--text-secondary)] py-8">No matching posts found.</p>}
                </main>
            </motion.div>
        </motion.div>
    );
};


// --- QUIZ MODAL ---
const QuizModal: React.FC<{
    step: RoadmapStep;
    onClose: () => void;
}> = ({ step, onClose }) => {
    const [questions, setQuestions] = useState<QuizAttempt[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [status, setStatus] = useState<'loading' | 'taking' | 'results'>('loading');
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        const generateQuiz = async () => {
            try {
                const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
                const prompt = `Based on the following learning material for the topic "${step.title}", generate a 5-question multiple-choice quiz with 4 options per question. The questions should test the key concepts. Learning Material: ${step.description}. Resources mentioned: ${step.resources.map(r => r.name).join(', ')}.`;
                
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                quiz: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            question: { type: Type.STRING },
                                            options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                            correctAnswerIndex: { type: Type.INTEGER }
                                        },
                                        required: ["question", "options", "correctAnswerIndex"]
                                    }
                                }
                            }
                        }
                    }
                });

                const jsonResponse = JSON.parse(response.text);
                if (jsonResponse.quiz && jsonResponse.quiz.length > 0) {
                    setQuestions(jsonResponse.quiz);
                    setStatus('taking');
                } else {
                    throw new Error("AI returned an invalid quiz format.");
                }
            } catch (err) {
                console.error("Quiz generation failed:", err);
                setError("Sorry, I couldn't generate a quiz for this topic. Please try again later.");
                setStatus('results'); // Show error on results screen
            }
        };
        generateQuiz();
    }, [step]);

    const handleAnswer = (answerIndex: number) => {
        const newQuestions = [...questions];
        const currentQuestion = newQuestions[currentQuestionIndex];
        currentQuestion.userAnswerIndex = answerIndex;
        currentQuestion.isCorrect = answerIndex === currentQuestion.correctAnswerIndex;
        setQuestions(newQuestions);

        setTimeout(() => {
            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(currentQuestionIndex + 1);
            } else {
                setStatus('results');
            }
        }, 1200);
    };
    
    const score = questions.filter(q => q.isCorrect).length;
    const currentQuestion = questions[currentQuestionIndex];

    const renderContent = () => {
        if (status === 'loading') {
            return <div className="text-center p-8">
                <p className="font-semibold text-lg animate-pulse">Generating your quiz...</p>
                <p className="text-[var(--text-secondary)] mt-2">The AI is preparing some questions for you on "{step.title}".</p>
            </div>;
        }

        if (status === 'results') {
            return <div className="text-center p-8">
                <h3 className="text-2xl font-bold">Quiz Complete!</h3>
                {error ? (
                     <p className="text-red-500 mt-4">{error}</p>
                ) : (
                    <>
                        <p className="text-5xl font-bold my-4">{score} / {questions.length}</p>
                        <p className="text-[var(--text-secondary)]">You did a great job revising "{step.title}"!</p>
                    </>
                )}
                <button onClick={onClose} className="mt-6 px-6 py-2 bg-[var(--primary-accent)] text-[var(--primary-accent-text)] font-semibold rounded-full">Close</button>
            </div>;
        }

        if (status === 'taking' && currentQuestion) {
            return (
                <div className="p-8">
                    <p className="text-sm text-[var(--text-secondary)]">Question {currentQuestionIndex + 1} of {questions.length}</p>
                    <h3 className="text-xl font-semibold my-4 min-h-[56px]">{currentQuestion.question}</h3>
                    <div className="space-y-3">
                        {currentQuestion.options.map((option, index) => {
                            const isSelected = currentQuestion.userAnswerIndex === index;
                            const isCorrect = currentQuestion.correctAnswerIndex === index;
                            
                            let buttonClass = "w-full text-left p-3 rounded-lg border-2 transition-all duration-300 ";
                            if (currentQuestion.userAnswerIndex !== undefined) {
                                if (isCorrect) {
                                    buttonClass += "bg-green-500/20 border-green-500";
                                } else if (isSelected) {
                                    buttonClass += "bg-red-500/20 border-red-500";
                                } else {
                                     buttonClass += "bg-[var(--input-bg)] border-[var(--input-border)] opacity-60";
                                }
                            } else {
                                buttonClass += "bg-[var(--input-bg)] border-[var(--input-border)] hover:border-[var(--primary-accent)]";
                            }

                            return (
                                <button
                                    key={index}
                                    onClick={() => handleAnswer(index)}
                                    disabled={currentQuestion.userAnswerIndex !== undefined}
                                    className={buttonClass}
                                >
                                    {option}
                                </button>
                            );
                        })}
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <motion.div
                className="w-full max-w-xl bg-[var(--notification-bg)] rounded-2xl shadow-2xl flex flex-col border border-[var(--card-border)]"
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
            >
                {renderContent()}
            </motion.div>
        </motion.div>
    );
};


// --- ROADMAP TIMELINE ---
const RoadmapTimeline: React.FC<{ 
    roadmap: Roadmap; 
    onBack: () => void; 
    allPosts: Post[];
    isUnsaved: boolean;
    roadmapKey: string | null;
    onSave?: () => void;
    setCurrentPage: (page: Page) => void;
    setSearchQuery: (query: string) => void;
}> = ({ roadmap, onBack, allPosts, isUnsaved, roadmapKey, onSave, setCurrentPage, setSearchQuery }) => {
    const [quizStep, setQuizStep] = useState<RoadmapStep | null>(null);
    const [copied, setCopied] = useState(false);

    const handleShare = () => {
        if (!roadmapKey) return;
        const link = `${window.location.origin}${window.location.pathname}?roadmap=${roadmapKey}`;
        navigator.clipboard.writeText(link).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        });
    };

    const getResourceLink = (resource: RoadmapResource) => {
        switch (resource.type) {
            case 'Book':
                return `https://www.google.com/search?q=Book+${encodeURIComponent(resource.name)}`;
            case 'YouTube':
                return `https://www.youtube.com/results?search_query=${encodeURIComponent(resource.name)}`;
            case 'Course':
                return `https://www.google.com/search?q=Course+${encodeURIComponent(resource.name)}`;
            default:
                return '#';
        }
    };

    const handlePostResourceClick = (post: Post) => {
        setSearchQuery(post.courseName);
        setCurrentPage('home');
    };

    return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        {quizStep && <QuizModal step={quizStep} onClose={() => setQuizStep(null)} />}
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
            <button onClick={onBack} className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-2 -ml-2 rounded-full hover:bg-[var(--hover-bg)]">
                <ArrowLeftIcon className="w-5 h-5" />
                <span>Back to My Roadmaps</span>
            </button>
            <div className="flex items-center gap-2">
                {roadmapKey && (
                    <button onClick={handleShare} className="flex items-center gap-2 px-4 py-2 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-full hover:bg-[var(--hover-bg)]">
                        {copied ? <CopyIcon className="w-4 h-4 text-green-400" /> : <ShareIcon className="w-4 h-4" />}
                        <span className="text-sm font-semibold">{copied ? 'Copied!' : 'Share'}</span>
                    </button>
                )}
                 {isUnsaved && onSave && (
                    <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 bg-[var(--primary-accent)] text-[var(--primary-accent-text)] font-semibold rounded-full hover:bg-white">
                        <PlusCircleIcon className="w-5 h-5" />
                        Save Roadmap
                    </button>
                )}
            </div>
        </div>
        <GlassCard>
            <h1 className="text-4xl font-extrabold text-[var(--text-primary)] mb-2">{roadmap.title}</h1>
            <p className="text-[var(--text-secondary)] mb-8 max-w-3xl">{roadmap.description}</p>
            <div className="relative pl-6">
                <div className="absolute left-0 top-0 h-full w-0.5 bg-[var(--card-border)]"></div>
                {roadmap.steps.map((step, index) => (
                    <div key={step.id} className="relative mb-12">
                        <div className="absolute -left-[35px] top-1 w-6 h-6 bg-[var(--primary-accent)] rounded-full border-4 border-[var(--card-bg)]"></div>
                        <p className="text-sm font-bold text-[var(--primary-accent)] mb-1">Stage {index + 1}: {step.stage}</p>
                        <h2 className="text-2xl font-bold mb-2">{step.title}</h2>
                        <p className="text-[var(--text-secondary)] mb-4">{step.description}</p>
                        <div className="flex flex-wrap items-center gap-4">
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                                {step.resources.map((resource, rIndex) => {
                                    const Icon = resourceIcons[resource.type];
                                    if (resource.type === 'Post' && resource.postId) {
                                        const post = allPosts.find(p => p.id === resource.postId);
                                        if (!post) return null;
                                        return <div key={rIndex} onClick={() => handlePostResourceClick(post)} className="cursor-pointer">
                                            <GlassCard className="h-full hover:border-[var(--primary-accent)] transition-colors">
                                                 <div className="flex items-start gap-3">
                                                    <div className="p-2 bg-[var(--hover-bg)] rounded-md mt-1"><Icon className="w-5 h-5 text-[var(--primary-accent)]"/></div>
                                                    <div>
                                                        <p className="font-semibold">{post.courseName}</p>
                                                        <p className="text-xs text-[var(--text-secondary)]">Pinned Post</p>
                                                    </div>
                                                </div>
                                            </GlassCard>
                                        </div>
                                    }
                                    return (
                                        <a href={getResourceLink(resource)} target="_blank" rel="noopener noreferrer" key={rIndex}>
                                            <GlassCard className="h-full hover:border-[var(--primary-accent)] transition-colors">
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 bg-[var(--hover-bg)] rounded-md mt-1"><Icon className="w-5 h-5 text-[var(--primary-accent)]"/></div>
                                                    <div>
                                                        <p className="font-semibold">{resource.name}</p>
                                                        <p className="text-xs text-[var(--text-secondary)]">{resource.type}</p>
                                                    </div>
                                                </div>
                                            </GlassCard>
                                        </a>
                                    )
                                })}
                            </div>
                            <button onClick={() => setQuizStep(step)} className="flex items-center gap-2 px-4 py-2 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-full hover:bg-[var(--hover-bg)] self-start">
                                <ClipboardCheckIcon className="w-5 h-5"/>
                                <span className="text-sm font-semibold">Test My Knowledge</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </GlassCard>
    </motion.div>
)};

// --- ROADMAP LIST ---
const RoadmapList: React.FC<{ 
    savedRoadmaps: Roadmaps; 
    onSelect: (roadmap: Roadmap) => void;
    onGenerate: (topic: string) => void;
}> = ({ savedRoadmaps, onSelect, onGenerate }) => {
    const [topic, setTopic] = useState('');

    const handleGenerate = (e: React.FormEvent) => {
        e.preventDefault();
        if (topic.trim()) onGenerate(topic.trim());
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GlassCard className="mb-8">
                <h2 className="text-2xl font-bold mb-2">Generate a New Roadmap</h2>
                <p className="text-[var(--text-secondary)] mb-4">Enter a topic, subject, or career path, and our AI will create a customized learning plan for you.</p>
                <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row gap-4">
                    <input
                        type="text"
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        placeholder="e.g., 'Quantum Computing' or 'Full-Stack Web Development'"
                        className="flex-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-full px-5 py-3"
                    />
                    <button type="submit" className="px-6 py-3 bg-[var(--primary-accent)] text-[var(--primary-accent-text)] font-semibold rounded-full hover:bg-white flex items-center justify-center gap-2">
                        <BotIcon className="w-5 h-5" /> Generate
                    </button>
                </form>
            </GlassCard>

            <div>
                <h2 className="text-2xl font-bold mb-4">My Saved Roadmaps</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.keys(savedRoadmaps).length > 0 ? Object.entries(savedRoadmaps).map(([key, roadmap]) => (
                        <GlassCard key={key} onClick={() => onSelect(roadmap)} className="cursor-pointer hover:border-[var(--primary-accent)] transition-colors">
                            <h3 className="text-xl font-bold mb-2">{roadmap.title}</h3>
                            <p className="text-sm text-[var(--text-secondary)] line-clamp-3">{roadmap.description}</p>
                        </GlassCard>
                    )) : (
                        <GlassCard className="md:col-span-3 text-center">
                            <p className="text-[var(--text-secondary)]">You haven't saved any roadmaps yet. Generate one to get started!</p>
                        </GlassCard>
                    )}
                </div>
            </div>
        </motion.div>
    );
};


// --- ROADMAP PAGE ---
interface RoadmapPageProps {
    roadmaps: Roadmaps;
    onSaveRoadmap: (key: string, roadmap: Roadmap) => void;
    allPosts: Post[];
    allUsers: User[];
    currentUser: User;
    initialRoadmapKey: string | null;
    setCurrentPage: (page: Page) => void;
    setSearchQuery: (query: string) => void;
    onViewProfile: (userId: string) => void;
}

const RoadmapPage: React.FC<RoadmapPageProps> = ({ roadmaps, onSaveRoadmap, allPosts, currentUser, allUsers, initialRoadmapKey, setCurrentPage, setSearchQuery, onViewProfile }) => {
    const [activeRoadmap, setActiveRoadmap] = useState<Roadmap | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPinning, setIsPinning] = useState<{ stepId: string } | null>(null);

    React.useEffect(() => {
        if (initialRoadmapKey && roadmaps[initialRoadmapKey]) {
            setActiveRoadmap(roadmaps[initialRoadmapKey]);
        }
    }, [initialRoadmapKey, roadmaps]);

    const handleGenerateRoadmap = async (topic: string) => {
        setIsLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
            const prompt = `Create a detailed, multi-step learning roadmap for the topic: "${topic}". For each step, provide a "stage" (e.g., "Beginner", "Intermediate"), a "title", a detailed "description", and a list of 3-5 diverse "resources". Resources should be a mix of "Book", "YouTube", and "Course" types.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            roadmap: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    steps: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                stage: { type: Type.STRING },
                                                title: { type: Type.STRING },
                                                description: { type: Type.STRING },
                                                resources: {
                                                    type: Type.ARRAY,
                                                    items: {
                                                        type: Type.OBJECT,
                                                        properties: {
                                                            name: { type: Type.STRING },
                                                            type: { type: Type.STRING, enum: ["Book", "YouTube", "Course"] }
                                                        },
                                                        required: ["name", "type"]
                                                    }
                                                }
                                            },
                                            required: ["stage", "title", "description", "resources"]
                                        }
                                    }
                                },
                                required: ["title", "description", "steps"]
                            }
                        }
                    }
                }
            });

            const jsonResponse = JSON.parse(response.text);
            if (jsonResponse.roadmap) {
                const generatedRoadmap: Roadmap = {
                    ...jsonResponse.roadmap,
                    steps: jsonResponse.roadmap.steps.map((step: any, index: number) => ({ ...step, id: `step-${Date.now()}-${index}` }))
                };
                setActiveRoadmap(generatedRoadmap);
            } else {
                throw new Error("Invalid roadmap format from AI");
            }

        } catch (error) {
            console.error("Roadmap generation failed:", error);
            alert("Sorry, there was an error generating the roadmap. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSave = () => {
        if (activeRoadmap) {
            const key = activeRoadmap.title.toLowerCase().replace(/\s+/g, '-');
            onSaveRoadmap(key, activeRoadmap);
            // After saving, the roadmap is no longer "unsaved"
            const updatedRoadmaps = { ...roadmaps, [key]: activeRoadmap };
            // A bit of a trick to re-render RoadmapTimeline with isUnsaved=false
            // We find the newly saved roadmap from the updated list to ensure we have the right reference
            const savedRoadmap = Object.values(updatedRoadmaps).find(r => r.title === activeRoadmap.title);
            if (savedRoadmap) {
                setActiveRoadmap(savedRoadmap);
            }
        }
    };

    const handlePinPost = (post: Post) => {
        if (!isPinning || !activeRoadmap) return;
        const newResource: RoadmapResource = {
            name: post.courseName,
            type: 'Post',
            postId: post.id
        };
        const updatedSteps = activeRoadmap.steps.map(step => {
            if (step.id === isPinning.stepId) {
                return { ...step, resources: [...step.resources, newResource] };
            }
            return step;
        });
        const updatedRoadmap = { ...activeRoadmap, steps: updatedSteps };
        setActiveRoadmap(updatedRoadmap);
        setIsPinning(null);
    };

    const isUnsaved = activeRoadmap && !Object.values(roadmaps).some(r => r.title === activeRoadmap.title);
    const activeRoadmapKey = activeRoadmap ? Object.entries(roadmaps).find(([_, r]) => r.title === activeRoadmap.title)?.[0] : null;


    return (
        <div className="p-4 md:p-8">
            <div className="max-w-4xl mx-auto pb-20 lg:pb-0">
                <AnimatePresence>
                    {isLoading && <GenerationLoader topic={""} />}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                    {activeRoadmap ? (
                        <RoadmapTimeline
                            key="timeline"
                            roadmap={activeRoadmap}
                            onBack={() => setActiveRoadmap(null)}
                            allPosts={allPosts}
                            isUnsaved={!!isUnsaved}
                            onSave={handleSave}
                            roadmapKey={activeRoadmapKey}
                            setCurrentPage={setCurrentPage}
                            setSearchQuery={setSearchQuery}
                        />
                    ) : (
                        <RoadmapList
                            key="list"
                            savedRoadmaps={roadmaps}
                            onSelect={setActiveRoadmap}
                            onGenerate={handleGenerateRoadmap}
                        />
                    )}
                </AnimatePresence>

                 <PinPostModal 
                    isOpen={!!isPinning}
                    onClose={() => setIsPinning(null)}
                    allPosts={allPosts}
                    onPinPost={handlePinPost}
                    currentUser={currentUser}
                    allUsers={allUsers}
                    onViewProfile={onViewProfile}
                />
            </div>
        </div>
    );
};

// FIX: Add default export to be consumable by App.tsx
export default RoadmapPage;
