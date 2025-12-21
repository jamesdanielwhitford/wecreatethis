# Bird Bingo App (Birdle)

## Project Goal

Build a bird bingo card generator that:
1. Gets birds that may appear in a user's chosen area
2. Filters by time of year (current week/month)
3. Organizes birds by rarity (common → rare → super rare)
4. Generates a bingo card with 5 common, 5 rare, and 5 super rare birds

---

## Current Implementation

### App Structure

```
birdle/
├── index.html      # Home page with Search and Games buttons
├── search.html     # Bird search with filters and map picker
├── bird.html       # Bird detail page with seen toggle
├── games.html      # Bingo game (stub)
├── styles.css      # Minimal styling
├── app.js          # Main app logic
├── ebird.js        # eBird API module
├── sw.js           # Service worker for PWA
└── .env            # API key (gitignored)
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

**Data Persistence (localStorage)**
- `seenBirds` - array of species codes marked as seen
- `recentBirds` - array of recently viewed birds
- `lastSearch` - last searched region/location
- `currentBirds` - current bird list for detail page

### Games Page (TODO)
- Bingo card generator not yet implemented

---

## eBird API

### Authentication

- Get free API key at: https://ebird.org/api/keygen
- Include key in header: `x-ebirdapitoken: YOUR_KEY`
- Or as query param: `?key=YOUR_KEY`

### Base URL

```
https://api.ebird.org/v2
```

### Region Codes

- Country: `US`, `CA`, `GB`
- State/Province: `US-NY`, `US-CA`, `CA-BC`
- County: `US-NY-005` (Bronx County)
- Hotspot: `L196159`

---

## Key Endpoints

### Historic Observations on a Date

Get all species observed in a region on a specific date.

```
GET /data/obs/{regionCode}/historic/{year}/{month}/{day}
```

Example:
```
GET /data/obs/US-NY/historic/2024/12/21
```

Response includes:
- `speciesCode` - species identifier
- `comName` - common name
- `sciName` - scientific name
- `howMany` - count observed
- `obsDt` - observation date
- `locName` - location name

### Recent Observations in Region

Get observations from the last 30 days.

```
GET /data/obs/{regionCode}/recent
```

### Recent Nearby Observations

Get recent observations near a lat/lng.

```
GET /data/obs/geo/recent?lat={lat}&lng={lng}
```

### Species List for Region

Get all species ever recorded in a region.

```
GET /product/spplist/{regionCode}
```

---

## Data Strategy for Rarity Calculation

### Approach: Query Historic Data Across Multiple Years

To determine which birds are common vs rare for a specific time of year:

1. **Pick a date range** around the current date (e.g., 7 days: Dec 18-24)
2. **Query across multiple years** (e.g., 2020-2024 = 5 years)
3. **Aggregate species frequency**

### Example Queries for December 21st in New York

```
GET /data/obs/US-NY/historic/2024/12/21
GET /data/obs/US-NY/historic/2024/12/20
GET /data/obs/US-NY/historic/2024/12/22
... (repeat for surrounding days)

GET /data/obs/US-NY/historic/2023/12/21
GET /data/obs/US-NY/historic/2023/12/20
... (repeat for 5 years)
```

Total calls: ~7 days × 5 years = **35 API calls per region**

### Calculate Frequency Score

```javascript
// Count how many query days each species appeared
const speciesCount = {};
allObservations.forEach(obs => {
  speciesCount[obs.speciesCode] = (speciesCount[obs.speciesCode] || 0) + 1;
});

// Calculate frequency (0 to 1)
const totalQueryDays = 35; // 7 days × 5 years
const frequency = speciesCount[species] / totalQueryDays;

// Rarity score (higher = rarer)
const rarityScore = 1 - frequency;
```

### Categorize by Rarity

```javascript
// Sort by frequency descending
const sorted = species.sort((a, b) => b.frequency - a.frequency);

// Split into tiers
const common = sorted.filter(s => s.frequency > 0.3);     // Seen >30% of days
const rare = sorted.filter(s => s.frequency > 0.05 && s.frequency <= 0.3);  // 5-30%
const superRare = sorted.filter(s => s.frequency <= 0.05); // <5%
```

### Generate Bingo Card

```javascript
function generateBingoCard(region, date) {
  const birds = await fetchBirdFrequencies(region, date);

  return {
    common: pickRandom(birds.common, 5),
    rare: pickRandom(birds.rare, 5),
    superRare: pickRandom(birds.superRare, 5)
  };
}
```

---

## API Rate Limits

- eBird API has rate limits (not publicly documented)
- Recommend caching results
- Consider pre-computing popular regions

---

## Alternative Data Sources

### If API Approach is Too Slow

**eBird Bar Chart Data** (requires login):
```
https://ebird.org/barchartData?r={REGION}&bmo=1&emo=12&byr=2020&eyr=2024&fmt=tsv
```

Returns frequency by week for all species in a region. More efficient but requires authentication.

### Other APIs

- **Nuthatch API**: https://nuthatch.lastelm.software/ - Basic bird data, ~1000 species
- **eBird Status & Trends**: https://ebird.org/science/status-and-trends - Detailed range maps (requires data request)

---

## Resources

- eBird API Docs: https://documenter.getpostman.com/view/664302/S1ENwy59
- Get API Key: https://ebird.org/api/keygen
- Region Codes: https://www.transscendsurvival.org/2020/06/14/the-ebird-api-regioncode/
- rebird R package: https://github.com/ropensci/rebird
