import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Post } from '../types';
import { XIcon, StarIcon, LinkIcon, UploadCloudIcon, TrashIcon, CheckIcon } from './icons';
import GlassCard from './GlassCard';

interface EditPostModalProps {
    post: Post;
    onSave: (updatedData: Partial<Post>) => void;
    onClose: () => void;
}

const EditPostModal: React.FC<EditPostModalProps> = ({ post, onSave, onClose }) => {
    const [courseName, setCourseName] = useState(post.courseName);
    const [review, setReview] = useState(post.review);
    const [rating, setRating] = useState(post.rating);
    const [linkUrl, setLinkUrl] = useState(post.linkUrl || '');
    const [imageUrls, setImageUrls] = useState<string[]>(post.imageUrls || []);
    const [isProcessing, setIsProcessing] = useState(false); // عشان نمنع الحفظ أثناء ضغط الصور
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ✅ دالة ضغط الصور (نفس فكرة Community Modal)
    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const MAX_WIDTH = 800; // دقة عالية وكافية
                    const scaleSize = MAX_WIDTH / img.width;
                    
                    if (scaleSize >= 1) {
                        canvas.width = img.width;
                        canvas.height = img.height;
                    } else {
                        canvas.width = MAX_WIDTH;
                        canvas.height = img.height * scaleSize;
                    }

                    ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                    // ضغط الجودة لـ 0.7 (يقلل الحجم جداً مع الحفاظ على الشكل)
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
                    resolve(compressedDataUrl);
                };
            };
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setIsProcessing(true);
            const files = Array.from(e.target.files);
            
            try {
                // نضغط كل الصور اللي اختارها بالتوازي
                const compressedImages = await Promise.all(files.map(file => compressImage(file)));
                setImageUrls(prev => [...prev, ...compressedImages]);
            } catch (error) {
                console.error("Error processing images", error);
                alert("Some images could not be processed.");
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const removeImage = (indexToRemove: number) => {
        setImageUrls(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (courseName && review && rating > 0) {
            onSave({ 
                courseName, 
                review, 
                rating, 
                linkUrl, 
                imageUrls 
            });
        }
    };

    return (
        <motion.div
            className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                // ✅ تصميم أعرض وأشيك
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-3xl max-h-[90vh] flex flex-col"
            >
                <GlassCard className="relative flex flex-col max-h-full overflow-hidden !p-0 bg-[#121212] border-gray-800">
                    
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-[#1a1a1a]">
                        <h2 className="text-xl font-bold text-white">Edit Post</h2>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        
                        {/* Row 1: Title & Link */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Course / Topic Title</label>
                                <input
                                    type="text"
                                    value={courseName}
                                    onChange={(e) => setCourseName(e.target.value)}
                                    className="w-full bg-[#1F2937] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#14F195] transition-colors placeholder-gray-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">External Link <span className="text-xs opacity-50">(Optional)</span></label>
                                <div className="relative">
                                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="url"
                                        value={linkUrl}
                                        onChange={(e) => setLinkUrl(e.target.value)}
                                        placeholder="https://..."
                                        className="w-full bg-[#1F2937] border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-[#14F195] transition-colors placeholder-gray-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Review */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Your Review</label>
                            <textarea
                                value={review}
                                onChange={(e) => setReview(e.target.value)}
                                className="w-full bg-[#1F2937] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#14F195] min-h-[140px] resize-none transition-colors placeholder-gray-500 leading-relaxed"
                            />
                        </div>

                        {/* Row 3: Images */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-gray-400">Attached Images</label>
                                <span className="text-xs text-gray-500">{imageUrls.length} images</span>
                            </div>
                            
                            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                                {imageUrls.map((url, index) => (
                                    <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-700 bg-black">
                                        <img src={url} alt="attachment" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                        <button 
                                            type="button" 
                                            onClick={() => removeImage(index)}
                                            className="absolute top-1 right-1 p-1.5 bg-black/70 text-red-400 rounded-full hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <TrashIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                                <button 
                                    type="button"
                                    onClick={() => !isProcessing && fileInputRef.current?.click()}
                                    disabled={isProcessing}
                                    className="aspect-square rounded-lg border-2 border-dashed border-gray-700 flex flex-col items-center justify-center text-gray-500 hover:border-[#14F195] hover:text-[#14F195] hover:bg-[#14F195]/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isProcessing ? (
                                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <UploadCloudIcon className="w-6 h-6 mb-1" />
                                            <span className="text-[10px] font-bold uppercase">Add</span>
                                        </>
                                    )}
                                </button>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/*"
                                multiple
                            />
                        </div>

                        {/* Row 4: Rating */}
                        <div className="bg-[#1F2937]/50 border border-gray-700 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="text-center sm:text-left">
                                <p className="font-bold text-white">Overall Rating</p>
                                <p className="text-xs text-gray-400">How would you rate this experience?</p>
                            </div>
                            <div className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-full">
                                {[...Array(5)].map((_, i) => (
                                    <StarIcon
                                        key={i}
                                        className={`w-8 h-8 cursor-pointer transition-transform hover:scale-110 hover:-translate-y-1 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
                                        onClick={() => setRating(i + 1)}
                                    />
                                ))}
                            </div>
                        </div>

                    </form>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-white/10 bg-[#1a1a1a] flex justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-6 py-2.5 text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSubmit}
                            disabled={isProcessing}
                            className={`px-8 py-2.5 text-sm font-bold bg-[#14F195] text-black rounded-full hover:bg-white hover:shadow-[0_0_15px_rgba(20,241,149,0.4)] transition-all flex items-center gap-2 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isProcessing ? 'Processing Images...' : (
                                <>
                                    <CheckIcon className="w-4 h-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </GlassCard>
            </motion.div>
        </motion.div>
    );
};

export default EditPostModal;