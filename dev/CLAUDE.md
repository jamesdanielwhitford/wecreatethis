# Bird Bingo App (Birdle)

## Project Goal

Build a bird spotting game that:
1. Gets all birds recorded in a user's chosen region (country/state)
2. Organizes birds by rarity (common, rare, ultra) based on observation frequency
3. Lets users create games with custom regions and date ranges
4. Track birds seen within each game via sightings
5. Share games with others via URL
6. Maintain a Life List of all birds ever seen

---

## Current Implementation

### App Structure

```
birdle/
├── index.html      # Home page with Lifer Challenge, Search, Games, Life List
├── daily.html      # Lifer Challenge - find one new bird for life list
├── search.html     # Bird search with filters and map picker
├── bird.html       # Bird detail page with sightings management
├── games.html      # Games list with FAB to create new
├── new-game.html   # Create new game with region selector
├── game.html       # Game detail - bird lists, scoring, sharing
├── life.html       # Life List - all birds seen by continent/region
├── life.js         # Life List page logic
├── styles.css      # App styling
├── app.js          # Main app logic
├── db.js           # IndexedDB module for caching and sightings
├── ebird.js        # eBird API module
├── sw.js           # Service worker for PWA (v37)
├── manifest.json   # PWA manifest
├── icon-192.png    # App icon
└── icon-512.png    # App icon large
```

### Completed Features

**Home Page (`index.html`)**
- Four main buttons: Lifer Challenge, Search, Games, Life List

**Lifer Challenge (`daily.html`)**
- Uses GPS to get user's current location
- Fetches nearby birds from eBird API (50km radius, last 30 days)
- Filters out birds already on user's life list
- Selects the most common bird NOT on life list as the target
- User can toggle "Found" on/off (in case of accidental tap)
- When marked found, adds sighting to IndexedDB (integrates with Life List)
- Challenge resets daily (based on date)
- No manual reset option - deterministic based on location + date
- Shows "No new birds to find nearby!" if user has seen all common birds
- Share functionality for score
- Stored in localStorage as `liferChallenge`

**Search Page (`search.html`)**
- "Use My Location" button for quick GPS-based search
- Country dropdown filter
- State/Province dropdown (loads when country selected)
- Search bar to filter bird list
- Map location picker (Leaflet + OpenStreetMap)
- Sort options: Nearest, A-Z, Recently Viewed
- "Seen only" filter checkbox
- Bird list from eBird API
- Seen status derived from IndexedDB sightings

**Bird Detail Page (`bird.html`)**
- Bird name, scientific name, location, date
- Google search link
- **Sightings Section**: View all sightings for this bird
  - Add new sighting with date, country, state, notes
  - Delete individual sightings
  - Sightings sorted by date (most recent first)

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
- Sticky navbar with back button and three-dot menu (⋮)
- Menu options: Share Score, Share Game, Change Dates, Delete Game
- Game header: title, eBird region link, date range
- Game ended banner (prompts user to use menu to change dates)
- **Score summary with filter toggle**: Click any score to filter birds
  - Click Total → show all seen birds
  - Click Common/Rare/Ultra → show only seen birds in that rarity
  - Click again to toggle off filter
  - Visual feedback with colored active states
