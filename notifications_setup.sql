-- PART 1: Create notifications table
CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(30) NOT NULL CHECK (type IN ('friend_request', 'new_message')),
    title       TEXT NOT NULL,
    body        TEXT,
    related_id  UUID,
    is_read     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "notifications_select_own"
ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notifications_delete_own"
ON notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Index for performance
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- Function to auto-insert notification when friend request is sent
CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE 
    sender_name TEXT;
BEGIN
    SELECT display_name INTO sender_name FROM users WHERE id = NEW.sender_id;
    
    INSERT INTO notifications (user_id, type, title, body, related_id)
    VALUES (NEW.receiver_id, 'friend_request', 'Friend Request', sender_name || ' sent you a friend request', NEW.id);
    
    RETURN NEW;
END;
$$;

-- Trigger for friend requests
CREATE TRIGGER on_friend_request_insert
AFTER INSERT ON friend_requests
FOR EACH ROW EXECUTE FUNCTION notify_friend_request();

-- Function to auto-insert notification when direct message is sent
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE 
    sender_name TEXT;
    receiver_id UUID;
BEGIN
    SELECT display_name INTO sender_name FROM users WHERE id = NEW.sender_id;
    
    SELECT CASE 
        WHEN user_a = NEW.sender_id THEN user_b 
        ELSE user_a 
    END INTO receiver_id 
    FROM conversations 
    WHERE id = NEW.conversation_id;
    
    INSERT INTO notifications (user_id, type, title, body, related_id)
    VALUES (receiver_id, 'new_message', 'New Message', sender_name || ': ' || LEFT(NEW.content, 60), NEW.conversation_id);
    
    RETURN NEW;
END;
$$;

-- Trigger for direct messages
CREATE TRIGGER on_direct_message_insert
AFTER INSERT ON direct_messages
FOR EACH ROW EXECUTE FUNCTION notify_new_message();
