import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../config/supabase.js';
import { sanitizeText, validateConfession } from '../security/sanitize.js';
import { hashContent, encrypt } from '../security/hashIntegrity.js';
import { canUserPost, recordPost } from '../security/rateLimiter.js';
import Avatar from './ui/Avatar.jsx';
import Textarea from './ui/Textarea.jsx';
import Button from './ui/Button.jsx';
import styles from './ComposeBox.module.css';

// ─── Content Warning Tag definitions ────────────────────────────────────────
export const CONTENT_WARNING_TAGS = [
    { id: 'mental-health', label: 'Mental Health', emoji: '🧠', color: '#6366f1' },
    { id: 'violence',      label: 'Violence',      emoji: '⚠️',  color: '#ef4444' },
    { id: 'politics',      label: 'Politics',      emoji: '🗳️',  color: '#f59e0b' },
    { id: 'relationships', label: 'Relationships', emoji: '💔',  color: '#ec4899' },
    { id: 'substance',     label: 'Substance Use', emoji: '🚬',  color: '#8b5cf6' },
    { id: 'nsfw',          label: 'NSFW',          emoji: '🔞',  color: '#dc2626' },
];

export default function ComposeBox({ onPosted }) {
    const { user } = useAuth();
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [optInBlockchain, setOptInBlockchain] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    // Content warning state
    const [selectedTag, setSelectedTag] = useState(null);
    const [showTagPicker, setShowTagPicker] = useState(false);

    const handlePost = async () => {
        if (!text.trim()) return;

        setLoading(true);
        setError('');

        try {
            // Security pipeline
            const sanitized = sanitizeText(text);
            validateConfession(sanitized);
            
            // Check rate limit with graceful fallback
            try {
                await canUserPost(user.id);
            } catch (rateLimitError) {
                console.warn('Rate limit check failed, proceeding with post:', rateLimitError.message);
            }
            
            const contentHash = await hashContent(sanitized);
            const encrypted = encrypt(sanitized);

            // Set edit window based on blockchain opt-in
            // Blockchain: 2 minutes, DB-only: null (no edit window)
            const editWindowExpiresAt = optInBlockchain 
                ? new Date(Date.now() + 2 * 60 * 1000).toISOString()
                : null;
            
            const confessionData = {
                user_id: user.id,
                encrypted_content: encrypted,
                content_hash: contentHash,
                opt_in_blockchain: optInBlockchain || false,
                is_on_chain: false,
                content_warning: selectedTag || null,
            };

            // Only add edit_window_expires_at if blockchain is enabled
            if (optInBlockchain) {
                confessionData.edit_window_expires_at = editWindowExpiresAt;
            }
            
            const { data, error: insertError } = await supabase
                .from('confessions')
                .insert(confessionData)
                .select('*, users(display_name, username, avatar_index)')
                .single();

            if (insertError) {
                console.error('Insert error:', insertError);
                throw insertError;
            }

            recordPost(user.id);
            
            // Show success state
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 600);
            
            setText('');
            setOptInBlockchain(false);
            setSelectedTag(null);
            setShowTagPicker(false);
            setIsExpanded(false);
            setIsFocused(false);
            if (onPosted) onPosted(data);
        } catch (err) {
            setError(err.message || 'Failed to post confession');
        } finally {
            setLoading(false);
        }
    };

    const handleFocus = () => {
        setIsExpanded(true);
        setIsFocused(true);
    };

    const handleCancel = () => {
        if (!text.trim()) {
            setIsExpanded(false);
            setIsFocused(false);
        }
    };

    const handleTagSelect = (tagId) => {
        setSelectedTag(prev => prev === tagId ? null : tagId);
        setShowTagPicker(false);
    };

    const activeTag = CONTENT_WARNING_TAGS.find(t => t.id === selectedTag);

    return (
        <div className={styles.wrapper}>
            <div className={`${styles.composeCard} ${isExpanded ? styles.expanded : ''} ${isFocused ? styles.focused : ''} ${text.length > 0 && isFocused ? styles.typing : ''} ${showSuccess ? styles.success : ''}`}>
                <div className={styles.cardHeader}>
                    <Avatar size="md" avatarIndex={user?.avatar_index} />
                    <div className={styles.headerContent}>
                        <span className={styles.userName}>{user?.display_name}</span>
                        <span className={styles.userHandle}>@{user?.username}</span>
                    </div>
                </div>

                <div className={styles.cardBody}>
                    <Textarea
                        placeholder={isExpanded ? "Share your thoughts..." : "What's happening?"}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onFocus={handleFocus}
                        onBlur={handleCancel}
                        maxLength={5000}
                        rows={isExpanded ? 4 : 1}
                        autoGrow={isExpanded}
                        disabled={loading}
                        className={styles.textarea}
                    />

                    {/* Content Warning Tag picker — only shown when expanded */}
                    {isExpanded && (
                        <div className={styles.tagSection}>
                            <button
                                type="button"
                                className={`${styles.tagTrigger} ${activeTag ? styles.tagActive : ''}`}
                                style={activeTag ? { borderColor: activeTag.color, color: activeTag.color } : {}}
                                onClick={() => setShowTagPicker(prev => !prev)}
                                disabled={loading}
                            >
                                {activeTag
                                    ? <>{activeTag.emoji} {activeTag.label}</>
                                    : <>🏷️ Add Content Warning</>
                                }
                            </button>

                            {showTagPicker && (
                                <div className={styles.tagPicker}>
                                    <p className={styles.tagPickerHint}>Select a sensitivity label (optional)</p>
                                    <div className={styles.tagGrid}>
                                        {CONTENT_WARNING_TAGS.map(tag => (
                                            <button
                                                key={tag.id}
                                                type="button"
                                                className={`${styles.tagChip} ${selectedTag === tag.id ? styles.tagChipSelected : ''}`}
                                                style={selectedTag === tag.id ? { background: tag.color + '22', borderColor: tag.color, color: tag.color } : {}}
                                                onClick={() => handleTagSelect(tag.id)}
                                            >
                                                <span>{tag.emoji}</span>
                                                <span>{tag.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    {selectedTag && (
                                        <button
                                            type="button"
                                            className={styles.tagClear}
                                            onClick={() => { setSelectedTag(null); setShowTagPicker(false); }}
                                        >
                                            ✕ Remove warning
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className={styles.controls}>
                        <label className={styles.blockchainToggle}>
                            <input
                                type="checkbox"
                                checked={optInBlockchain}
                                onChange={(e) => setOptInBlockchain(e.target.checked)}
                                disabled={loading}
                                className={styles.checkbox}
                            />
                            <div className={styles.toggleContent}>
                                <div className={styles.toggleHeader}>
                                    <span className={styles.toggleIcon}>⛓</span>
                                    <span className={styles.checkboxLabel}>Blockchain</span>
                                </div>
                                {isExpanded && (
                                    <span className={styles.helperText}>
                                        Permanent • 2 min edit window
                                    </span>
                                )}
                            </div>
                        </label>

                        <div className={styles.actionButtons}>
                            {isExpanded && text.trim() && (
                                <Button
                                    variant="outline"
                                    size="md"
                                    onClick={() => {
                                        setText('');
                                        setOptInBlockchain(false);
                                        setSelectedTag(null);
                                        setShowTagPicker(false);
                                        setIsExpanded(false);
                                        setIsFocused(false);
                                    }}
                                    disabled={loading}
                                >
                                    Clear
                                </Button>
                            )}
                            <Button
                                variant="primary"
                                size="md"
                                disabled={!text.trim() || loading}
                                loading={loading}
                                onClick={handlePost}
                            >
                                {optInBlockchain ? '🔗 Post' : 'Post'}
                            </Button>
                        </div>
                    </div>

                    {isExpanded && (
                        <div className={styles.expandedFooter}>
                            <span className={`${styles.charCount} ${text.length > 4500 ? styles.danger : text.length > 4000 ? styles.warning : ''}`}>
                                {text.length} / 5000
                            </span>
                        </div>
                    )}

                    {error && <p className={styles.error}>{error}</p>}
                </div>
            </div>
        </div>
    );
}
