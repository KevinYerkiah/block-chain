import { supabase } from '../config/supabase.js';

// Client-side memory store: userId -> array of post timestamps
const clientPostTimes = new Map();

/**
 * Check whether the user is allowed to post.
 * Runs a client-side check first (cheap), then a server-side DB check.
 * Throws an Error with a user-readable message if the limit is exceeded.
 */
export async function canUserPost(userId) {
    // ── Client-side gate (in-memory, no network) ──
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const recentPosts = (clientPostTimes.get(userId) || []).filter((t) => t > oneHourAgo);

    if (recentPosts.length >= 10) {
        throw new Error('Rate limit: you can post up to 10 confessions per hour.');
    }

    // ── Server-side gate ──
    // Try RPC function first, fall back to direct query if it doesn't exist
    try {
        const { data, error } = await supabase.rpc('check_confession_rate_limit', {
            posting_user_id: userId,
        });

        // If RPC function exists and returns data
        if (!error && data !== null) {
            if (!data) {
                throw new Error('Rate limit: you can post up to 10 confessions per hour.');
            }
            return true;
        }

        // If RPC function doesn't exist (error code 42883), fall back to direct query
        if (error && error.code === '42883') {
            console.info('Rate limit function not found, using direct query');
        }
    } catch (err) {
        console.warn('RPC rate limit check failed, falling back to direct query:', err);
    }

    // Fallback: Query confessions table directly
    try {
        const { count, error } = await supabase
            .from('confessions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_deleted', false)
            .gte('created_at', new Date(oneHourAgo).toISOString());

        if (error) {
            console.warn('Direct rate limit check failed, using client-side only:', error);
            return true; // Allow post if server check fails
        }

        if (count >= 10) {
            throw new Error('Rate limit: you can post up to 10 confessions per hour.');
        }
    } catch (err) {
        console.warn('Rate limit check error:', err);
        // Continue with client-side check only
    }

    return true;
}

/**
 * Record a successful post in the client-side store.
 * Call this immediately after a successful confession insert.
 */
export function recordPost(userId) {
    const times = clientPostTimes.get(userId) || [];
    times.push(Date.now());
    clientPostTimes.set(userId, times);
}
