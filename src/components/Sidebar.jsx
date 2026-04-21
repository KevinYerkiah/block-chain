import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../config/supabase.js';
import Avatar from './ui/Avatar.jsx';
import Dropdown from './ui/Dropdown.jsx';
import Button from './ui/Button.jsx';
import { HomeIcon, MessageCircleIcon, MoreIcon, LogoutIcon, FireIcon } from './ui/icons.jsx';
import BurnModal from './BurnModal.jsx';
import styles from './Sidebar.module.css';

// Envelope icon for Inbox
function EnvelopeIcon({ size = 24 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 5L10 10L18 5M2 5V15C2 15.5523 2.44772 16 3 16H17C17.5523 16 18 15.5523 18 15V5M2 5C2 4.44772 2.44772 4 3 4H17C17.5523 4 18 4.44772 18 5Z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );
}

// Bell icon for Notifications
function BellIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M15 6.66667C15 5.34058 14.4732 4.06881 13.5355 3.13113C12.5979 2.19345 11.3261 1.66667 10 1.66667C8.67392 1.66667 7.40215 2.19345 6.46447 3.13113C5.52678 4.06881 5 5.34058 5 6.66667C5 12.5 2.5 14.1667 2.5 14.1667H17.5C17.5 14.1667 15 12.5 15 6.66667Z" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M11.4417 17.5C11.2952 17.7526 11.0849 17.9622 10.8319 18.1079C10.5789 18.2537 10.292 18.3304 10 18.3304C9.70802 18.3304 9.42115 18.2537 9.16815 18.1079C8.91515 17.9622 8.70486 17.7526 8.55835 17.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );
}

