# Bird Bingo App (Birdle)

## Project Goal

Build a bird spotting game that:
1. Gets birds that may appear in a user's chosen area
2. Organizes birds by rarity (common, rare, super rare)
3. Lets users create games with custom areas and date ranges
4. Track birds seen within each game
5. Share games with others via URL

---

## Current Implementation

### App Structure

```
birdle/
├── index.html      # Home page with Search and Games buttons
├── search.html     # Bird search with filters and map picker
├── bird.html       # Bird detail page with seen toggle
├── games.html      # Games list with FAB to create new
├── new-game.html   # Create new game with map area picker
├── game.html       # Game detail - bird lists, scoring, sharing
├── styles.css      # Minimal styling
├── app.js          # Main app logic
├── ebird.js        # eBird API module
├── sw.js           # Service worker for PWA (v14)
├── manifest.json   # PWA manifest
├── icon-192.png    # App icon
└── icon-512.png    # App icon large
```

### Completed Features

**Home Page (`index.html`)**
- Two main buttons: Search and Games

**Search Page (`search.html`)**
- Country dropdown filter
- Map location picker (Leaflet + OpenStreetMap)
  - Opens at user's current location
  - Tap to move marker
  - "Search here" to find birds
- Sort options: Nearest, A-Z, Recently Viewed
- "Seen only" filter checkbox
- Bird list from eBird API
- Last searched area cached in localStorage

**Bird Detail Page (`bird.html`)**
- Bird name, scientific name, location, date, count
- "Mark as Seen" toggle (persisted in localStorage)

**Recently Viewed**
- Birds viewed are tracked (unlimited list)
- Accessible via sort dropdown
- Remove button (✕) to delete from list

**Games List Page (`games.html`)**
- List of all created games with title and info
- FAB (+) button to create new game
- Empty state when no games exist

**New Game Page (`new-game.html`)**
- Title input field
- Map area picker with circle overlay
  - Circle resizes based on zoom level
  - **Maximum 50km radius** (eBird API limit)
  - Shows "(max)" indicator when at limit
- Start date picker (defaults to today)
- End date picker with "Forever" option
- Create button (disabled until valid)

**Game Detail Page (`game.html`)**
- Game header: title, Google Maps link, date range
- Game ended banner with Resume option
- Score summary: Total, Common, Rare, Super Rare counts
- Full bird list organized by rarity sections
- Tap bird to open action modal (mark seen/unseen)
- Share button with two options:
  - **Share Score**: Customizable (total, by rarity, bird list, timeframe)
  - **Share Game**: Creates URL that others can use to create identical game

**Rarity Calculation**
- Uses ranking-based approach (not threshold-based)
- Birds sorted by observation count from eBird
- Top 1/3 = Common (green)
- Middle 1/3 = Rare (blue)
- Bottom 1/3 = Super Rare (purple)

**Share Game Feature**
- Encodes game params (title, lat, lng, radius, dates) in base64
- URL format: `?join={base64_encoded_params}`
- Recipient opens URL, game is created on their device

**Resume Game Feature**
- When game end date passes, shows "Game ended" banner
- Resume button opens modal to pick new end date
- "Forever" option removes end date entirely

**Data Persistence (localStorage)**
- `seenBirds` - array of species codes marked as seen (search)
- `recentBirds` - array of recently viewed birds
- `lastSearch` - last searched region/location
- `currentBirds` - current bird list for detail page
- `games` - array of game objects with:
  - id, title, lat, lng, radius
  - startDate, endDate
  - birds (fetched on first open)
  - seenBirds (with timestamps)

---

## eBird API

### Authentication

- API key stored in ebird.js
- Include key in header: `x-ebirdapitoken: YOUR_KEY`

### Base URL

```
https://api.ebird.org/v2
```

### Key Constraints

- **Maximum radius: 50km** for nearby observations
- Rate limits apply (not publicly documented)

### Endpoints Used

**Recent Nearby Observations**
```
GET /data/obs/geo/recent?lat={lat}&lng={lng}&dist={km}
```
- dist max is 50km
- Returns recent observations near coordinates

**Recent Observations in Region**
```
GET /data/obs/{regionCode}/recent
```

**Historic Observations on a Date**
```
GET /data/obs/{regionCode}/historic/{year}/{month}/{day}
```

### Region Codes

- Country: `US`, `CA`, `GB`
- State/Province: `US-NY`, `US-CA`, `CA-BC`
- County: `US-NY-005` (Bronx County)

---

## Technical Notes

### Service Worker

- Cache version must be bumped when code changes
- Current version: `birdle-v14`
- Caches all static assets for offline use

### Rarity Algorithm

```javascript
// Sort birds by observation count (most seen first)
birds.sort((a, b) => b.count - a.count);

// Split into thirds by ranking
const total = birds.length;
const commonThreshold = Math.floor(total / 3);
const rareThreshold = Math.floor(total * 2 / 3);

birds.forEach((bird, index) => {
  if (index < commonThreshold) bird.rarity = 'common';
  else if (index < rareThreshold) bird.rarity = 'rare';
  else bird.rarity = 'superrare';
});
```

### Map Circle Limit

```javascript
const rawRadius = (latDiff * 111) / 3; // Based on view
const radius = Math.min(rawRadius, 50); // Cap at 50km
```

---

## Resources

- eBird API Docs: https://documenter.getpostman.com/view/664302/S1ENwy59
- Get API Key: https://ebird.org/api/keygen
- Leaflet.js: https://leafletjs.com/
