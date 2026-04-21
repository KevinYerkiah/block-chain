import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from './ui/Avatar.jsx';
import ActionBar from './ActionBar.jsx';
import BlockchainTimer from './ui/BlockchainTimer.jsx';
import CommentSection from './CommentSection.jsx';
import { CONTENT_WARNING_TAGS } from './ComposeBox.jsx';
import styles from './ConfessionCard.module.css';

function formatRelativeTime(timestamp) {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diff = Math.floor((now - then) / 1000);

    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
}

export default function ConfessionCard({ confession, currentUserId, onOpenBlockchain }) {
    const navigate = useNavigate();
    const [showComments, setShowComments] = useState(false);
    const [localCommentCount, setLocalCommentCount] = useState(
        confession.comments_count || 0
    );
    // Content warning blur state — blurred by default if a tag is set
    const [revealed, setRevealed] = useState(false);

    // Decrypt content (currently just returns as-is since encryption is stubbed)
    const content = confession.encrypted_content || confession.content;

    // Resolve the tag metadata (if any)
    const warningTag = confession.content_warning
        ? CONTENT_WARNING_TAGS.find(t => t.id === confession.content_warning)
        : null;

    const isBlurred = warningTag && !revealed;

    const handleAvatarClick = () => {
        if (confession.users?.username) {
            navigate(`/profile/${confession.users.username}`);
        }
    };

    const handleUsernameClick = () => {
        if (confession.users?.username) {
            navigate(`/profile/${confession.users.username}`);
        }
    };
    
    return (
        <article className={styles.card}>
            <div className={styles.avatarWrapper} onClick={handleAvatarClick}>
                <Avatar size="md" avatarIndex={confession.users?.avatar_index} />
            </div>
            <div className={styles.content}>
                <div className={styles.header}>
                    <span className={styles.displayName} onClick={handleUsernameClick}>
                        {confession.users?.display_name}
                    </span>
                    <span className={styles.username} onClick={handleUsernameClick}>
                        @{confession.users?.username}
                    </span>
                    <span className={styles.separator}>·</span>
                    <span className={styles.time}>{formatRelativeTime(confession.created_at)}</span>

                    {/* Content warning badge shown in the header */}
                    {warningTag && (
                        <span
                            className={styles.cwBadge}
                            style={{ background: warningTag.color + '1a', color: warningTag.color, borderColor: warningTag.color + '44' }}
                        >
                            {warningTag.emoji} {warningTag.label}
                        </span>
                    )}
                </div>

                {/* Blurred content wrapper */}
                <div className={`${styles.bodyWrapper} ${isBlurred ? styles.blurred : ''}`}>
                    <p className={styles.body}>{content}</p>

                    {/* Overlay with "Show anyway" toggle — only visible when blurred */}
                    {isBlurred && (
                        <div className={styles.blurOverlay}>
                            <div className={styles.blurInfo}>
                                <span className={styles.blurIcon}>{warningTag.emoji}</span>
                                <span className={styles.blurLabel}>
                                    Content Warning: <strong>{warningTag.label}</strong>
                                </span>
                            </div>
                            <button
                                className={styles.revealBtn}
                                onClick={() => setRevealed(true)}
                                style={{ borderColor: warningTag.color, color: warningTag.color }}
                            >
                                Show anyway
                            </button>
                        </div>
                    )}
                </div>

                {/* Re-hide option once revealed */}
                {warningTag && revealed && (
                    <button
                        className={styles.hideAgainBtn}
                        onClick={() => setRevealed(false)}
                    >
                        🙈 Hide content
                    </button>
                )}

                <div className={styles.timerWrapper}>
                    <BlockchainTimer 
                        uploadAt={confession.edit_window_expires_at} 
                        isOnChain={confession.is_on_chain} 
                    />
                </div>
                <ActionBar
                    confessionId={confession.id}
                    commentCount={localCommentCount}
                    currentUserId={currentUserId}
                    isOnChain={confession.is_on_chain}
                    contentHash={confession.content_hash}
                    blockchainTxHash={confession.blockchain_tx_hash}
                    decryptedContent={content}
                    onCommentClick={() => setShowComments(prev => !prev)}
                    onShieldClick={onOpenBlockchain}
                />
                {showComments && (
                    <CommentSection
                        confessionId={confession.id}
                        currentUserId={currentUserId}
                        onCommentAdded={() => 
                            setLocalCommentCount((prev) => prev + 1)
                        }
                    />
                )}
            </div>

        </article>
    );
}
