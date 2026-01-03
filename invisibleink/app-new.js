// Invisible Ink App - Public/Private Key Edition
// Fully serverless end-to-end encryption using TweetNaCl

// Initialize user keys on load
function initializeUser() {
    const keys = window.InvisibleInkCrypto.ensureKeyPair();
    const userId = window.InvisibleInkCrypto.generateUserId(keys.publicKey, keys.signingPublicKey);

    // Migrate old user ID if exists
    const oldUserId = localStorage.getItem('invisibleink_userId');
    if (oldUserId && oldUserId !== userId) {
        console.log('Migrating to new key-based system');
        localStorage.removeItem('invisibleink_userId');
    }

    return { keys, userId };
}

// Get contacts from localStorage
function getContacts() {
    const contacts = localStorage.getItem('invisibleink_contacts_v2');
    return contacts ? JSON.parse(contacts) : {};
}

// Save contacts to localStorage
function saveContacts(contacts) {
    localStorage.setItem('invisibleink_contacts_v2', JSON.stringify(contacts));
}

// Get messages for a contact
function getMessages(contactId) {
    const key = `invisibleink_messages_v2_${contactId}`;
    const messages = localStorage.getItem(key);
    return messages ? JSON.parse(messages) : [];
}

// Save messages for a contact
function saveMessages(contactId, messages) {
    const key = `invisibleink_messages_v2_${contactId}`;
    localStorage.setItem(key, JSON.stringify(messages));
}

// Parse URL for encrypted message
// New format: /invisibleink/senderId/encryptedMessage/nonce/signature?to=recipientId
function parseMessageUrl() {
    const path = window.location.pathname;
    const search = window.location.search;
    const parts = path.split('/').filter(p => p);

    // Expected format: invisibleink/senderId/encryptedMessage/nonce/signature
    if (parts.length >= 5 && parts[0] === 'invisibleink') {
        const urlParams = new URLSearchParams(search);
        return {
            senderId: parts[1],
            encryptedMessage: parts[2],
            nonce: parts[3],
            signature: parts[4],
            recipientId: urlParams.get('to') || null,
            replyToken: urlParams.get('reply') || null
        };
    }
    return null;
}

// Create encrypted message URL
function createMessageUrl(senderId, recipientId, message, senderKeys, replyToken = null) {
    // Extract recipient's public keys from their ID
    const { publicKey: recipientPublicKey } = window.InvisibleInkCrypto.parseUserId(recipientId);

    // Encrypt the message with recipient's public key
    const { encryptedMessage, nonce } = window.InvisibleInkCrypto.encryptMessage(
        message,
        recipientPublicKey,
        senderKeys.privateKey
    );

    // Sign the encrypted message to prove sender identity
    const signature = window.InvisibleInkCrypto.signMessage(
        encryptedMessage,
        senderKeys.signingPrivateKey
    );

    // Build URL
    let url = `${window.location.origin}/invisibleink/${senderId}/${encryptedMessage}/${nonce}/${signature}`;

    // Add recipient ID as query param (for UX - to show "not for you" error)
    if (recipientId !== 'ANYONE') {
        url += `?to=${encodeURIComponent(recipientId)}`;
    }

    // Add reply token if this is a reply
    if (replyToken) {
        url += recipientId !== 'ANYONE' ? '&' : '?';
        url += `reply=${replyToken}`;
    }

    return url;
}

