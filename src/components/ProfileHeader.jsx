import Avatar from './ui/Avatar.jsx';
import Button from './ui/Button.jsx';
import Badge from './ui/Badge.jsx';
import styles from './ProfileHeader.module.css';

// User Plus icon for Add Friend
function UserPlusIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17C2 14.2386 4.23858 12 7 12H11C13.7614 12 16 14.2386 16 17" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15 7H18M16.5 5.5V8.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );
}

// Message icon
function MessageIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 5L10 10L18 5M2 5V15C2 15.5523 2.44772 16 3 16H17C17.5523 16 18 15.5523 18 15V5M2 5C2 4.44772 2.44772 4 3 4H17C17.5523 4 18 4.44772 18 5Z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );
}

export default function ProfileHeader({
    user,
    isOwnProfile,
    onEditProfile,
    onAddFriend,
    onMessage,
    onAcceptRequest,
    friendRequestStatus,
    friendActionLoading,
}) {
    const coverColor = user.cover_color || '#FFDDD2';
    
    return (
        <div className={styles.header}>
            <div className={styles.cover} style={{ backgroundColor: coverColor }} />
            <div className={styles.info}>
                <div className={styles.avatarRow}>
                    <Avatar size="lg" avatarIndex={user.avatar_index} />
                    {isOwnProfile ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onEditProfile}
                        >
                            Edit Profile
                        </Button>
                    ) : (
                        <div className={styles.actionButtons}>
                            {(!friendRequestStatus || friendRequestStatus === 'none') && (
                                <button
                                    className={styles.iconButton}
                                    onClick={onAddFriend}
                                    disabled={friendActionLoading}
                                    title="Add Friend"
                                >
                                    <UserPlusIcon size={20} />
                                </button>
                            )}
                            {friendRequestStatus === 'sent' && (
                                <button
                                    className={`${styles.iconButton} ${styles.disabled}`}
                                    disabled
                                    title="Request Sent"
                                >
                                    <UserPlusIcon size={20} />
                                </button>
                            )}
                            {friendRequestStatus === 'received' && (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={onAcceptRequest}
                                    loading={friendActionLoading}
                                >
                                    Accept Request
                                </Button>
                            )}
                            <button
                                className={styles.iconButton}
                                onClick={onMessage}
                                title="Message"
                            >
                                <MessageIcon size={20} />
                            </button>
                        </div>
                    )}
                </div>
                <div className={styles.details}>
                    <div className={styles.nameRow}>
                        <h1 className={styles.displayName}>{user.display_name}</h1>
                        {user.is_burned && <Badge variant="danger">Burned</Badge>}
                    </div>
                    <p className={styles.username}>@{user.username}</p>
                    {user.bio && <p className={styles.bio}>{user.bio}</p>}
                </div>
            </div>
        </div>
    );
}
