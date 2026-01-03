// Invisible Ink App
// Secure messaging with URL-based cipher system

// Generate a unique user ID based on timestamp + random
function generateUserId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `${timestamp}${random}`;
}

// Get or create user ID
function getUserId() {
    let userId = localStorage.getItem('invisibleink_userId');
    if (!userId) {
        userId = generateUserId();
        localStorage.setItem('invisibleink_userId', userId);
    }
    return userId;
}

// Get contacts from localStorage
function getContacts() {
    const contacts = localStorage.getItem('invisibleink_contacts');
    return contacts ? JSON.parse(contacts) : {};
}

// Save contacts to localStorage
function saveContacts(contacts) {
    localStorage.setItem('invisibleink_contacts', JSON.stringify(contacts));
}

// Get messages for a contact
function getMessages(contactId) {
    const key = `invisibleink_messages_${contactId}`;
    const messages = localStorage.getItem(key);
    return messages ? JSON.parse(messages) : [];
}

// Save messages for a contact
function saveMessages(contactId, messages) {
    const key = `invisibleink_messages_${contactId}`;
    localStorage.setItem(key, JSON.stringify(messages));
}

// Generate a unique cipher ID
function generateCipherId() {
    return Math.floor(Math.random() * 1000000000).toString(36) + Date.now().toString(36);
}

// URL encode text for safe transmission
function urlSafeEncode(text) {
    return encodeURIComponent(text);
}

// URL decode text
function urlSafeDecode(text) {
    return decodeURIComponent(text);
}

// Parse URL path for message
function parseMessageUrl() {
    const path = window.location.pathname;
    const parts = path.split('/').filter(p => p);

    // Expected format: invisibleink/senderid/receiverid/cipherid/ciphertext
    if (parts.length >= 5 && parts[0] === 'invisibleink') {
        return {
            senderId: parts[1],
            receiverId: parts[2],
            cipherId: parts[3],
            cipherText: urlSafeDecode(parts.slice(4).join('/'))
        };
    }
    return null;
}

// Create message URL with one-time cipher
async function createMessageUrl(senderId, receiverId, message) {
    // Generate unique cipher ID
    const cipherId = generateCipherId();

    // Generate shuffled alphabet for this message
    const cipherMap = window.InvisibleInkAPI.generateShuffledAlphabet();

    // Encode the message with this cipher map
    const encodedMessage = window.InvisibleInkAPI.encodeWithMap(message, cipherMap);

    // Store the cipher map in the database
    const stored = await window.InvisibleInkAPI.storeCipherKey(cipherId, cipherMap);

    if (!stored) {
        throw new Error('Failed to store cipher key');
    }

    // Create URL with cipher ID (not the cipher itself!)
    const encoded = urlSafeEncode(encodedMessage);
    return `${window.location.origin}/invisibleink/${senderId}/${receiverId}/${cipherId}/${encoded}`;
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    const userId = getUserId();
    const path = window.location.pathname;

    // Check if we're receiving a message
    const messageData = parseMessageUrl();
    if (messageData) {
        handleIncomingMessage(messageData, userId);
        return;
    }

    // Redirect to user's homepage if at root
    if (path === '/invisibleink' || path === '/invisibleink/' || path === '/invisibleink/index.html') {
        window.location.href = userId; // Relative to <base href="/invisibleink/">
        return;
    }

    // Check if viewing a specific user page
    const pathParts = path.split('/').filter(p => p);
    if (pathParts.length >= 2 && pathParts[0] === 'invisibleink') {
        const viewingUserId = pathParts[1];

        // Check if viewing a contact: /invisibleink/userId/contact/contactId
        if (pathParts.length >= 4 && pathParts[2] === 'contact') {
            const contactId = pathParts[3];
            showContactPage(contactId, userId);
            return;
        }

        // If viewing own page, show contact list
        if (viewingUserId === userId) {
            showContactList(userId);
        } else {
            // Viewing someone else's page - treat as contact page
            showContactPage(viewingUserId, userId);
        }
        return;
    }

    // Default: show contact list
    showContactList(userId);
});