// Handle incoming encrypted message
function handleIncomingMessage(messageData, userKeys, userId) {
    const { senderId, encryptedMessage, nonce, signature, recipientId, replyToken } = messageData;

    // Check if this message is for us (unless it's for ANYONE)
    if (recipientId && recipientId !== 'ANYONE' && recipientId !== userId) {
        document.body.innerHTML = `
            <div id="app">
                <header><h1>Invisible Ink</h1></header>
                <main>
                    <div class="error">
                        <p>This message is not for you.</p>
                        <a href="/invisibleink/${userId}">Go to your messages</a>
                    </div>
                </main>
            </div>
        `;
        return;
    }

    // Verify signature
    const { signingPublicKey: senderSigningKey } = window.InvisibleInkCrypto.parseUserId(senderId);
    const verifiedMessage = window.InvisibleInkCrypto.verifySignature(signature, senderSigningKey);

    if (!verifiedMessage) {
        document.body.innerHTML = `
            <div id="app">
                <header><h1>Invisible Ink</h1></header>
                <main>
                    <div class="error">
                        <h2>Invalid Signature</h2>
                        <p>This message could not be verified. It may have been tampered with.</p>
                        <a href="/invisibleink/${userId}">Go to your messages</a>
                    </div>
                </main>
            </div>
        `;
        return;
    }

    // Decrypt the message
    const { publicKey: senderPublicKey } = window.InvisibleInkCrypto.parseUserId(senderId);
    const decryptedMessage = window.InvisibleInkCrypto.decryptMessage(
        encryptedMessage,
        nonce,
        senderPublicKey,
        userKeys.privateKey
    );

    if (!decryptedMessage) {
        document.body.innerHTML = `
            <div id="app">
                <header><h1>Invisible Ink</h1></header>
                <main>
                    <div class="error">
                        <h2>Decryption Failed</h2>
                        <p>Could not decrypt this message. It may not be intended for you.</p>
                        <a href="/invisibleink/${userId}">Go to your messages</a>
                    </div>
                </main>
            </div>
        `;
        return;
    }

    // Save the message
    const messages = getMessages(senderId);
    messages.push({
        from: senderId,
        to: userId,
        message: decryptedMessage,
        timestamp: Date.now(),
        verified: true
    });
    saveMessages(senderId, messages);

    // Handle reply token (same logic as before)
    if (replyToken) {
        const sentMessages = JSON.parse(localStorage.getItem('invisibleink_sent_anonymous_v2') || '[]');
        const originalMessage = sentMessages.find(msg => msg.replyToken === replyToken);

        if (originalMessage) {
            const contacts = getContacts();
            if (!contacts[senderId]) {
                const displayId = window.InvisibleInkCrypto.getUserDisplayId(senderId);
                contacts[senderId] = `Reply from ${displayId}`;
                saveContacts(contacts);
            }

            const contactMessages = getMessages(senderId);
            contactMessages.push({
                from: originalMessage.from,
                to: senderId,
                message: originalMessage.message,
                timestamp: originalMessage.timestamp,
                sent: true
            });
            saveMessages(senderId, contactMessages);

            const updatedSentMessages = sentMessages.filter(msg => msg.replyToken !== replyToken);
            localStorage.setItem('invisibleink_sent_anonymous_v2', JSON.stringify(updatedSentMessages));
        }
    }

    // Add sender to contacts if not already there
    const contacts = getContacts();
    if (!contacts[senderId]) {
        const displayId = window.InvisibleInkCrypto.getUserDisplayId(senderId);
        contacts[senderId] = `Contact ${displayId}`;
        saveContacts(contacts);
    }

    // Display the message
    displayReceivedMessage(senderId, decryptedMessage, userId, replyToken);
}

// Show contact list
function showContactList(userId, userKeys) {
    const contacts = getContacts();
    const contactEntries = Object.entries(contacts);
    const pendingMessages = JSON.parse(localStorage.getItem('invisibleink_sent_anonymous_v2') || '[]');

    const displayId = window.InvisibleInkCrypto.getUserDisplayId(userId);
    const app = document.getElementById('app');
    app.innerHTML = `
        <header>
            <h1>Invisible Ink</h1>
            <p>Your ID: <code title="${userId}">${displayId}</code></p>
            <button onclick="showKeyManagement()">🔑 Manage Keys</button>
        </header>
        <main>
            <h2>Contacts</h2>
            ${contactEntries.length === 0 ?
                '<p>No contacts yet. Send a message to anyone to get started!</p>' :
                '<ul class="contact-list">' +
                contactEntries.map(([id, name]) => {
                    const displayContactId = window.InvisibleInkCrypto.getUserDisplayId(id);
                    return `
                        <li>
                            <a href="/invisibleink/${userId}/contact/${encodeURIComponent(id)}">
                                <strong>${name}</strong>
                                <small>${displayContactId}</small>
                            </a>
                        </li>
                    `;
                }).join('') +
                '</ul>'
            }
            ${pendingMessages.length > 0 ? `
                <h2>Pending Replies</h2>
                <ul class="contact-list">
                    ${pendingMessages.map(msg => `
                        <li>
                            <a href="javascript:void(0)" onclick="showPendingMessage('${msg.replyToken}', '${userId}')">
                                <strong>Awaiting reply...</strong>
                                <small>${new Date(msg.timestamp).toLocaleString()}</small>
                            </a>
                        </li>
                    `).join('')}
                </ul>
            ` : ''}
            <div class="compose">
                <h3>Send to Anyone</h3>
                <textarea id="anyoneMessageText" placeholder="Type your message..."></textarea>
                <button onclick="composeAnonymousMessage()">Create Message Link</button>
                <div id="anyoneMessageLink"></div>
            </div>
            <div class="add-contact">
                <h3>Add Contact</h3>
                <input type="text" id="contactId" placeholder="Paste contact's full ID">
                <input type="text" id="contactName" placeholder="Contact Name">
                <button onclick="addContact()">Add Contact</button>
            </div>
        </main>
    `;
}

