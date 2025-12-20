// Metadata editor component - edit file metadata
import { getFile, updateMetadata } from '../db.js';
import { formatDate } from '../utils.js';
import { renderAssets } from './assetView.js';

let currentFileId = null;
let currentFolderId = null;
let map = null;
let marker = null;

export async function openMetadataEditor(fileId, folderId) {
    currentFileId = fileId;
    currentFolderId = folderId;

    const file = await getFile(fileId);
    if (!file) {
        alert('File not found');
        return;
    }

    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');

    renderMetadataForm(modalBody, file);
    modal.classList.remove('hidden');

    // Initialize map after DOM is ready
    setTimeout(() => initMap(file.location), 100);
}

function closeMetadataEditor() {
    // Clean up map
    if (map) {
        map.remove();
        map = null;
        marker = null;
    }

    const modal = document.getElementById('modal');
    modal.classList.add('hidden');
    currentFileId = null;
}

function parseLocation(location) {
    if (!location) return null;

    // Try parsing as JSON first
    if (typeof location === 'string' && location.startsWith('{')) {
        try {
            return JSON.parse(location);
        } catch (e) {
            // Not JSON, treat as plain text
        }
    }

    // If it's already an object
    if (typeof location === 'object' && location.lat && location.lng) {
        return location;
    }

    return null;
}

function formatLocationDisplay(location) {
    const parsed = parseLocation(location);
    if (parsed) {
        const name = parsed.name ? `${parsed.name} ` : '';
        return `${name}(${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)})`;
    }
    return location || '';
}

function renderMetadataForm(container, file) {
    const tags = file.tags || [];
    const tagsString = tags.join(', ');
    const locationDisplay = formatLocationDisplay(file.location);

    container.innerHTML = `
        <h3>Edit Metadata</h3>
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Title / Filename</label>
            <input type="text" id="metaName" value="${escapeHtml(file.name)}" style="width: 100%; padding: 8px; box-sizing: border-box;">
        </div>
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Description</label>
            <textarea id="metaDescription" rows="3" style="width: 100%; padding: 8px; box-sizing: border-box;">${escapeHtml(file.description || '')}</textarea>
        </div>
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Location</label>
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <button id="useMyLocationBtn" type="button">Use My Location</button>
                <button id="clearLocationBtn" type="button">Clear</button>
            </div>
            <input type="text" id="metaLocationDisplay" value="${escapeHtml(locationDisplay)}" readonly placeholder="Click map or use current location" style="width: 100%; padding: 8px; box-sizing: border-box; background: #f5f5f5;">
            <input type="hidden" id="metaLocation" value="${escapeHtml(file.location || '')}">
            <div id="locationMap" style="height: 200px; margin-top: 8px; border: 1px solid #ccc;"></div>
        </div>
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Tags</label>
            <input type="text" id="metaTags" value="${escapeHtml(tagsString)}" placeholder="comma-separated tags" style="width: 100%; padding: 8px; box-sizing: border-box;">
        </div>
        <div style="margin-bottom: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px;">
            <div style="font-weight: bold; margin-bottom: 8px;">Dates (read-only)</div>
            <div style="font-size: 0.9em; color: #555;">
                <div><strong>Created:</strong> ${formatDate(file.dateCreated)}</div>
                <div><strong>Modified:</strong> ${formatDate(file.dateModified)}</div>
                <div><strong>Last Accessed:</strong> ${formatDate(file.lastAccessed)}</div>
            </div>
        </div>
        <div style="margin-top: 20px;">
            <button id="saveMetaBtn">Save</button>
            <button id="cancelMetaBtn">Cancel</button>
        </div>
    `;

    container.querySelector('#useMyLocationBtn').onclick = useCurrentLocation;
    container.querySelector('#clearLocationBtn').onclick = clearLocation;
    container.querySelector('#saveMetaBtn').onclick = saveMetadata;
    container.querySelector('#cancelMetaBtn').onclick = closeMetadataEditor;
}

function initMap(existingLocation) {
    const mapContainer = document.getElementById('locationMap');
    if (!mapContainer || !window.L) return;

    // Parse existing location
    const parsed = parseLocation(existingLocation);
    const defaultLat = parsed?.lat || 0;
    const defaultLng = parsed?.lng || 0;
    const defaultZoom = parsed ? 13 : 2;

    // Create map
    map = L.map('locationMap').setView([defaultLat, defaultLng], defaultZoom);

    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // Add marker if location exists
    if (parsed) {
        marker = L.marker([parsed.lat, parsed.lng], { draggable: true }).addTo(map);
        marker.on('dragend', onMarkerDrag);
    }

    // Click to place marker
    map.on('click', onMapClick);
}

function onMapClick(e) {
    const { lat, lng } = e.latlng;
    setLocation(lat, lng);
}

function onMarkerDrag(e) {
    const { lat, lng } = e.target.getLatLng();
    setLocation(lat, lng, false); // Don't move marker, it's already there
}

function setLocation(lat, lng, updateMarker = true) {
    const locationData = JSON.stringify({ lat, lng });

    document.getElementById('metaLocation').value = locationData;
    document.getElementById('metaLocationDisplay').value = `(${lat.toFixed(5)}, ${lng.toFixed(5)})`;

    if (updateMarker && map) {
        if (marker) {
            marker.setLatLng([lat, lng]);
        } else {
            marker = L.marker([lat, lng], { draggable: true }).addTo(map);
            marker.on('dragend', onMarkerDrag);
        }
        map.setView([lat, lng], 13);
    }

    // Reverse geocode to get place name (optional)
    reverseGeocode(lat, lng);
}

async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
        );
        const data = await response.json();

        if (data.display_name) {
            const shortName = data.address?.city || data.address?.town ||
                              data.address?.village || data.address?.county ||
                              data.display_name.split(',')[0];

            const locationData = JSON.stringify({ lat, lng, name: shortName });
            document.getElementById('metaLocation').value = locationData;
            document.getElementById('metaLocationDisplay').value = `${shortName} (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
        }
    } catch (e) {
        // Geocoding failed, keep coordinates only
    }
}

function useCurrentLocation() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }

    const btn = document.getElementById('useMyLocationBtn');
    btn.textContent = 'Getting location...';
    btn.disabled = true;

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            setLocation(latitude, longitude);
            btn.textContent = 'Use My Location';
            btn.disabled = false;
        },
        (error) => {
            alert('Could not get location: ' + error.message);
            btn.textContent = 'Use My Location';
            btn.disabled = false;
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

function clearLocation() {
    document.getElementById('metaLocation').value = '';
    document.getElementById('metaLocationDisplay').value = '';

    if (marker && map) {
        map.removeLayer(marker);
        marker = null;
    }
}

async function saveMetadata() {
    const name = document.getElementById('metaName').value.trim();
    const description = document.getElementById('metaDescription').value.trim();
    const location = document.getElementById('metaLocation').value.trim();
    const tagsInput = document.getElementById('metaTags').value.trim();

    // Parse tags from comma-separated string
    const tags = tagsInput
        ? tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0)
        : [];

    if (!name) {
        alert('Name is required');
        return;
    }

    await updateMetadata(currentFileId, {
        name,
        description,
        location,
        tags
    });

    closeMetadataEditor();
    await renderAssets(currentFolderId);
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;');
}
