import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../config/supabase.js';
import { sanitizeText } from '../security/sanitize.js';
import Avatar from '../components/ui/Avatar.jsx';
import styles from './InboxPage.module.css';

function formatRelativeTime(timestamp) {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diff = Math.floor((now - then) / 1000);

    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return `${Math.floor(diff / 604800)}w`;
}

function formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// Send icon
function SendIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 2L9 11M18 2L12 18L9 11M18 2L2 8L9 11" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );
}

// Envelope icon for empty state
function EnvelopeIcon({ size = 64 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M2 5L10 10L18 5M2 5V15C2 15.5523 2.44772 16 3 16H17C17.5523 16 18 15.5523 18 15V5M2 5C2 4.44772 2.44772 4 3 4H17C17.5523 4 18 4.44772 18 5Z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );
}

export default function InboxPage() {
    const { user } = useAuth();
    const location = useLocation();
    const [conversations, setConversations] = useState([]);
    const [selectedConversationId, setSelectedConversationId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sendingMessage, setSendingMessage] = useState(false);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);

    useEffect(() => {
        if (user) {
            fetchConversations();
        }
    }, [user]);

    useEffect(() => {
        // Check if navigated from ProfilePage with a conversation ID
        if (location.state?.conversationId) {
            setSelectedConversationId(location.state.conversationId);
        }
    }, [location]);

    useEffect(() => {
        if (selectedConversationId) {
            fetchMessages();
            markMessagesAsRead();
            subscribeToMessages();
        }

        return () => {
            // Cleanup subscription
            if (selectedConversationId) {
                supabase.removeChannel(`messages-${selectedConversationId}`);
            }
        };
    }, [selectedConversationId]);

    useEffect(() => {
        // Auto-scroll to bottom when messages change
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchConversations = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('conversations')
            .select(`
                *,
                user_a_info:users!user_a(id, display_name, username, avatar_index),
                user_b_info:users!user_b(id, display_name, username, avatar_index)
            `)
            .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
            .order('last_message_at', { ascending: false });

        setConversations(data || []);
        setLoading(false);
    };

    const fetchMessages = async () => {
        const { data } = await supabase
            .from('direct_messages')
            .select('*')
            .eq('conversation_id', selectedConversationId)
            .order('created_at', { ascending: true });

        setMessages(data || []);
    };

    const markMessagesAsRead = async () => {
        await supabase
            .from('direct_messages')
            .update({ is_read: true })
            .eq('conversation_id', selectedConversationId)
            .neq('sender_id', user.id)
            .eq('is_read', false);

        // Refresh sidebar badge count
        window.dispatchEvent(new Event('refreshUnreadCount'));
    };

    const subscribeToMessages = () => {
        const channel = supabase
            .channel(`messages-${selectedConversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'direct_messages',
                    filter: `conversation_id=eq.${selectedConversationId}`,
                },
                async (payload) => {
                    setMessages((prev) => [...prev, payload.new]);

                    // If message is from other user, mark as read
                    if (payload.new.sender_id !== user.id) {
                        await supabase
                            .from('direct_messages')
                            .update({ is_read: true })
                            .eq('id', payload.new.id);

                        window.dispatchEvent(new Event('refreshUnreadCount'));
                    }
                }
            )
            .subscribe();
    };

    const getOtherUser = (conversation) => {
        if (conversation.user_a === user.id) {
            return conversation.user_b_info;
        }
        return conversation.user_a_info;
    };

    const handleSendMessage = async (e) => {
        e?.preventDefault();
        
        const sanitized = sanitizeText(messageInput).trim();
        if (!sanitized || sendingMessage) return;

        setSendingMessage(true);
        const tempMessage = {
            id: Date.now(),
            conversation_id: selectedConversationId,
            sender_id: user.id,
            content: sanitized,
            created_at: new Date().toISOString(),
            is_read: true,
        };

        // Optimistic update
        setMessages((prev) => [...prev, tempMessage]);
        setMessageInput('');

        try {
            await supabase.from('direct_messages').insert({
                conversation_id: selectedConversationId,
                sender_id: user.id,
                content: sanitized,
            });

            await supabase
                .from('conversations')
                .update({ last_message_at: new Date().toISOString() })
                .eq('id', selectedConversationId);

            // Refresh conversations list to update order
            await fetchConversations();
        } catch (err) {
            console.error('Failed to send message:', err);
            // Remove optimistic message on error
            setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
        } finally {
            setSendingMessage(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const selectedConversation = conversations.find((c) => c.id === selectedConversationId);
    const otherUser = selectedConversation ? getOtherUser(selectedConversation) : null;

    return (
        <div className={styles.container}>
            {/* Left Column - Conversations List */}
            <div className={styles.leftColumn}>
                {/* Conversations List */}
                <div className={styles.conversationsSection}>
                    <h2 className={styles.conversationsHeader}>Messages</h2>
                    {loading ? (
                        <div className={styles.loadingState}>Loading...</div>
                    ) : conversations.length === 0 ? (
                        <div className={styles.emptyState}>
                            No messages yet. Visit someone's profile to add them.
                        </div>
                    ) : (
                        <div className={styles.conversationsList}>
                            {conversations.map((conversation) => {
                                const otherUser = getOtherUser(conversation);
                                const isSelected = selectedConversationId === conversation.id;

                                return (
                                    <div
                                        key={conversation.id}
                                        className={`${styles.conversationRow} ${isSelected ? styles.selected : ''}`}
                                        onClick={() => setSelectedConversationId(conversation.id)}
                                    >
                                        <Avatar 
                                            size="sm" 
                                            avatarIndex={otherUser?.avatar_index} 
                                        />
                                        <div className={styles.conversationInfo}>
                                            <div className={styles.conversationTop}>
                                                <span className={styles.conversationName}>
                                                    {otherUser?.display_name}
                                                </span>
                                                <span className={styles.conversationTime}>
                                                    {formatRelativeTime(conversation.last_message_at)}
                                                </span>
                                            </div>
                                            <div className={styles.conversationUsername}>
                                                @{otherUser?.username}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column - Message Thread */}
            <div className={styles.rightColumn}>
                {!selectedConversationId ? (
                    <div className={styles.emptyThread}>
                        <EnvelopeIcon size={64} />
                        <p className={styles.emptyThreadText}>
                            Select a conversation to start messaging
                        </p>
                    </div>
                ) : (
                    <div className={styles.threadContainer}>
                        {/* Top Bar */}
                        <div className={styles.threadHeader}>
                            <Avatar size="sm" avatarIndex={otherUser?.avatar_index} />
                            <div className={styles.threadHeaderInfo}>
                                <div className={styles.threadHeaderName}>
                                    {otherUser?.display_name}
                                </div>
                                <div className={styles.threadHeaderUsername}>
                                    @{otherUser?.username}
                                </div>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className={styles.messagesArea} ref={messagesContainerRef}>
                            {messages.map((message) => {
                                const isOwn = message.sender_id === user.id;
                                return (
                                    <div
                                        key={message.id}
                                        className={`${styles.messageWrapper} ${isOwn ? styles.ownMessage : styles.theirMessage}`}
                                    >
                                        <div className={styles.messageBubble}>
                                            {message.content}
                                        </div>
                                        <div className={styles.messageTime}>
                                            {formatMessageTime(message.created_at)}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Bar */}
                        <div className={styles.inputBar}>
                            <textarea
                                className={styles.messageInput}
                                placeholder="Type a message..."
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                rows={1}
                                disabled={sendingMessage}
                            />
                            <button
                                className={styles.sendButton}
                                onClick={handleSendMessage}
                                disabled={!messageInput.trim() || sendingMessage}
                            >
                                <SendIcon size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
