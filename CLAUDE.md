# Bird Bingo App (Birdle)

## Project Goal

Build a bird spotting game that:
1. Gets all birds recorded in a user's chosen region (country/state)
2. Organizes birds by rarity (common, rare, super rare) based on observation frequency
3. Lets users create games with custom regions and date ranges
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
├── new-game.html   # Create new game with region selector
├── game.html       # Game detail - bird lists, scoring, sharing
├── styles.css      # Minimal styling
├── app.js          # Main app logic
├── ebird.js        # eBird API module
├── sw.js           # Service worker for PWA (v23)
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
- Sort options: Nearest, A-Z, Recently Viewed
- "Seen only" filter checkbox
- Bird list from eBird API
- Last searched area cached in localStorage

**Bird Detail Page (`bird.html`)**
- Bird name, scientific name, location, date, count
- "Mark as Seen" toggle (persisted in localStorage)

**Games List Page (`games.html`)**
- List of all created games
- Title on first line, region/found/status on second line
- FAB (+) button to create new game

**New Game Page (`new-game.html`)**
- Auto-generated title placeholder (date + region, grey italic)
- "Use My Location" button for auto-detection
- Cascading region selectors: Country → State/Province
- Auto-detects user's region on page load
- Start date (defaults to today)
- End date with "Forever" option
- Create button (enabled when region selected)

**Game Detail Page (`game.html`)**
- Game header: title, eBird region link, date range
- Game ended banner with Resume option
- Score summary: Total, Common, Rare, Super Rare counts
- Full bird list organized by rarity sections
- Tap bird to open action modal (mark seen/unseen)
- Share button with two options:
  - **Share Score**: Customizable (total, by rarity, bird list, timeframe)
  - **Share Game**: Creates URL that others can use to create identical game

**Rarity Calculation**
- Uses ranking-based approach (not threshold-based)
- Birds sorted by recent observation count from eBird
- Top 1/3 = Common (green)
- Middle 1/3 = Rare (blue)
- Bottom 1/3 = Super Rare (purple)

**Auto-Generated Game Titles**
- Format: "Dec 22, 2024 - California, United States"
- Shows as grey italic placeholder
- Updates as region is selected
- Used if user leaves title blank

**Location Detection**
- Uses browser geolocation API
- Reverse geocodes via OpenStreetMap Nominatim
- Auto-selects country and state dropdowns

**Data Persistence (localStorage)**
- `seenBirds` - array of species codes marked as seen (search)
- `recentBirds` - array of recently viewed birds
- `lastSearch` - last searched region/location
- `games` - array of game objects with:
  - id, title, regionCode, regionName
  - startDate, endDate
  - birds (fetched on first open)
  - seenBirds (with timestamps)

---

## eBird API

### Authentication
- API key stored in ebird.js: `rut6699v8fce`
- Header: `x-ebirdapitoken: YOUR_KEY`

### Base URL
```
https://api.ebird.org/v2
```

### Endpoints Used

**Region Hierarchy**
```
GET /ref/region/list/country/world          # All countries
GET /ref/region/list/subnational1/{country} # States/provinces
```

**Species List**
```
GET /product/spplist/{regionCode}  # All species ever recorded
```

**Recent Observations**
```
GET /data/obs/{regionCode}/recent  # Recent observations for rarity calc
GET /data/obs/geo/recent?lat=&lng=&dist=&back=30  # Nearby (search page)
```

---

## Technical Notes

### Service Worker
- Cache version: `birdle-v23`
- Bump version when code changes
- Caches all static assets for offline use

### Rarity Algorithm
```javascript
// Get species from region, count from recent observations
const speciesCodes = await EBird.getSpeciesList(regionCode);
const observations = await EBird.getRecentObservations(regionCode);

// Count and sort by frequency
birds.sort((a, b) => b.count - a.count);

// Split into thirds by ranking
const commonThreshold = Math.floor(total / 3);
const rareThreshold = Math.floor(total * 2 / 3);
```

### Location Detection
```javascript
// GPS → Reverse geocode → Match to eBird regions
const position = await navigator.geolocation.getCurrentPosition();
const response = await fetch(
  `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
);
// Match country_code and state to dropdown options
```

### Share Game URL
```javascript
const params = new URLSearchParams({
  title, region: regionCode, regionName, start, end
});
const shareUrl = `${baseUrl}?join=${btoa(params.toString())}`;
```

---

## Resources

- eBird API Docs: https://documenter.getpostman.com/view/664302/S1ENwy59
- Get API Key: https://ebird.org/api/keygen
- Leaflet.js: https://leafletjs.com/
- OpenStreetMap Nominatim: https://nominatim.openstreetmap.org/
