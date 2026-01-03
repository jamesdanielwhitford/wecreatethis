// Cryptography Module for Invisible Ink
// Uses TweetNaCl for public/private key encryption and signatures
// No server required - all encryption happens client-side

/**
 * Key Management
 * Each user has a keypair stored in localStorage:
 * - Public key: shared with others, used to encrypt messages TO this user
 * - Private key: secret, used to decrypt messages FOR this user
 * - Signing key: used to sign messages (prove sender identity)
 */

// Base64 URL-safe encoding/decoding helpers
const base64UrlEncode = (bytes) => {
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const base64UrlDecode = (str) => {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    const binary = atob(str);
    return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
};

/**
 * Generate a new keypair for a user
 * @returns {object} - { publicKey, privateKey, signingPublicKey, signingPrivateKey }
 */
function generateKeyPair() {
    // Encryption keypair (X25519)
    const encryptionBox = nacl.box.keyPair();

    // Signing keypair (Ed25519)
    const signingBox = nacl.sign.keyPair();

    return {
        publicKey: base64UrlEncode(encryptionBox.publicKey),
        privateKey: base64UrlEncode(encryptionBox.secretKey),
        signingPublicKey: base64UrlEncode(signingBox.publicKey),
        signingPrivateKey: base64UrlEncode(signingBox.secretKey)
    };
}

/**
 * Store user's keypair in localStorage
 * WARNING: Private keys stored in localStorage can be read by browser extensions
 * For production, consider encrypting with a user password
 */
function storeKeyPair(keys) {
    localStorage.setItem('invisibleink_keys', JSON.stringify(keys));
}

/**
 * Retrieve user's keypair from localStorage
 * @returns {object|null} - Key object or null if not found
 */
function getKeyPair() {
    const stored = localStorage.getItem('invisibleink_keys');
    return stored ? JSON.parse(stored) : null;
}

/**
 * Get or generate keypair for current user
 * @returns {object} - User's keypair
 */
function ensureKeyPair() {
    let keys = getKeyPair();
    if (!keys) {
        keys = generateKeyPair();
        storeKeyPair(keys);
    }
    return keys;
}

/**
 * Encrypt a message for a specific recipient
 * Uses recipient's public key and sender's private key
 * @param {string} message - Plaintext message
 * @param {string} recipientPublicKey - Base64 encoded recipient public key
 * @param {string} senderPrivateKey - Base64 encoded sender private key
 * @returns {object} - { encryptedMessage, nonce } both base64 encoded
 */
function encryptMessage(message, recipientPublicKey, senderPrivateKey) {
    const messageBytes = new TextEncoder().encode(message);
    const nonce = nacl.randomBytes(nacl.box.nonceLength);

    const recipientPublicKeyBytes = base64UrlDecode(recipientPublicKey);
    const senderPrivateKeyBytes = base64UrlDecode(senderPrivateKey);

    const encrypted = nacl.box(
        messageBytes,
        nonce,
        recipientPublicKeyBytes,
        senderPrivateKeyBytes
    );

    if (!encrypted) {
        throw new Error('Encryption failed');
    }

    return {
        encryptedMessage: base64UrlEncode(encrypted),
        nonce: base64UrlEncode(nonce)
    };
}

/**
 * Decrypt a message using user's private key
 * @param {string} encryptedMessage - Base64 encoded encrypted message
 * @param {string} nonce - Base64 encoded nonce
 * @param {string} senderPublicKey - Base64 encoded sender public key
 * @param {string} recipientPrivateKey - Base64 encoded recipient private key
 * @returns {string|null} - Decrypted plaintext or null if decryption fails
 */
function decryptMessage(encryptedMessage, nonce, senderPublicKey, recipientPrivateKey) {
    try {
        const encryptedBytes = base64UrlDecode(encryptedMessage);
        const nonceBytes = base64UrlDecode(nonce);
        const senderPublicKeyBytes = base64UrlDecode(senderPublicKey);
        const recipientPrivateKeyBytes = base64UrlDecode(recipientPrivateKey);

        const decrypted = nacl.box.open(
            encryptedBytes,
            nonceBytes,
            senderPublicKeyBytes,
            recipientPrivateKeyBytes
        );

        if (!decrypted) {
            return null;
        }

        return new TextDecoder().decode(decrypted);
    } catch (error) {
        console.error('Decryption failed:', error);
        return null;
    }
}

/**
 * Sign a message to prove sender identity
 * @param {string} message - Message to sign
 * @param {string} signingPrivateKey - Base64 encoded signing private key
 * @returns {string} - Base64 encoded signature
 */
function signMessage(message, signingPrivateKey) {
    const messageBytes = new TextEncoder().encode(message);
    const signingKeyBytes = base64UrlDecode(signingPrivateKey);

    const signed = nacl.sign(messageBytes, signingKeyBytes);

    return base64UrlEncode(signed);
}

/**
 * Verify a signed message
 * @param {string} signedMessage - Base64 encoded signed message
 * @param {string} signingPublicKey - Base64 encoded signing public key
 * @returns {string|null} - Original message if valid, null if verification fails
 */
function verifySignature(signedMessage, signingPublicKey) {
    try {
        const signedBytes = base64UrlDecode(signedMessage);
        const publicKeyBytes = base64UrlDecode(signingPublicKey);

        const message = nacl.sign.open(signedBytes, publicKeyBytes);

        if (!message) {
            return null;
        }

        return new TextDecoder().decode(message);
    } catch (error) {
        console.error('Signature verification failed:', error);
        return null;
    }
}

/**
 * Generate a shareable user ID from public keys
 * Format: pubkey:signkey (both truncated for readability)
 * @param {string} publicKey - Base64 encoded public key
 * @param {string} signingPublicKey - Base64 encoded signing public key
 * @returns {string} - Compact user ID
 */
function generateUserId(publicKey, signingPublicKey) {
    // Use full keys for ID to ensure uniqueness
    return `${publicKey}:${signingPublicKey}`;
}

/**
 * Parse user ID to extract public keys
 * @param {string} userId - User ID string
 * @returns {object} - { publicKey, signingPublicKey }
 */
function parseUserId(userId) {
    const [publicKey, signingPublicKey] = userId.split(':');
    return { publicKey, signingPublicKey };
}

/**
 * Get display name for user ID (shortened for UI)
 * @param {string} userId - Full user ID
 * @returns {string} - Shortened display version
 */
function getUserDisplayId(userId) {
    const { publicKey } = parseUserId(userId);
    return publicKey.substring(0, 12) + '...';
}

/**
 * Export keypair for backup
 * @returns {string} - JSON string of keypair
 */
function exportKeys() {
    const keys = getKeyPair();
    if (!keys) {
        throw new Error('No keys to export');
    }
    return JSON.stringify(keys);
}

/**
 * Import keypair from backup
 * @param {string} keysJson - JSON string of keypair
 * @returns {boolean} - Success status
 */
function importKeys(keysJson) {
    try {
        const keys = JSON.parse(keysJson);
        // Validate keys have required fields
        if (!keys.publicKey || !keys.privateKey || !keys.signingPublicKey || !keys.signingPrivateKey) {
            throw new Error('Invalid key format');
        }
        storeKeyPair(keys);
        return true;
    } catch (error) {
        console.error('Import failed:', error);
        return false;
    }
}

// Export functions for use in app
window.InvisibleInkCrypto = {
    generateKeyPair,
    ensureKeyPair,
    getKeyPair,
    storeKeyPair,
    encryptMessage,
    decryptMessage,
    signMessage,
    verifySignature,
    generateUserId,
    parseUserId,
    getUserDisplayId,
    exportKeys,
    importKeys,
    base64UrlEncode,
    base64UrlDecode
};
