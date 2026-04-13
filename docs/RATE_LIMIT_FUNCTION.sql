-- ============================================================================
-- OPTIONAL: Rate Limit Function for Confessions
-- ============================================================================
-- This function provides server-side rate limiting for confession posts.
-- The frontend will work without this (using client-side + direct query),
-- but this provides an additional security layer.
--
-- Run this in Supabase SQL Editor if you want the extra protection.
-- ============================================================================

CREATE OR REPLACE FUNCTION check_confession_rate_limit(posting_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    post_count INTEGER;
    one_hour_ago TIMESTAMPTZ;
BEGIN
    -- Calculate timestamp for 1 hour ago
    one_hour_ago := NOW() - INTERVAL '1 hour';
    
    -- Count confessions by this user in the last hour
    SELECT COUNT(*)
    INTO post_count
    FROM confessions
    WHERE user_id = posting_user_id
      AND created_at >= one_hour_ago
      AND is_deleted = FALSE;
    
    -- Return TRUE if under limit (10 posts per hour), FALSE if over
    RETURN post_count < 10;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_confession_rate_limit(UUID) TO authenticated;

-- ============================================================================
-- USAGE
-- ============================================================================
-- The frontend will call this via:
--   supabase.rpc('check_confession_rate_limit', { posting_user_id: userId })
--
-- Returns:
--   TRUE  - User can post (under 10 posts in last hour)
--   FALSE - User cannot post (at or over limit)
-- ============================================================================