// Show contact page
function showContactPage(contactId, userId) {
    const contacts = getContacts();
    const contactName = contacts[contactId] || 'Unknown Contact';
    const messages = getMessages(contactId);
    messages.sort((a, b) => a.timestamp - b.timestamp);

    const displayContactId = window.InvisibleInkCrypto.getUserDisplayId(contactId);

    const app = document.getElementById('app');
    app.innerHTML = `
        <header>
            <h1>Invisible Ink</h1>
            <a href="/invisibleink/${userId}">← Back to contacts</a>
        </header>
        <main>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <h2 style="margin: 0;">${contactName}</h2>
                <button onclick="editContactName('${contactId}', '${userId}')" style="font-size: 0.8em;">✏️ Edit</button>
            </div>
            <p><small title="${contactId}">ID: ${displayContactId}</small></p>

            <div class="messages">
                <h3>Messages</h3>
                ${messages.length === 0 ?
                    '<p>No messages yet</p>' :
                    messages.map(msg => `
                        <div class="message ${msg.from === userId || msg.sent ? 'sent' : 'received'}">
                            <p>${msg.message}</p>
                            <small>${new Date(msg.timestamp).toLocaleString()}</small>
                            ${msg.verified ? '<small style="color: green;">✓ Verified</small>' : ''}
                        </div>
                    `).join('')
                }
            </div>

            <div class="compose">
                <h3>Send Message</h3>
                <textarea id="messageText" placeholder="Type your message..."></textarea>
                <button onclick="composeMessage('${contactId}')">Create Message Link</button>
                <div id="messageLink"></div>
            </div>
        </main>
    `;
}

// Display received message
function displayReceivedMessage(senderId, message, userId, replyToken = null) {
    const contacts = getContacts();
    const contactName = contacts[senderId] || 'Unknown Contact';
    const displaySenderId = window.InvisibleInkCrypto.getUserDisplayId(senderId);

    const app = document.getElementById('app');
    app.innerHTML = `
        <header>
            <h1>Invisible Ink</h1>
        </header>
        <main>
            <div class="received-message">
                <h2>New Message ✓</h2>
                <p><strong>From:</strong> ${contactName}</p>
                <p><small title="${senderId}">${displaySenderId}</small></p>
                <div class="message-content">
                    <p>${message}</p>
                </div>
                <p style="color: green; font-size: 0.9em;">✓ Signature verified - sender confirmed</p>
                ${replyToken ? `
                    <div class="compose" style="margin-top: 20px;">
                        <h3>Reply</h3>
                        <textarea id="replyMessageText" placeholder="Type your reply..."></textarea>
                        <button onclick="sendReply('${senderId}', '${replyToken}')">Send Reply</button>
                        <div id="replyMessageLink"></div>
                    </div>
                ` : ''}
                <a href="/invisibleink/${userId}">View all messages</a>
            </div>
        </main>
    `;
}

// Show key management page
function showKeyManagement() {
    const keys = window.InvisibleInkCrypto.getKeyPair();
    const userId = window.InvisibleInkCrypto.generateUserId(keys.publicKey, keys.signingPublicKey);
    const displayId = window.InvisibleInkCrypto.getUserDisplayId(userId);

    const app = document.getElementById('app');
    app.innerHTML = `
        <header>
            <h1>Invisible Ink</h1>
            <a href="/invisibleink/${userId}">← Back to contacts</a>
        </header>
        <main>
            <h2>Key Management</h2>

            <div class="key-section">
                <h3>Your Public ID</h3>
                <p>Share this with others so they can send you encrypted messages:</p>
                <input type="text" value="${userId}" readonly onclick="this.select()" style="width: 100%; font-size: 0.8em;">
                <button onclick="copyToClipboard('${userId}')">Copy Full ID</button>
                <p><small>Short display: ${displayId}</small></p>
            </div>

            <div class="key-section">
                <h3>Backup Your Keys</h3>
                <p><strong>⚠️ Important:</strong> Save this backup somewhere safe. If you lose your keys, you cannot decrypt old messages.</p>
                <button onclick="exportKeysToFile()">Download Key Backup</button>
            </div>

            <div class="key-section">
                <h3>Restore Keys</h3>
                <p>Upload a previously saved key backup:</p>
                <input type="file" id="keyFileInput" accept=".json">
                <button onclick="importKeysFromFile()">Restore Keys</button>
            </div>

            <div class="key-section">
                <h3>Security Info</h3>
                <ul style="text-align: left; max-width: 600px; margin: 0 auto;">
                    <li>✅ Your private key never leaves your device</li>
                    <li>✅ Messages are end-to-end encrypted</li>
                    <li>✅ No server can read your messages</li>
                    <li>✅ Digital signatures verify sender identity</li>
                    <li>⚠️ Backup your keys - they cannot be recovered</li>
                    <li>⚠️ Anyone with your private key can read your messages</li>
                </ul>
            </div>
        </main>
    `;
}

