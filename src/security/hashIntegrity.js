/**
 * Compute a SHA-256 hash of a string using the Web Crypto API.
 * Returns the hex-encoded digest.
 */
export async function hashContent(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compare computed hash of content against a stored hash.
 * Returns true if they match (integrity verified).
 */
export async function verifyIntegrity(content, storedHash) {
    const computedHash = await hashContent(content);
    return computedHash === storedHash;
}

/**
 * Stub: verify content against the blockchain.
 * TODO: Blockchain team — replace with actual on-chain hash lookup.
 */
export async function verifyBlockchainIntegrity(blockchainTxHash, content) {
    // TODO: Blockchain team — fetch the stored hash from the chain using blockchainTxHash
    // and compare with hashContent(content).
    console.warn('verifyBlockchainIntegrity is a stub — blockchain integration pending.');
    return { verified: null, message: 'Blockchain verification pending — awaiting integration.' };
}

/**
 * Stub: encrypt content with DH key exchange.
 * TODO: Blockchain team — replace with actual DH encryption.
 */
export function encrypt(plaintext) {
    // TODO: Blockchain team — implement DH encryption.
    return plaintext;
}