// Person+ icon for friend requests
function UserPlusIcon({ size = 24 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17C2 14.2386 4.23858 12 7 12H11C13.7614 12 16 14.2386 16 17" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15 7H18M16.5 5.5V8.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );
}

// Message bubble icon
function MessageBubbleIcon({ size = 24 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 5C2 3.89543 2.89543 3 4 3H16C17.1046 3 18 3.89543 18 5V13C18 14.1046 17.1046 15 16 15H11L7 18V15H4C2.89543 15 2 14.1046 2 13V5Z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );
}

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

export default function Sidebar() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [moreOpen, setMoreOpen] = useState(false);
    const [burnModalOpen, setBurnModalOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [actionLoading, setActionLoading] = useState(null);
    const notificationsPanelRef = useRef(null);
    const notificationsBellRef = useRef(null);

    useEffect(() => {
        if (user) {
            fetchUnreadCount();
            fetchNotifications();
            const channel = subscribeToNotifications();
            
            return () => {
                if (channel) {
                    supabase.removeChannel(channel);
                }
            };
        }
    }, [user]);

    // Close dropdown when clicking outside (only for More dropdown now)
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                moreOpen &&
                !event.target.closest('[data-dropdown="more"]')
            ) {
                setMoreOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [moreOpen]);

    const fetchUnreadCount = async () => {
        try {
            const { count } = await supabase
                .from('notifications')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('is_read', false);

            setUnreadCount(count || 0);
        } catch (err) {
            console.error('Error fetching unread count:', err);
        }
    };

    const fetchNotifications = async () => {
        try {
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20);

            setNotifications(data || []);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        }
    };

    const subscribeToNotifications = () => {
        const channel = supabase
            .channel('my-notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    setUnreadCount((prev) => prev + 1);
                    if (notificationsOpen) {
                        setNotifications((prev) => [payload.new, ...prev]);
                    }
                }
            )
            .subscribe();
        
        return channel;
    };

    const handleMarkAllRead = async () => {
        try {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('is_read', false);

            setUnreadCount(0);
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        } catch (err) {
            console.error('Error marking all as read:', err);
        }
    };

    const handleAcceptFriendRequest = async (e, notificationId, requestId) => {
        e.stopPropagation();
        setActionLoading(notificationId);
        
        try {
            await supabase.rpc('accept_friend_request', { p_request_id: requestId });
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId);

            setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Error accepting friend request:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeclineFriendRequest = async (e, notificationId, requestId) => {
        e.stopPropagation();
        setActionLoading(notificationId);
        
        try {
            await supabase
                .from('friend_requests')
                .update({ status: 'rejected' })
                .eq('id', requestId);
            
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId);

            setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Error declining friend request:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleMessageNotificationClick = async (notification) => {
        try {
            if (!notification.is_read) {
                await supabase
                    .from('notifications')
                    .update({ is_read: true })
                    .eq('id', notification.id);

                setUnreadCount((prev) => Math.max(0, prev - 1));
            }

            setNotificationsOpen(false);
            navigate('/inbox', { state: { conversationId: notification.related_id } });
        } catch (err) {
            console.error('Error handling message notification:', err);
        }
    };

    const moreItems = [
        {
            label: 'Sign Out',
            icon: <LogoutIcon size={20} />,
            onClick: signOut,
        },
        {
            label: 'BURN',
            icon: <FireIcon size={20} />,
            onClick: () => setBurnModalOpen(true),
            variant: 'danger',
        },
    ];

    return (
        <aside className={styles.sidebar}>
            {notificationsOpen ? (
                // Notifications View
                <div className={styles.notificationsView}>
                    <div className={styles.notificationsViewHeader}>
                        <button
                            className={styles.backButton}
                            onClick={() => setNotificationsOpen(false)}
                        >
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 5L7 10L12 15" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                        <h2 className={styles.notificationsViewTitle}>Notifications</h2>
                        {unreadCount > 0 && (
                            <button
                                className={styles.markAllReadButtonCompact}
                                onClick={handleMarkAllRead}
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    <div className={styles.notificationsViewList}>
                        {notifications.length === 0 ? (
                            <div className={styles.notificationsViewEmpty}>
                                <div className={styles.emptyIcon}>🔔</div>
                                <div className={styles.emptyText}>No notifications</div>
                                <div className={styles.emptySubtext}>
                                    You'll see friend requests and messages here
                                </div>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`${styles.notificationViewRow} ${!notification.is_read ? styles.unread : ''}`}
                                    onClick={() => notification.type === 'new_message' && handleMessageNotificationClick(notification)}
                                    style={{ cursor: notification.type === 'new_message' ? 'pointer' : 'default' }}
                                >
                                    <div className={styles.notificationViewIcon}>
                                        {notification.type === 'friend_request' ? (
                                            <UserPlusIcon size={24} />
                                        ) : (
                                            <MessageBubbleIcon size={24} />
                                        )}
                                    </div>
                                    <div className={styles.notificationViewContent}>
                                        <div className={`${styles.notificationViewTitle} ${!notification.is_read ? styles.bold : ''}`}>
                                            {notification.title}
                                        </div>
                                        <div className={styles.notificationViewBody}>
                                            {notification.body}
                                        </div>
                                        <div className={styles.notificationViewTime}>
                                            {formatRelativeTime(notification.created_at)}
                                        </div>
                                        {notification.type === 'friend_request' && (
                                            <div className={styles.notificationViewActions}>
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={(e) => handleAcceptFriendRequest(e, notification.id, notification.related_id)}
                                                    loading={actionLoading === notification.id}
                                                    disabled={actionLoading !== null}
                                                >
                                                    Accept
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => handleDeclineFriendRequest(e, notification.id, notification.related_id)}
                                                    disabled={actionLoading !== null}
                                                    className={styles.declineButton}
                                                >
                                                    Decline
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ) : (
                // Normal Sidebar View
                <>
                    <div className={styles.logo}>Confessions</div>

                    <nav className={styles.nav}>
                        <NavLink
                            to="/"
                            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                            end
                        >
                            <HomeIcon size={24} />
                            <span>Global</span>
                        </NavLink>

                        <NavLink
                            to="/chat"
                            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                        >
                            <MessageCircleIcon size={24} />
                            <span>Anon Chat</span>
                        </NavLink>

                        <NavLink
                            to="/inbox"
                            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                        >
                            <EnvelopeIcon size={24} />
                            <span>Inbox</span>
                        </NavLink>

                        {/* Notification Button */}
                        <button
                            ref={notificationsBellRef}
                            className={styles.navItem}
                            onClick={() => setNotificationsOpen(true)}
                        >
                            <BellIcon size={24} />
                            <span>Notifications</span>
                            {unreadCount > 0 && (
                                <span className={styles.badge}>{unreadCount}</span>
                            )}
                        </button>

                        <div style={{ position: 'relative' }} data-dropdown="more">
                            <button
                                className={`${styles.navItem} ${moreOpen ? styles.active : ''}`}
                                onClick={() => setMoreOpen(!moreOpen)}
                            >
                                <MoreIcon size={24} />
                                <span>More</span>
                            </button>
                            <Dropdown
                                isOpen={moreOpen}
                                onClose={() => setMoreOpen(false)}
                                items={moreItems}
                                position="above"
                            />
                        </div>
                    </nav>

                    {user && (
                        <NavLink to={`/profile/${user.username}`} className={styles.userPill}>
                            <Avatar size="sm" avatarIndex={user.avatar_index} />
                            <div className={styles.userInfo}>
                                <div className={styles.displayName}>{user.display_name}</div>
                                <div className={styles.username}>@{user.username}</div>
                            </div>
                        </NavLink>
                    )}
                </>
            )}

            <BurnModal isOpen={burnModalOpen} onClose={() => setBurnModalOpen(false)} />
        </aside>
    );
}
