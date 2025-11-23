import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ChatMessage } from '../types';
import { XIcon, SendIcon, CheckIcon, CheckCheckIcon, ArrowLeftIcon } from '../components/icons';
import { chatsAPI } from '../api';
import GlassCard from '../components/GlassCard';

interface ChatPageProps {
    currentUser: User;
    chatUser: User;
    chatId: string;
    onClose: () => void;
}

const ChatPage: React.FC<ChatPageProps> = ({ currentUser, chatUser, chatId, onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const [isSending, setIsSending] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (!chatId) return;

        const fetchMessages = async () => {
            try {
                const fetchedMessages = await chatsAPI.getMessages(chatId);
                // Check if we actually possess new messages to avoid unnecessary re-renders if needed
                setMessages(fetchedMessages as ChatMessage[]);
            } catch (error) {
                console.error("Error fetching messages:", error);
            }
        };

        fetchMessages();
        const interval = setInterval(fetchMessages, 2000); // Poll every 2 seconds

        return () => clearInterval(interval);
    }, [chatId]);
    

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() && chatId && !isSending) {
            const messageText = newMessage.trim();
            setNewMessage('');
            setIsSending(true);
            
            // Optimistic UI update
            const tempId = `temp-${Date.now()}`;
            const optimisiticMsg: ChatMessage = {
                id: tempId,
                senderId: currentUser.id,
                text: messageText,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'sent'
            };
            setMessages(prev => [...prev, optimisiticMsg]);

            try {
                await chatsAPI.sendMessage(
                    chatId,
                    currentUser.id,
                    messageText,
                    [currentUser.id, chatUser.id]
                );
                // Fetch to get the real ID and sync
                const syncedMessages = await chatsAPI.getMessages(chatId);
                setMessages(syncedMessages as ChatMessage[]);
            } catch (error) {
                console.error("Error sending message:", error);
                setMessages(prev => prev.filter(m => m.id !== tempId)); // Remove failed message
                setNewMessage(messageText); // Restore text
            } finally {
                setIsSending(false);
            }
        }
    };
    
    const ReadReceipt: React.FC<{status: ChatMessage['status']}> = ({status}) => {
      if (status === 'read') return <CheckCheckIcon className="w-3 h-3 text-blue-400" />
      if (status === 'delivered') return <CheckCheckIcon className="w-3 h-3 text-gray-400" />
      return <CheckIcon className="w-3 h-3 text-gray-400" />
    }

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 md:p-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    // ✅ حجم أكبر وتصميم أجمل
                    className="w-full max-w-3xl h-[85vh] bg-[#111827] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-700 ring-1 ring-white/10"
                    onClick={(e) => e.stopPropagation()}
                    initial={{ scale: 0.9, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 20, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                >
                    {/* Header */}
                    <header className="flex items-center justify-between p-4 bg-[#1F2937]/80 backdrop-blur-xl border-b border-gray-700 z-10">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <img src={chatUser.avatarUrl} alt={chatUser.name} className="w-12 h-12 rounded-full object-cover border-2 border-[#14F195]" />
                                {chatUser.isActive && (
                                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#1F2937] rounded-full"></div>
                                )}
                            </div>
                            <div>
                                <h1 className="font-bold text-lg text-white flex items-center gap-2">
                                    {chatUser.name}
                                    <span className="text-xs font-normal text-[#14F195] px-2 py-0.5 bg-[#14F195]/10 rounded-full">Student</span>
                                </h1>
                                <p className="text-sm text-gray-400">@{chatUser.username} • {chatUser.specialization}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </header>

                    {/* Chat Area */}
                    <main className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0D0D0D] scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                        <div className="text-center py-4">
                            <p className="text-xs text-gray-500 uppercase tracking-widest">Start of conversation</p>
                        </div>
                        
                        {messages.map((msg, index) => {
                            const isMe = msg.senderId === currentUser.id;
                            const isLast = index === messages.length - 1;
                            
                            return (
                                <motion.div 
                                    key={msg.id} 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div 
                                            className={`px-5 py-3 rounded-2xl text-sm md:text-base shadow-sm ${
                                                isMe 
                                                    ? 'bg-gradient-to-br from-[#14F195] to-[#0FB872] text-black rounded-br-none font-medium' 
                                                    : 'bg-[#374151] text-white rounded-bl-none'
                                            }`}
                                        >
                                            <p>{msg.text}</p>
                                        </div>
                                        <div className={`flex items-center gap-1 mt-1 text-[11px] text-gray-500 ${isMe ? 'flex-row-reverse' : ''}`}>
                                            <span>{msg.timestamp}</span>
                                            {isMe && <ReadReceipt status={msg.status} />}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </main>

                    {/* Input Area */}
                    <footer className="p-4 bg-[#1F2937] border-t border-gray-700">
                        <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                            <div className="flex-1 bg-[#374151] rounded-2xl border border-gray-600 focus-within:border-[#14F195] focus-within:ring-1 focus-within:ring-[#14F195] transition-all">
                                <textarea
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage(e);
                                        }
                                    }}
                                    placeholder="Type your message..."
                                    className="w-full bg-transparent border-none px-4 py-3 text-white placeholder-gray-400 focus:ring-0 resize-none min-h-[50px] max-h-[120px] scrollbar-none"
                                    rows={1}
                                    style={{ height: '50px' }} 
                                />
                            </div>
                            <button 
                                type="submit" 
                                className={`p-3.5 rounded-full transition-all shadow-lg flex-shrink-0 ${
                                    newMessage.trim() 
                                    ? 'bg-[#14F195] text-black hover:bg-white hover:scale-105' 
                                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                }`}
                                disabled={!newMessage.trim() || isSending}
                            >
                                <SendIcon className="w-5 h-5" />
                            </button>
                        </form>
                    </footer>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ChatPage;