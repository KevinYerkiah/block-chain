import { ethers } from 'ethers';
import { supabase } from '../config/supabase.js';
import ConfessionRegistryABI from '../abi/ConfessionRegistry.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const RPC_URL = import.meta.env.VITE_ALCHEMY_RPC_URL;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function uuidToBytes32(uuid) {
    const hex = uuid.replace(/-/g, '');
    return '0x' + hex.padEnd(64, '0');
}

function hashToBytes32(hash) {
    const clean = hash.startsWith('0x') ? hash.slice(2) : hash;
    if (clean.length !== 64) {
        throw new Error(`Invalid hash length: ${clean.length}, expected 64 hex chars`);
    }
    return '0x' + clean;
}

function getReadProvider() {
    return new ethers.JsonRpcProvider(RPC_URL);
}

function getReadContract() {
    const provider = getReadProvider();
    return new ethers.Contract(CONTRACT_ADDRESS, ConfessionRegistryABI, provider);
}

// ─────────────────────────────────────────────────────────────
// WRITE OPERATIONS (server-side via Supabase Edge Function)
// ─────────────────────────────────────────────────────────────

export async function storeConfessionOnChain(confessionId, contentHash) {
    try {
        const { data, error } = await supabase.functions.invoke('blockchain-write', {
            body: { action: 'storeConfession', confessionId, contentHash },
        });
        if (error) return { success: false, error: error.message };
        return data;
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function storeUserOnChain(userId, username) {
    try {
        const { data, error } = await supabase.functions.invoke('blockchain-write', {
            body: { action: 'storeUser', userId, username },
        });
        if (error) return { success: false, error: error.message };
        return data;
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ─────────────────────────────────────────────────────────────
// READ OPERATIONS (no wallet needed — uses Alchemy directly)
// ─────────────────────────────────────────────────────────────

export async function verifyConfessionOnChain(confessionId, contentHash) {
    try {
        const contract = getReadContract();
        const isOnChain = await contract.isConfessionOnChain(uuidToBytes32(confessionId));

        if (!isOnChain) {
            return { verified: false, onChain: false };
        }

        const verified = await contract.verifyConfession(
            uuidToBytes32(confessionId),
            hashToBytes32(contentHash)
        );
        return { verified, onChain: true };
    } catch (err) {
        console.error('verifyConfessionOnChain error:', err);
        return { verified: false, onChain: false, error: err.message };
    }
}

export async function getConfessionFromChain(confessionId) {
    try {
        const contract = getReadContract();
        const isOnChain = await contract.isConfessionOnChain(uuidToBytes32(confessionId));

        if (!isOnChain) {
            return { found: false };
        }

        const [contentHash, timestamp] = await contract.getConfession(uuidToBytes32(confessionId));
        return {
            found: true,
            contentHash,
            timestamp: Number(timestamp),
        };
    } catch (err) {
        console.error('getConfessionFromChain error:', err);
        return { found: false, error: err.message };
    }
}

export async function isConfessionOnChain(confessionId) {
    try {
        const contract = getReadContract();
        return await contract.isConfessionOnChain(uuidToBytes32(confessionId));
    } catch (err) {
        return false;
    }
}
