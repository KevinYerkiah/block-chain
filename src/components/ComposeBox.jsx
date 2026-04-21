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

export default function ComposeBox({ onPosted }) {
    const { user } = useAuth();
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [optInBlockchain, setOptInBlockchain] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

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
            
            const { data, error: insertError } = await supabase
                .from('confessions')
                .insert({
                    user_id: user.id,
                    encrypted_content: encrypted,
                    content_hash: contentHash,
                    opt_in_blockchain: optInBlockchain,
                    edit_window_expires_at: editWindowExpiresAt,
                    is_on_chain: false,
                })
                .select('*, users(display_name, username, avatar_index)')
                .single();

            if (insertError) throw insertError;

            recordPost(user.id);
            
            // Show success state
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 600);
            
            setText('');
            setOptInBlockchain(false);
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