// Compose message to contact
function composeMessage(receiverId) {
    const messageText = document.getElementById('messageText').value.trim();

    if (!messageText) {
        alert('Please enter a message');
        return;
    }

    const { keys, userId } = initializeUser();
    const linkDiv = document.getElementById('messageLink');
    linkDiv.innerHTML = '<p>Generating encrypted link...</p>';

    try {
        const messageUrl = createMessageUrl(userId, receiverId, messageText, keys);

        // Save the sent message
        const messages = getMessages(receiverId);
        messages.push({
            from: userId,
            to: receiverId,
            message: messageText,
            timestamp: Date.now(),
            sent: true
        });
        saveMessages(receiverId, messages);

        linkDiv.innerHTML = `
            <div class="message-url">
                <p><strong>Share this link:</strong></p>
                <input type="text" value="${messageUrl}" readonly onclick="this.select()">
                <button onclick="copyToClipboard('${messageUrl}')">Copy Link</button>
                <p><small>✓ Encrypted end-to-end - only recipient can read this</small></p>
            </div>
        `;

        document.getElementById('messageText').value = '';

        setTimeout(() => {
            showContactPage(receiverId, userId);
        }, 2000);
    } catch (error) {
        linkDiv.innerHTML = `
            <div class="error">
                <p>Error creating message link: ${error.message}</p>
            </div>
        `;
        console.error('Error creating message:', error);
    }
}

// Compose anonymous message
function composeAnonymousMessage() {
    const messageText = document.getElementById('anyoneMessageText').value.trim();

    if (!messageText) {
        alert('Please enter a message');
        return;
    }

    const { keys, userId } = initializeUser();
    const linkDiv = document.getElementById('anyoneMessageLink');
    linkDiv.innerHTML = '<p>Generating encrypted link...</p>';

    try {
        const replyToken = Date.now().toString(36) + Math.random().toString(36).substr(2);
        const messageUrl = createMessageUrl(userId, 'ANYONE', messageText, keys, replyToken);

        // Save sent anonymous message
        const sentMessages = JSON.parse(localStorage.getItem('invisibleink_sent_anonymous_v2') || '[]');
        sentMessages.push({
            from: userId,
            to: 'ANYONE',
            message: messageText,
            timestamp: Date.now(),
            messageUrl: messageUrl,
            replyToken: replyToken
        });
        localStorage.setItem('invisibleink_sent_anonymous_v2', JSON.stringify(sentMessages));

        linkDiv.innerHTML = `
            <div class="message-url">
                <p><strong>Share this link with anyone:</strong></p>
                <input type="text" value="${messageUrl}" readonly onclick="this.select()">
                <button onclick="copyToClipboard('${messageUrl}')">Copy Link</button>
                <p><small>✓ Anyone can decrypt this message and reply to you anonymously</small></p>
            </div>
        `;

        document.getElementById('anyoneMessageText').value = '';
    } catch (error) {
        linkDiv.innerHTML = `
            <div class="error">
                <p>Error creating message link: ${error.message}</p>
            </div>
        `;
        console.error('Error creating message:', error);
    }
}

// Send reply
function sendReply(originalSenderId, replyToken) {
    const messageText = document.getElementById('replyMessageText').value.trim();

    if (!messageText) {
        alert('Please enter a message');
        return;
    }

    const { keys, userId } = initializeUser();
    const linkDiv = document.getElementById('replyMessageLink');
    linkDiv.innerHTML = '<p>Generating encrypted link...</p>';

    try {
        const messageUrl = createMessageUrl(userId, originalSenderId, messageText, keys, replyToken);

        // Save the sent message
        const messages = getMessages(originalSenderId);
        messages.push({
            from: userId,
            to: originalSenderId,
            message: messageText,
            timestamp: Date.now(),
            sent: true,
            replyTo: replyToken
        });
        saveMessages(originalSenderId, messages);

        linkDiv.innerHTML = `
            <div class="message-url">
                <p><strong>Share this link:</strong></p>
                <input type="text" value="${messageUrl}" readonly onclick="this.select()">
                <button onclick="copyToClipboard('${messageUrl}')">Copy Link</button>
                <p><small>✓ Reply encrypted - only original sender can read this</small></p>
            </div>
        `;

        document.getElementById('replyMessageText').value = '';
    } catch (error) {
        linkDiv.innerHTML = `
            <div class="error">
                <p>Error creating reply link: ${error.message}</p>
            </div>
        `;
        console.error('Error creating reply:', error);
    }
}

