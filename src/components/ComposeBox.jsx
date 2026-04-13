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

    const handlePost = async () => {
        if (!text.trim()) return;

        setLoading(true);
        setError('');

        try {
            // Security pipeline
            const sanitized = sanitizeText(text);
            validateConfession(sanitized);
            await canUserPost(user.id);
            const contentHash = await hashContent(sanitized);
            const encrypted = encrypt(sanitized);

            // Insert confession with edit_window_expires_at timestamp (1 hour from now)
            const editWindowExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
            
            const { data, error: insertError } = await supabase
                .from('confessions')
                .insert({
                    user_id: user.id,
                    encrypted_content: encrypted,
                    content_hash: contentHash,
                    edit_window_expires_at: editWindowExpiresAt,
                    is_on_chain: false,
                })
                .select('*, users(display_name, username)')
                .single();

            if (insertError) throw insertError;

            recordPost(user.id);
            setText('');
            if (onPosted) onPosted(data);
        } catch (err) {
            setError(err.message || 'Failed to post confession');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.composeBox}>
            <Avatar size="md" />
            <div className={styles.content}>
                <Textarea
                    placeholder="What's happening?"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    maxLength={5000}
                    rows={3}
                    autoGrow
                    disabled={loading}
                />
                <div className={styles.footer}>
                    <span className={styles.charCount}>
                        {text.length}/5000
                    </span>
                    <Button
                        variant="primary"
                        size="md"
                        disabled={!text.trim() || loading}
                        loading={loading}
                        onClick={handlePost}
                    >
                        Post
                    </Button>
                </div>
                {error && <p className={styles.error}>{error}</p>}
            </div>
        </div>
    );
}
