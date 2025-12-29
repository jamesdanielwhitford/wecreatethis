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
├── life.html       # Life List - all birds seen by continent/country/region
├── life.js         # Life List page logic
├── bingo.html      # Bird Bingo game
├── sync.html       # Device sync via WebRTC
├── cache.html      # Cache management - add/remove country caches
├── styles.css      # App styling
├── app.js          # Main app logic
├── db.js           # IndexedDB module for caching and sightings
├── ebird.js        # eBird API module
├── location.js     # Unified location management (GPS, caching, reverse geocoding)
├── sw.js           # Service worker for PWA (v84)
├── sync/           # WebRTC sync modules
├── manifest.json   # PWA manifest
├── icon-192.png    # App icon
└── icon-512.png    # App icon large
dev/
└── bump-version.sh # Script to bump version numbers (run from dev/ folder)
```

### Completed Features

**Home Page (`index.html`)**
- Five main buttons: Search, Life List, Lifer Challenge, Region Games (🌍), Bird Bingo
- **Menu (⋮)** in top-right with: Manage Cache, Sync Devices, About
- **Location status section** at top:
  - Red "Grant location access" link when no cached location
  - Green link showing current location (clickable to open manual location modal)
  - Blue "Update with current location" link to refresh GPS
  - Cache status showing "X birds cached" for offline access
- **Manual location modal**: Select country/state without GPS
- **Country bird caching**: When location is set, automatically caches all birds for that country to IndexedDB for offline use

**Cache Management Page (`cache.html`)**
- Accessible from Home Page menu → "Manage Cache"
- Shows list of all cached countries with bird counts and cache date
- Summary at top: "X countries cached (Y birds)"
- **Add Country**: Dropdown to select any country, "Cache" button to download
- **Remove Cache**: × button on each country to remove (preserves birds with sightings)
- Progress feedback during caching operations
- User controls what's cached - no automatic eviction

**Lifer Challenge (`daily.html`)**
- Uses cached location (GPS or manual) - no auto-prompt for location
- Shows "Enable Location" button if no cached location
- Fetches nearby birds from eBird API (50km radius for GPS, region-based for manual)
- Filters out birds already on user's life list
- Selects the most common bird NOT on life list as the target
- Page header shows clickable "Find it near you →" link (Google search for bird location)
- **Bird name is clickable** - navigates to full bird.html detail page
- **No toggle button** - completion status derived from sightings in IndexedDB
- Automatically shows "New Lifer!" banner when user adds a sighting for the challenge bird on the challenge date
- To mark as found, user navigates to bird detail page and adds a sighting
- Auto-refreshes when returning to page (via pageshow/visibilitychange listeners)
- **Challenge persists for entire day** - once set, keeps same bird even after found (doesn't regenerate)
- Challenge resets only when date changes (new day = new challenge)
- Shows "No new birds to find nearby!" if user has seen all common birds
- Share functionality with clickable Google search link in preview
- Share text includes full Google search URL for finding the bird
- Stored in localStorage as `liferChallenge`

**Search Page (`search.html`)**
- "Use My Location" button for quick GPS-based search
- **Country dropdown dynamically loaded** from eBird API (all countries)
- State/Province dropdown (loads when country selected)
- Search bar to filter bird list
- Map location picker (Leaflet + OpenStreetMap)
- Sort options: Nearest, A-Z, Recently Viewed
- "Seen only" filter checkbox
- Seen status derived from IndexedDB sightings
- **Search session persistence**: Remembers last searched country/state and search query
- Prioritizes last search over user's location when returning to page
- **API-first with cache fallback**: Always fetches recent observations from eBird API (includes location data for each bird). Falls back to IndexedDB cache only when offline.
- **"Nearest" sort uses cached location**: When sorting by nearest, uses user's cached location from LocationService as reference point. Birds without coordinates are sorted alphabetically at the end.
- **"Cache this country" prompt**: Shows when searching uncached country, allows one-click caching

**Bird Detail Page (`bird.html`)**
- Accessible from: Search, Life List, Game Detail, Lifer Challenge
- Back button intelligently returns to referring page
- Bird name and scientific name
- Google search link
- **Bird lookup from multiple sources**: currentBirds → liferChallenge → IndexedDB cache
- **Sightings Section**: View all sightings for this bird
  - Modern, polished sighting modal with improved styling
  - Add new sighting with date, country, state, notes
  - **Smart region pre-selection**:
    - From game context: pre-selects game's region (via URL param `from=game&gameId=X`)
    - Otherwise: pre-selects user's cached location
  - Delete individual sightings
  - Sightings sorted by date (most recent first)
- No eBird location/date displayed (removed for cleaner UI)

**Games List Page (`games.html`)**
- List of all created games
- Title on first line, region/found/status on second line
- **Found count calculated dynamically** from IndexedDB sightings (not stored on game object)
- FAB (+) button to create new game
- Uses `game.id` (timestamp) for URLs, not array index

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
- **Finds game by `game.id` (timestamp)**, not array index
- **Score summary with filter toggle**: Click any score to filter birds
  - Click Total → show all seen birds
  - Click Common/Rare/Ultra → show only seen birds in that rarity
  - Click again to toggle off filter
  - Visual feedback with colored active states
- Search bar to filter within bird list
- Bird lists organized by rarity sections (Common, Rare, Ultra)
- **Collapsible sections**: Tap section header to expand/collapse
- **Sticky section headers**: Current rarity header sticks below navbar
- **Bird items are clickable links** - navigate to `bird?code=X&from=game&gameId=Y`
- Whole list item is clickable (consistent with Search and Life List)
- Share Score: Customizable (total, by rarity, bird list, timeframe)
- Share Game: Creates URL that others can use to create identical game
- Change Dates: Edit start/end dates, or set to "Forever"
- Delete Game: Removes game with confirmation

**Life List Page (`life.html`)**
- Shows all birds with sightings, organized by continent
- **3-level collapsible hierarchy**: Continent → Country → Sub-region (state/province)
- Country names resolved from eBird API (fetched once, not per bird)
- Sub-regions properly nested under parent countries (e.g., Gauteng under South Africa)
- Bird count per continent, country, and sub-region
- **Bird items are clickable links** - navigate to full bird.html detail page
- Displays sighting count next to each bird name
- CSS styles for all three levels (continent-title, country-title, region-title)

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

// Country caching (for offline access)
BirdDB.cacheCountryBirds(countryCode, onProgress) // Cache all birds for a country
BirdDB.hasCountryCache(countryCode) // Check if country is cached
BirdDB.getCountryCacheMeta(countryCode) // Get cache metadata
BirdDB.getCachedCountries() // Get list of all cached countries with metadata
BirdDB.removeCountryFromCache(countryCode) // Remove cache (preserves sighted birds)
BirdDB.getCachedBirdsForCountry(code)  // Get all cached birds for country
BirdDB.getCachedBirdsForRegion(code)   // Get birds for region (state filters from country)
```