- Search bar to filter within bird list
- Bird lists organized by rarity sections (Common, Rare, Ultra)
- **Collapsible sections**: Tap section header to expand/collapse
- **Sticky section headers**: Current rarity header sticks below navbar
- **Bird Modal**: Tap bird to open modal with:
  - Sightings list (filtered to this game's region/date range)
  - Add sighting button (uses game's region)
  - Delete sightings
  - Google search link
- Share Score: Customizable (total, by rarity, bird list, timeframe)
- Share Game: Creates URL that others can use to create identical game
- Change Dates: Edit start/end dates, or set to "Forever"
- Delete Game: Removes game with confirmation

**Life List Page (`life.html`)**
- Shows all birds with sightings, organized by continent
- 3-level hierarchy: Continent → Country → Sub-region (state/province)
- Sub-regions properly nested under parent countries (e.g., Gauteng under South Africa)
- Bird count per continent, country, and sub-region
- Click bird to view sighting details in modal

**Sightings System**
- Sightings are the source of truth for "seen" status
- Each sighting has: date, regionCode, regionName, notes
- Games derive seen status by filtering sightings to match region/date range
- Deleting a sighting updates game status in real-time
- Multiple sightings per bird supported

**Rarity Calculation**
- Uses ranking-based approach (not threshold-based)
- Birds sorted by recent observation count from eBird
- Top 1/3 = Common (green, #4caf50)
- Middle 1/3 = Rare (blue, #2196f3)
- Bottom 1/3 = Ultra (purple, #9c27b0)

---

## IndexedDB Schema (db.js)

### Object Stores

**birds** - Cached bird data
- `speciesCode` (keyPath)
- `comName`, `sciName`, `familyName`
- `continent`, `regions[]`
- `lastViewed`, `viewCount`
- `hasSightings` (boolean)
- `cachedAt`, `source`

**sightings** - Individual sighting records
- `id` (auto-increment keyPath)
- `speciesCode`, `comName`, `sciName`
- `date`, `time`
- `regionCode`, `regionName`
- `lat`, `lng`, `notes`
- `createdAt`
- Indexes: `speciesCode`, `date`, `regionCode`

**cache_meta** - Tracks which birds belong to which cache
- `key` (keyPath) - e.g., `game_123_birds`
- `speciesCodes[]`
- `updatedAt`

### Key Functions

```javascript
BirdDB.addSighting({ speciesCode, comName, date, regionCode, regionName, notes })
BirdDB.getSightingsForBird(speciesCode)
BirdDB.getAllSightings()
BirdDB.deleteSighting(sightingId)
BirdDB.getSighting(sightingId)
BirdDB.hasSightings(speciesCode)
BirdDB.getBirdsByContinent() // For life list
BirdDB.getContinent(regionCode) // Maps region to continent
```

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
- Cache version: `birdle-v37`
- Bump version when code changes
- Network-first strategy with cache fallback
- Caches all static assets for offline use

### CSS Architecture
- Uses CSS variable `--navbar-height: 48px` for consistent sticky positioning
- Game navbar and rarity section headers both reference this variable
- Rarity sections have light tinted backgrounds (green/blue/purple)
- Score items are clickable with active states for filtering

### Region Matching (for game sightings)
```javascript
// Sighting region must be within or match game region
regionMatches(sightingRegion, gameRegion) {
  if (sightingRegion === gameRegion) return true;
  if (sightingRegion.startsWith(gameRegion + '-')) return true;
  return false;
}
```

### Data Flow
1. User adds sighting → saved to IndexedDB `sightings` store
2. Game page loads → queries all sightings → filters by region/date → determines seen status
3. Search page loads → queries all sightings → extracts unique species codes → marks as seen
4. Life list → queries all sightings → groups by continent → country → sub-region
5. Lifer Challenge → gets nearby birds → filters out life list species → picks most common remaining bird

### Lifer Challenge Data Model (localStorage)
```javascript
{
  date: "2024-12-23",           // Resets daily
  lat: 37.7749,
  lng: -122.4194,
  locationName: "San Francisco",
  regionCode: "US-CA",
  regionName: "California",
  bird: {
    speciesCode: "...",
    comName: "...",
    sciName: "...",
    rarity: "common|rare|ultra"
  },
  found: false,
  sightingId: null,             // ID of sighting in IndexedDB (for undo)
  createdAt: "..."
}
```

---

## Resources

- eBird API Docs: https://documenter.getpostman.com/view/664302/S1ENwy59
- Get API Key: https://ebird.org/api/keygen
- Leaflet.js: https://leafletjs.com/
- OpenStreetMap Nominatim: https://nominatim.openstreetmap.org/