// Add contact
function addContact() {
    const contactId = document.getElementById('contactId').value.trim();
    const contactName = document.getElementById('contactName').value.trim();

    if (!contactId || !contactName) {
        alert('Please enter both ID and name');
        return;
    }

    // Validate contact ID format
    try {
        window.InvisibleInkCrypto.parseUserId(contactId);
    } catch (error) {
        alert('Invalid contact ID format');
        return;
    }

    const contacts = getContacts();
    contacts[contactId] = contactName;
    saveContacts(contacts);

    const { userId } = initializeUser();
    showContactList(userId);
}

// Edit contact name
function editContactName(contactId, userId) {
    const contacts = getContacts();
    const currentName = contacts[contactId] || 'Unknown Contact';

    const newName = prompt(`Enter new name for contact:`, currentName);

    if (newName !== null && newName.trim() !== '') {
        contacts[contactId] = newName.trim();
        saveContacts(contacts);
        showContactPage(contactId, userId);
    }
}

// Show pending message
function showPendingMessage(replyToken, userId) {
    const pendingMessages = JSON.parse(localStorage.getItem('invisibleink_sent_anonymous_v2') || '[]');
    const msg = pendingMessages.find(m => m.replyToken === replyToken);

    if (!msg) {
        alert('Message not found');
        return;
    }

    const app = document.getElementById('app');
    app.innerHTML = `
        <header>
            <h1>Invisible Ink</h1>
            <a href="/invisibleink/${userId}">← Back to contacts</a>
        </header>
        <main>
            <h2>Pending Reply</h2>
            <p><small>Sent: ${new Date(msg.timestamp).toLocaleString()}</small></p>

            <div class="messages">
                <h3>Messages</h3>
                <div class="message sent">
                    <p>${msg.message}</p>
                    <small>${new Date(msg.timestamp).toLocaleString()}</small>
                </div>
                <p style="margin-top: 20px;"><em>Waiting for reply...</em></p>
            </div>

            <div class="message-url" style="margin-top: 20px;">
                <p><strong>Message Link:</strong></p>
                <input type="text" value="${msg.messageUrl}" readonly onclick="this.select()">
                <button onclick="copyToClipboard('${msg.messageUrl}')">Copy Link</button>
                <p><small>Share this link to receive a reply</small></p>
            </div>
        </main>
    `;
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Copied to clipboard!');
    });
}

// Export keys to file
function exportKeysToFile() {
    try {
        const keysJson = window.InvisibleInkCrypto.exportKeys();
        const blob = new Blob([keysJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invisibleink-keys-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        alert('Error exporting keys: ' + error.message);
    }
}

// Import keys from file
function importKeysFromFile() {
    const fileInput = document.getElementById('keyFileInput');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select a file');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const success = window.InvisibleInkCrypto.importKeys(e.target.result);
        if (success) {
            alert('Keys restored successfully! Refreshing...');
            window.location.href = '/invisibleink/';
        } else {
            alert('Failed to import keys. Please check the file format.');
        }
    };
    reader.readAsText(file);
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    const { keys, userId } = initializeUser();

    // Check if receiving a message
    const messageData = parseMessageUrl();
    if (messageData) {
        handleIncomingMessage(messageData, keys, userId);
        return;
    }

    // Routing
    const path = window.location.pathname;
    const pathParts = path.split('/').filter(p => p);

    // Root redirect
    if (path === '/invisibleink' || path === '/invisibleink/' || path === '/invisibleink/index.html') {
        window.location.href = userId;
        return;
    }

    // Check if viewing contact
    if (pathParts.length >= 4 && pathParts[0] === 'invisibleink' && pathParts[2] === 'contact') {
        const contactId = decodeURIComponent(pathParts[3]);
        showContactPage(contactId, userId);
        return;
    }

    // Default: show contact list
    showContactList(userId, keys);
});

// Make functions globally available
window.addContact = addContact;
window.editContactName = editContactName;
window.composeMessage = composeMessage;
window.composeAnonymousMessage = composeAnonymousMessage;
window.sendReply = sendReply;
window.copyToClipboard = copyToClipboard;
window.showPendingMessage = showPendingMessage;
window.showKeyManagement = showKeyManagement;
window.exportKeysToFile = exportKeysToFile;
window.importKeysFromFile = importKeysFromFile;
