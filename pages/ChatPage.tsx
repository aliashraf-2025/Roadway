import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ChatMessage } from '../types';
import { XIcon, SendIcon, CheckIcon, CheckCheckIcon } from '../components/icons';
import { chatsAPI } from '../api';

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

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        if (!chatId) return;

        // Poll for messages (could be replaced with WebSocket later)
        const fetchMessages = async () => {
            try {
                const fetchedMessages = await chatsAPI.getMessages(chatId);
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
        if (newMessage.trim() && chatId) {
            const messageText = newMessage.trim();
            setNewMessage('');
            
            try {
                await chatsAPI.sendMessage(
                    chatId,
                    currentUser.id,
                    messageText,
                    [currentUser.id, chatUser.id]
                );
            } catch (error) {
                console.error("Error sending message:", error);
                setNewMessage(messageText); // Restore message on error
            }
        }
    };
    
    const ReadReceipt: React.FC<{status: ChatMessage['status']}> = ({status}) => {
      if (status === 'read') return <CheckCheckIcon className="w-4 h-4 text-blue-400" />
      if (status === 'delivered') return <CheckCheckIcon className="w-4 h-4 text-gray-400" />
      return <CheckIcon className="w-4 h-4 text-gray-400" />
    }

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="w-full max-w-md h-[70vh] max-h-[550px] bg-[#1F2937] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-700"
                    drag
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                    dragElastic={0.1}
                    onClick={(e) => e.stopPropagation()}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                    <header className="flex items-center gap-4 p-3 bg-slate-800/50 backdrop-blur-lg border-b border-white/10 flex-shrink-0 cursor-move">
                        <img src={chatUser.avatarUrl} alt={chatUser.name} className="w-10 h-10 rounded-full" />
                        <div className="flex-1">
                            <h1 className="font-bold text-base text-white">{chatUser.name}</h1>
                            <p className="text-xs text-gray-400">@{chatUser.username}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                            <XIcon className="w-5 h-5" />
                        </button>
                    </header>

                    <main className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#0D0D0D]">
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex w-full ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex items-start gap-2 max-w-[80%]`}>
                                    {msg.senderId !== currentUser.id && (
                                        <img src={chatUser.avatarUrl} alt={chatUser.name} className="w-6 h-6 rounded-full self-end"/>
                                    )}
                                    <div className={`flex flex-col ${msg.senderId === currentUser.id ? 'items-end' : 'items-start'}`}>
                                        <div className={`p-3 rounded-2xl text-sm ${msg.senderId === currentUser.id ? 'bg-[#14F195] text-black rounded-br-lg' : 'bg-slate-700 text-white rounded-bl-lg'}`}>
                                            <p>{msg.text}</p>
                                        </div>
                                        <div className={`flex items-center gap-1.5 mt-1 px-1 ${msg.senderId === currentUser.id ? 'flex-row-reverse' : ''}`}>
                                            <p className="text-[10px] text-gray-500">{msg.timestamp}</p>
                                            {msg.senderId === currentUser.id && <ReadReceipt status={msg.status} />}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </main>

                    <footer className="p-3 bg-slate-800/50 backdrop-blur-lg border-t border-white/10 flex-shrink-0">
                        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 bg-slate-700 border border-white/20 rounded-full px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#14F195]"
                            />
                            <button type="submit" className="p-3 bg-[#14F195] text-black rounded-full hover:bg-white disabled:bg-gray-600 transition-colors" disabled={!newMessage.trim()}>
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