// Handle incoming message from URL with one-time cipher
async function handleIncomingMessage(messageData, userId) {
    const { senderId, receiverId, cipherId, cipherText } = messageData;

    // Handle "ANYONE" receiver - message can be opened by anyone
    if (receiverId === 'ANYONE') {
        // If user has no ID yet (first visit), assign them one
        if (!localStorage.getItem('invisibleink_userId')) {
            const newUserId = generateUserId();
            localStorage.setItem('invisibleink_userId', newUserId);
            userId = newUserId;
        }
        // Continue to show message - anyone can view
    } else if (receiverId !== userId) {
        // Specific receiver - check if this message is for us
        // If user has no ID yet (first visit), set them as the receiver
        if (!localStorage.getItem('invisibleink_userId')) {
            localStorage.setItem('invisibleink_userId', receiverId);
            userId = receiverId;
            // Continue to show message
        } else {
            // Message not for this user
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
    }

    // Try to retrieve the cipher key from database
    const cipherMap = await window.InvisibleInkAPI.getCipherKey(cipherId);

    if (!cipherMap) {
        // Cipher key doesn't exist - either already used or expired
        document.body.innerHTML = `
            <div id="app">
                <header><h1>Invisible Ink</h1></header>
                <main>
                    <div class="error">
                        <h2>Link Expired</h2>
                        <p>This message link has already been used or has expired.</p>
                        <a href="/invisibleink/${userId}">Go to your messages</a>
                    </div>
                </main>
            </div>
        `;
        return;
    }

    // Decode the message using the retrieved cipher map
    const message = window.InvisibleInkAPI.decodeWithMap(cipherText, cipherMap);

    // Save the message
    const messages = getMessages(senderId);
    messages.push({
        from: senderId,
        to: receiverId,
        message: message,
        timestamp: Date.now(),
        cipherId: cipherId
    });
    saveMessages(senderId, messages);

    // Add sender to contacts if not already there
    const contacts = getContacts();
    if (!contacts[senderId]) {
        contacts[senderId] = `Contact ${Object.keys(contacts).length + 1}`;
        saveContacts(contacts);
    }

    // Display the message
    displayReceivedMessage(senderId, message, userId);
}

// Show contact list
function showContactList(userId) {
    const contacts = getContacts();
    const contactEntries = Object.entries(contacts);

    const app = document.getElementById('app');
    app.innerHTML = `
        <header>
            <h1>Invisible Ink</h1>
            <p>Your ID: <code>${userId}</code></p>
        </header>
        <main>
            <h2>Contacts</h2>
            ${contactEntries.length === 0 ?
                '<p>No contacts yet. Send a message to anyone to get started!</p>' :
                '<ul class="contact-list">' +
                contactEntries.map(([id, name]) => `
                    <li>
                        <a href="/invisibleink/${userId}/contact/${id}">
                            <strong>${name}</strong>
                            <small>${id}</small>
                        </a>
                    </li>
                `).join('') +
                '</ul>'
            }
            <div class="compose">
                <h3>Send to Anyone</h3>
                <textarea id="anyoneMessageText" placeholder="Type your message..."></textarea>
                <button onclick="composeAnonymousMessage('${userId}')">Create Message Link</button>
                <div id="anyoneMessageLink"></div>
            </div>
            <div class="add-contact">
                <h3>Add Contact</h3>
                <input type="text" id="contactId" placeholder="Contact ID">
                <input type="text" id="contactName" placeholder="Contact Name">
                <button onclick="addContact()">Add Contact</button>
            </div>
        </main>
    `;
}

// Add a new contact
function addContact() {
    const contactId = document.getElementById('contactId').value.trim();
    const contactName = document.getElementById('contactName').value.trim();

    if (!contactId || !contactName) {
        alert('Please enter both ID and name');
        return;
    }

    const contacts = getContacts();
    contacts[contactId] = contactName;
    saveContacts(contacts);

    const userId = getUserId();
    showContactList(userId);
}

// Show contact page with messages
function showContactPage(contactId, userId) {
    const contacts = getContacts();
    const contactName = contacts[contactId] || 'Unknown Contact';
    const messages = getMessages(contactId);

    const app = document.getElementById('app');
    app.innerHTML = `
        <header>
            <h1>Invisible Ink</h1>
            <a href="/invisibleink/${userId}">← Back to contacts</a>
        </header>
        <main>
            <h2>${contactName}</h2>
            <p><small>ID: ${contactId}</small></p>

            <div class="messages">
                <h3>Messages</h3>
                ${messages.length === 0 ?
                    '<p>No messages yet</p>' :
                    messages.map(msg => `
                        <div class="message ${msg.from === userId ? 'sent' : 'received'}">
                            <p>${msg.message}</p>
                            <small>${new Date(msg.timestamp).toLocaleString()}</small>
                        </div>
                    `).join('')
                }
            </div>

            <div class="compose">
                <h3>Send Message</h3>
                <textarea id="messageText" placeholder="Type your message..."></textarea>
                <button onclick="composeMessage('${contactId}', '${userId}')">Create Message Link</button>
                <div id="messageLink"></div>
            </div>
        </main>
    `;
}

// Compose and create message link with one-time cipher
async function composeMessage(receiverId, senderId) {
    const messageText = document.getElementById('messageText').value.trim();

    if (!messageText) {
        alert('Please enter a message');
        return;
    }

    const linkDiv = document.getElementById('messageLink');
    linkDiv.innerHTML = '<p>Generating secure link...</p>';

    try {
        const messageUrl = await createMessageUrl(senderId, receiverId, messageText);

        // Save the sent message to local history
        const messages = getMessages(receiverId);
        messages.push({
            from: senderId,
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
                <p><small>Note: This link can only be viewed once and expires in 30 days.</small></p>
            </div>
        `;

        // Clear the textarea
        document.getElementById('messageText').value = '';

        // Refresh the contact page to show the new message
        setTimeout(() => {
            showContactPage(receiverId, senderId);
        }, 2000);
    } catch (error) {
        linkDiv.innerHTML = `
            <div class="error">
                <p>Error creating message link. Please check your Supabase configuration.</p>
            </div>
        `;
        console.error('Error creating message:', error);
    }
}

// Compose anonymous message (send to anyone)
async function composeAnonymousMessage(senderId) {
    const messageText = document.getElementById('anyoneMessageText').value.trim();

    if (!messageText) {
        alert('Please enter a message');
        return;
    }

    const linkDiv = document.getElementById('anyoneMessageLink');
    linkDiv.innerHTML = '<p>Generating secure link...</p>';

    try {
        const messageUrl = await createMessageUrl(senderId, 'ANYONE', messageText);

        // Save to a special "pending" contact for anonymous messages
        const messages = getMessages('ANYONE');
        messages.push({
            from: senderId,
            to: 'ANYONE',
            message: messageText,
            timestamp: Date.now(),
            sent: true,
            messageUrl: messageUrl
        });
        saveMessages('ANYONE', messages);

        // Add ANYONE to contacts if not already there
        const contacts = getContacts();
        if (!contacts['ANYONE']) {
            contacts['ANYONE'] = 'Pending Messages';
            saveContacts(contacts);
        }

        linkDiv.innerHTML = `
            <div class="message-url">
                <p><strong>Share this link with anyone:</strong></p>
                <input type="text" value="${messageUrl}" readonly onclick="this.select()">
                <button onclick="copyToClipboard('${messageUrl}')">Copy Link</button>
                <p><small>Note: This link can only be viewed once and expires in 30 days.</small></p>
            </div>
        `;

        // Clear the textarea
        document.getElementById('anyoneMessageText').value = '';

        // Refresh to show the new contact
        setTimeout(() => {
            showContactList(senderId);
        }, 2000);
    } catch (error) {
        linkDiv.innerHTML = `
            <div class="error">
                <p>Error creating message link. Please check your Supabase configuration.</p>
            </div>
        `;
        console.error('Error creating message:', error);
    }
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Link copied to clipboard!');
    });
}

// Display received message
function displayReceivedMessage(senderId, message, userId) {
    const contacts = getContacts();
    const contactName = contacts[senderId] || 'Unknown Contact';

    const app = document.getElementById('app');
    app.innerHTML = `
        <header>
            <h1>Invisible Ink</h1>
        </header>
        <main>
            <div class="received-message">
                <h2>New Message</h2>
                <p><strong>From:</strong> ${contactName} (${senderId})</p>
                <div class="message-content">
                    <p>${message}</p>
                </div>
                <a href="/invisibleink/${userId}">View all messages</a>
            </div>
        </main>
    `;
}

// Make functions globally available
window.addContact = addContact;
window.composeMessage = composeMessage;
window.composeAnonymousMessage = composeAnonymousMessage;
window.copyToClipboard = copyToClipboard;