### Country Caching System

**User-controlled caching** - no automatic eviction:
- User's location country is auto-cached from home page
- Users can add/remove any countries from cache.html
- Search page shows "Cache this country?" prompt for uncached countries

**Protection Rules** - Birds are NEVER deleted when removing cache if:
- `hasSightings: true` (user has logged a sighting)
- In an active game cache (`game_*` in cache_meta)
- In another country cache

**Cache Metadata** (IndexedDB `cache_meta` store):
- Key format: `country_{countryCode}_birds`
- Contains array of species codes for that country

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

**Taxonomy**
```
GET /ref/taxonomy/ebird?fmt=json&species={codes}  # Get bird details (name, family, etc.)
# Batched in chunks of 200 species codes (comma-separated)
```

**Recent Observations**
```
GET /data/obs/{regionCode}/recent  # Recent observations for rarity calc
GET /data/obs/geo/recent?lat=&lng=&dist=&back=30  # Nearby (search page)
```

### ebird.js Module
- `EBird.getRecentObservations(regionCode, throwOnNetworkError)` - pass `true` to detect offline state
- `EBird.getNearbyObservations(lat, lng, dist)` - returns observations with `locName`, `lat`, `lng`
- Network errors (TypeError) can be caught when `throwOnNetworkError=true` for offline fallback logic
- API errors return empty array `[]` silently to avoid breaking the app

---

## Technical Notes

### LocationService (location.js)
Unified location management across the app.

**Key Features:**
- Caches location in localStorage (`userLocation` key)
- Reverse geocodes GPS coords via Nominatim (OpenStreetMap)
- Falls back to eBird observations if geocoding fails
- Handles both GPS locations (with lat/lng) and manual locations (with just region codes)

**Key Methods:**
```javascript
LocationService.getCached()           // Get cached location or null
LocationService.saveToCache(location) // Save location to cache
LocationService.getLocation(forceRefresh) // Get location (uses cache unless forceRefresh)
LocationService.hasValidCoordinates(location) // Check if GPS coords (not manual)
LocationService.getRegionCode(location) // Get stateCode or countryCode
LocationService.getRegionDisplayName(location) // Get "State, Country" or "Country"
```

**Location Object Structure:**
```javascript
{
  lat: 37.7749,          // 0 for manual locations
  lng: -122.4194,        // 0 for manual locations
  countryCode: "US",     // eBird country code
  countryName: "United States",
  stateCode: "US-CA",    // eBird state code (optional)
  stateName: "California",
  displayName: "California, United States",
  cachedAt: "2024-12-24T..."
}
```

