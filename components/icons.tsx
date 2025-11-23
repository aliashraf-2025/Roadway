import React from 'react';
import { Home, Compass, MessageSquare, User, Star, ThumbsUp, MessageCircle, ArrowRight, Book, Youtube, Laptop, Mail, Lock, Users, ArrowLeft, Send, X, Sun, Moon, Bell, Check, CheckCheck, Pencil, Search, Trash2, UploadCloud, MoreHorizontal, Flag, UserX, Paperclip, Link, Repeat, Bot, PlusCircle, ClipboardCheck, Pin, Shield, Share2, Copy } from 'lucide-react';

// ✅ 1. استيراد الصورة هنا (عشان نضمن إنها موجودة)
// تأكد إن الصورة اسمها logo.png وموجودة في فولدر src/assets
import logoImage from '../assets/logo.png';

export const HomeIcon = Home;
export const DiscoverIcon = Compass;
export const ChatIcon = MessageSquare;
export const ProfileIcon = User;
export const StarIcon = Star;
export const LikeIcon = ThumbsUp;
export const ThumbsUpIcon = ThumbsUp;
export const CommentIcon = MessageCircle;
export const MessageSquareIcon = MessageSquare;
export const ArrowRightIcon = ArrowRight;
export const BookIcon = Book;
export const YouTubeIcon = Youtube;
export const CourseIcon = Laptop;
export const MailIcon = Mail;
export const LockIcon = Lock;
export const UsersIcon = Users;
export const ArrowLeftIcon = ArrowLeft;
export const SendIcon = Send;
export const XIcon = X;
export const SunIcon = Sun;
export const MoonIcon = Moon;
export const BellIcon = Bell;
export const CheckIcon = Check;
export const CheckCheckIcon = CheckCheck;
export const EditIcon = Pencil;
export const SearchIcon = Search;
export const TrashIcon = Trash2;
export const UploadCloudIcon = UploadCloud;
export const MoreHorizontalIcon = MoreHorizontal;
export const FlagIcon = Flag;
export const BlockUserIcon = UserX;
export const AttachmentIcon = Paperclip;
export const LinkIcon = Link;
export const RepostIcon = Repeat;
export const BotIcon = Bot;
export const PlusCircleIcon = PlusCircle;
export const ClipboardCheckIcon = ClipboardCheck;
export const PinIcon = Pin;
export const AdminIcon = Shield;
export const ShareIcon = Share2;
export const CopyIcon = Copy;

// ✅ 2. تعديل مكون اللوجو (تكبير الحجم)
export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => (
  <img 
    src={logoImage} 
    alt="Roadway" 
    // التعديل هنا: غيرنا h-10 لـ h-14 في الموبايل و h-20 في الكمبيوتر
    // w-auto: عشان العرض يظبط تلقائي مع الطول
    className={`h-13 md:h-10 w-auto object-contain ${className}`} 
  />
);