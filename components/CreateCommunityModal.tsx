import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Course } from '../types';
import { XIcon, UploadCloudIcon } from './icons';
import GlassCard from './GlassCard';

interface CreateCommunityModalProps {
    onSave: (communityData: Omit<Course, 'id' | 'rating' | 'platform' | 'ownerId'>) => void;
    onClose: () => void;
}

const CreateCommunityModal: React.FC<CreateCommunityModalProps> = ({ onSave, onClose }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [field, setField] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [isCompressing, setIsCompressing] = useState(false); // حالة عشان نعرف بنضغط الصورة ولا لأ
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ✅ دالة سحرية لضغط الصورة
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

                    // 1. غير الـ MAX_WIDTH من 1200 لـ 800 (لسه دقة عالية للموبايل واللابتوب)
                    const MAX_WIDTH = 800; 
                    const scaleSize = MAX_WIDTH / img.width;
                    
                    // لو الصورة أصغر من الحد الأقصى، سيبها زي ما هي
                    if (scaleSize >= 1) {
                        canvas.width = img.width;
                        canvas.height = img.height;
                    } else {
                        canvas.width = MAX_WIDTH;
                        canvas.height = img.height * scaleSize;
                    }

                    ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

                    // تحويل الصورة لـ JPEG وضغط الجودة لـ 70%
                    // 2. غير جودة الضغط من 0.7 لـ 0.6 (كافي جداً للويب)
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
                    resolve(compressedDataUrl);
                };
            };
        });
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setIsCompressing(true); // ابدأ التحميل

            try {
                // ضغط الصورة قبل الحفظ
                const compressedImage = await compressImage(file);
                setImageUrl(compressedImage);
            } catch (error) {
                console.error("Error compressing image:", error);
                alert("Failed to process image. Please try another one.");
            } finally {
                setIsCompressing(false); // خلص التحميل
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (title && description && field && imageUrl) {
            onSave({ title, description, field, imageUrl });
            onClose();
        } else {
            alert('Please fill out all fields and upload an image.');
        }
    };

    return (
        <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg"
            >
                <GlassCard className="relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                    <h2 className="text-2xl font-bold mb-6 text-[var(--text-primary)]">Create a New Community</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div 
                            className="w-full h-40 bg-[var(--input-bg)] border-2 border-dashed border-[var(--input-border)] rounded-lg flex items-center justify-center cursor-pointer hover:border-[var(--primary-accent)] transition-colors relative overflow-hidden"
                            onClick={() => !isCompressing && fileInputRef.current?.click()}
                        >
                            {isCompressing ? (
                                <div className="text-center">
                                    <div className="w-8 h-8 border-4 border-[var(--primary-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                    <p className="text-sm text-[var(--text-secondary)]">Processing image...</p>
                                </div>
                            ) : imageUrl ? (
                                <img src={imageUrl} alt="Community preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center text-[var(--text-secondary)]">
                                    <UploadCloudIcon className="w-8 h-8 mx-auto" />
                                    <p className="mt-2 text-sm">Click to upload a banner image</p>
                                    <p className="text-xs">Supports large images (Auto-compressed)</p>
                                </div>
                            )}
                        </div>
                         <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            className="hidden"
                            accept="image/png, image/jpeg, image/gif, image/webp"
                        />

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Community Title</label>
                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-accent)]" />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Field / Major</label>
                            <input type="text" value={field} onChange={(e) => setField(e.target.value)} required
                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-accent)]" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description</label>
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} required
                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-accent)] min-h-[80px]" />
                        </div>
                        
                        <div className="flex justify-end gap-4 pt-4">
                            <button type="button" onClick={onClose} className="px-4 py-2 bg-transparent text-[var(--text-secondary)] font-semibold rounded-full hover:bg-[var(--hover-bg)]">
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                disabled={isCompressing}
                                className={`px-6 py-2 bg-[var(--primary-accent)] text-[var(--primary-accent-text)] font-semibold rounded-full hover:bg-white ${isCompressing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isCompressing ? 'Processing...' : 'Create Community'}
                            </button>
                        </div>
                    </form>
                </GlassCard>
            </motion.div>
        </motion.div>
    );
};

export default CreateCommunityModal;