### Service Worker (sw.js)
- Cache version: `birdle-v84`
- **Use `./bump-version.sh N` from dev/ folder** to update all version numbers
- Network-first strategy with cache fallback
- Caches all static assets for offline use

**Safari Compatibility (Critical):**
- Safari rejects responses with `redirected: true` from service workers
- `stripRedirectMetadata()` creates clean Response objects without redirect flag
- Applied during both install phase AND fetch handler
- All responses returned to client are cleaned, not just cached ones

**Response Cloning (Critical):**
- Must clone response BEFORE returning it to avoid race condition
- `cleanResponse.clone()` must happen synchronously, not in async callback
- Otherwise browser may start consuming body before clone completes

**Cache Matching:**
- Uses `{ ignoreSearch: true }` to match URLs ignoring query params
- Handles `app.js?v=84` matching cached `app.js`
- Extensionless URL fallback: `/birdle/search` → `/birdle/search.html`
- Root fallback: `/birdle/` or `/birdle` → `/birdle/index.html`

**Install Phase:**
- Fetches each asset individually (not `cache.addAll`)
- Strips redirect metadata before caching
- Logs warnings for failed assets instead of failing entire install

### CSS Architecture
- Uses CSS variable `--navbar-height: 48px` for consistent sticky positioning
- Game navbar and rarity section headers both reference this variable
- Rarity sections have light tinted backgrounds (green/blue/purple)
- Score items are clickable with active states for filtering

### UI/UX Design System

**Consistent Navigation Pattern**
- All bird list pages (Search, Life List, Game Detail, Lifer Challenge) now navigate to bird.html
- No modals for bird details - full page experience throughout
- Smart back button that returns to the referring page (search, life, daily, or specific game)
- Whole list items are clickable (not just text links)

**Form Styling (Sighting Modal)**
- Modern form inputs with 2px borders and 8px border-radius
- Green focus states (#4caf50) for visual feedback
- Custom dropdown arrows for select elements
- Disabled states with reduced opacity
- Smooth transitions on all interactive elements
- Proper spacing: 12px padding, 20px margins between groups

**Modal Design**
- Max-width: 400px (spacious but mobile-friendly)
- Border-radius: 16px for modern rounded corners
- Elegant box-shadow: `0 8px 32px rgba(0, 0, 0, 0.12)`
- Max-height with overflow for long forms
- Button hierarchy: Primary (green), Cancel (gray), Danger (red)
- Hover effects with subtle lift animation

**Button Styling**
- Primary buttons: 14px padding, 10px border-radius
- Hover state: translateY(-1px) with box-shadow
- Transitions: 0.2s for smooth animations
- Clear visual hierarchy with color coding
- Consistent sizing across the app

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
6. Lifer Challenge completion → queries sightings for challenge bird on challenge date → auto-updates UI

### Game ID System
- Games use `game.id` (timestamp from `Date.now()`) as unique identifier
- URLs use `game?id={timestamp}` not array indices
- Game detail finds game via `games.find(g => g.id === gameId)`
- More stable than array indices (survives deletions/reordering)
- Bird links from game include context: `bird?code=X&from=game&gameId=Y`

### Search Session Data Model (localStorage `lastSearch`)
```javascript
{
  type: "region",           // "region" or "location"
  code: "US-CA",            // Full region code used for search
  countryCode: "US",        // Country code for dropdown
  stateCode: "US-CA",       // State code for dropdown (null if country-only)
  query: "sparrow"          // User's search query text
}
// Or for GPS-based search:
{
  type: "location",
  lat: 37.7749,
  lng: -122.4194,
  query: "hawk"
}
```
- Search page prioritizes `lastSearch` over user's cached location
- Restores country/state dropdowns and search query on return
- Updated when user selects country/state or types in search box

### Lifer Challenge Data Model (localStorage)
```javascript
{
  date: "2024-12-23",           // Challenge persists for this entire day
  lat: 37.7749,                 // 0 for manual locations
  lng: -122.4194,               // 0 for manual locations
  locationName: "San Francisco",
  regionCode: "US-CA",
  regionName: "California",
  bird: {
    speciesCode: "...",
    comName: "...",
    sciName: "...",
    rarity: "common|rare|ultra"
  },
  createdAt: "..."
}
// Note: Challenge ONLY resets when date changes (not location)
// Completion status is derived by querying IndexedDB sightings
```

---

## Resources

- eBird API Docs: https://documenter.getpostman.com/view/664302/S1ENwy59
- Get API Key: https://ebird.org/api/keygen
- Leaflet.js: https://leafletjs.com/
- OpenStreetMap Nominatim: https://nominatim.openstreetmap.org/
