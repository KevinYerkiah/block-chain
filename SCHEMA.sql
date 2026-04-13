-- ============================================================================
-- CONFESSION PLATFORM — COMPLETE DATABASE SCHEMA
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================
-- WARNING: This drops ALL existing tables. Only run on a fresh start.
-- ============================================================================


-- ========================
-- DROP EXISTING TABLES (order matters due to foreign keys)
-- ========================

DROP TABLE IF EXISTS confession_edits CASCADE;
DROP TABLE IF EXISTS blockchain_sync_log CASCADE;
DROP TABLE IF EXISTS temporal_records CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS confessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;


-- ========================
-- 1. USERS
-- ========================
-- Mirrored to blockchain. BURN deletes this row, which cascades everything.

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    bio VARCHAR(300),                              -- was missing in original
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    dh_public_key TEXT NOT NULL,
    blockchain_tx_hash TEXT,
    is_burned BOOLEAN DEFAULT FALSE,
    burned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()           -- was missing in original
);


-- ========================
-- 2. CONFESSIONS
-- ========================
-- CASCADE from users: when a user burns, all their confessions are purged from DB.
-- Blockchain still has them — that's the whole point.

CREATE TABLE confessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    encrypted_content TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    blockchain_tx_hash TEXT,
    is_on_chain BOOLEAN DEFAULT FALSE,
    edit_window_expires_at TIMESTAMPTZ NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ========================
-- 3. COMMENTS
-- ========================
-- CASCADE from confessions: confession purged → its comments go too.
-- CASCADE from users: commenter burns → their comments everywhere are purged.

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    confession_id UUID REFERENCES confessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    encrypted_content TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    blockchain_tx_hash TEXT,
    is_on_chain BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ========================
-- 4. VOTES (DB only, never on blockchain)
-- ========================

CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    confession_id UUID NOT NULL REFERENCES confessions(id) ON DELETE CASCADE,
    vote_type SMALLINT NOT NULL CHECK (vote_type IN (-1, 1)),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, confession_id)
);


-- ========================
-- 5. BLOCKCHAIN SYNC LOG (audit trail)
-- ========================

CREATE TABLE blockchain_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('user', 'confession', 'comment')),
    entity_id UUID NOT NULL,
    tx_hash TEXT NOT NULL,
    block_number BIGINT,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed'))
);


-- ========================
-- 6. TEMPORAL RECORDS (ghost profiles of burned accounts)
-- ========================
-- Populated during the BURN transaction before the user row is deleted.
-- Lets the Temporal search find burned usernames and link to blockchain data.

CREATE TABLE temporal_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_user_id UUID NOT NULL,
    username VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    blockchain_tx_hash TEXT,
    burned_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ========================
-- 7. CONFESSION EDITS (tracks changes within the 1-hour window)
-- ========================
-- Now stores the hash of the previous version too, so the Temporal view
-- can verify unedited content against the blockchain independently.

CREATE TABLE confession_edits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    confession_id UUID NOT NULL REFERENCES confessions(id) ON DELETE CASCADE,
    previous_encrypted_content TEXT NOT NULL,
    previous_content_hash TEXT NOT NULL,             -- was missing in original
    edited_at TIMESTAMPTZ DEFAULT NOW()
);


-- ========================
-- 8. INDEXES
-- ========================

CREATE INDEX idx_confessions_user_id ON confessions(user_id);
CREATE INDEX idx_confessions_created_at ON confessions(created_at DESC);
CREATE INDEX idx_confessions_not_deleted ON confessions(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX idx_comments_confession_id ON comments(confession_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_votes_confession_id ON votes(confession_id);
CREATE INDEX idx_votes_user_confession ON votes(user_id, confession_id);
CREATE INDEX idx_temporal_username ON temporal_records(username);
CREATE INDEX idx_sync_log_entity ON blockchain_sync_log(entity_type, entity_id);
