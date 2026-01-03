// API Interface for Cipher Key Storage using Supabase
// This module handles communication with Supabase database

// Supabase Configuration
const SUPABASE_CONFIG = {
    url: 'https://fzgtgofpdnvkenjxomsj.supabase.co',
    anonKey: 'sb_publishable_Ogfg3hTWzuJziglTYJHjFA_lNqnsyB7',
    tableName: 'cipher_keys'
};

/**
 * Initialize Supabase client (using CDN version)
 * Make sure to include Supabase JS library in your HTML
 */
function getSupabaseClient() {
    if (typeof supabase === 'undefined') {
        console.error('Supabase library not loaded. Include it in your HTML.');
        return null;
    }
    return supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
}

/**
 * Store a cipher key in Supabase
 * @param {string} cipherId - Unique ID for this cipher
 * @param {object} cipherMap - The shuffled alphabet/character mapping
 * @returns {Promise<boolean>} - Success status
 */
async function storeCipherKey(cipherId, cipherMap) {
    try {
        const client = getSupabaseClient();
        if (!client) return false;

        const { data, error } = await client
            .from(SUPABASE_CONFIG.tableName)
            .insert([
                {
                    id: cipherId,
                    cipher_map: cipherMap,
                    created_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString()
                }
            ]);

        if (error) {
            console.error('Error storing cipher key:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error storing cipher key:', error);
        return false;
    }
}

/**
 * Retrieve a cipher key from Supabase and delete it
 * This is a one-time operation - the key is deleted after retrieval
 * @param {string} cipherId - The cipher ID to retrieve
 * @returns {Promise<object|null>} - The cipher map or null if not found
 */
async function getCipherKey(cipherId) {
    try {
        const client = getSupabaseClient();
        if (!client) return null;

        // First, retrieve the cipher
        const { data, error } = await client
            .from(SUPABASE_CONFIG.tableName)
            .select('cipher_map')
            .eq('id', cipherId)
            .single();

        if (error || !data) {
            console.error('Error retrieving cipher key:', error);
            return null;
        }

        // Immediately delete the cipher after retrieval
        await deleteCipherKey(cipherId);

        return data.cipher_map;
    } catch (error) {
        console.error('Error retrieving cipher key:', error);
        return null;
    }
}

/**
 * Delete a cipher key from Supabase
 * @param {string} cipherId - The cipher ID to delete
 * @returns {Promise<boolean>} - Success status
 */
async function deleteCipherKey(cipherId) {
    try {
        const client = getSupabaseClient();
        if (!client) return false;

        const { error } = await client
            .from(SUPABASE_CONFIG.tableName)
            .delete()
            .eq('id', cipherId);

        if (error) {
            console.error('Error deleting cipher key:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error deleting cipher key:', error);
        return false;
    }
}

/**
 * Generate a random shuffled character map for encoding
 * Creates a mapping of each character to a random character
 * @returns {object} - Character mapping object
 */
function generateShuffledAlphabet() {
    // All printable ASCII characters
    const chars = [];
    for (let i = 32; i <= 126; i++) {
        chars.push(String.fromCharCode(i));
    }

    // Create a shuffled copy
    const shuffled = [...chars];

    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Create mapping object
    const mapping = {};
    chars.forEach((char, index) => {
        mapping[char] = shuffled[index];
    });

    return mapping;
}

/**
 * Encode text using a character mapping
 * @param {string} text - Text to encode
 * @param {object} cipherMap - Character mapping
 * @returns {string} - Encoded text
 */
function encodeWithMap(text, cipherMap) {
    let encoded = '';
    for (let char of text) {
        encoded += cipherMap[char] || char;
    }
    return encoded;
}

/**
 * Decode text using a character mapping
 * @param {string} encodedText - Encoded text
 * @param {object} cipherMap - Character mapping
 * @returns {string} - Decoded text
 */
function decodeWithMap(encodedText, cipherMap) {
    // Create reverse mapping
    const reverseMap = {};
    for (let [key, value] of Object.entries(cipherMap)) {
        reverseMap[value] = key;
    }

    let decoded = '';
    for (let char of encodedText) {
        decoded += reverseMap[char] || char;
    }
    return decoded;
}

// Export functions for use in app.js
window.InvisibleInkAPI = {
    storeCipherKey,
    getCipherKey,
    deleteCipherKey,
    generateShuffledAlphabet,
    encodeWithMap,
    decodeWithMap
};
