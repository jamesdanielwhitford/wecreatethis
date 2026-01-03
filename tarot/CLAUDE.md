# Tarot Reader

An offline-first Progressive Web App for tarot card readings.

## Overview

Tarot Reader is a simple, mystical web application that allows users to perform tarot card readings with different spread types. The app works completely offline and stores reading history locally using IndexedDB.

## Features

### Current Features
- **Full 78-Card Deck** - Complete tarot deck with all cards
  - 22 Major Arcana cards (The Fool through The World)
  - 56 Minor Arcana cards (14 cards each: Wands, Cups, Swords, Pentacles)
- **Single Card Reading** - Quick daily card pull for guidance
- **Three Card Spread** - Past, Present, Future reading
- **Celtic Cross** - Comprehensive 10-card spread
- **Offline Support** - Full PWA with service worker caching
- **Reading History Storage** - IndexedDB database configured to store readings locally
- **Upright & Reversed Meanings** - Each card has upright and reversed interpretations (3-4 keywords each)
- **Random Card Selection** - Shuffle algorithm with 50% reversal chance
- **Card Content Scraping** - All 78 cards scraped from healthmanifested.com with full meanings, symbolism, and interpretations saved as markdown in `card-content/` directory
- **Dark/Light Theme Support** - Automatically follows system preference using `prefers-color-scheme`
  - Dark mode: Dark purple background (#1a0033) with white text (#ffffff)
  - Light mode: Light purple background (#f5f0ff) with dark purple text (#1a0033)
  - Consistent text color scheme: All headings and text use `var(--text)` for readability
  - Accent color (`var(--accent)`) used only for borders, buttons, and decorative elements, not text
- **Quintessential Font** - Custom Google Font used throughout for mystical aesthetic

### Completed Features (Recent)
- **New Reading Creation Flow** ✓
  - Two-step modal process for creating readings:
    1. **Spread Selection Modal** - Card-based layout (not dropdown) with three options:
       - Single Card (with description)
       - Three Card Spread (with description)
       - Celtic Cross (with description)
    2. **Title & Message Modal** - Opens after selecting spread type:
       - Title input with date placeholder (e.g., "January 3, 2026") instead of example text
       - For single card readings: Additional message/question field appears
       - Message displays on the card itself (replaces "Your Message" position label)
  - Creating a reading navigates directly to the reading detail page

- **Home Page Redesign** - Readings history list modeled after birdle games list ✓
  - Page title: "Tarot Readings" with deck browser button (🃏) aligned on same line
  - List of past readings with title and date sorted by newest first
  - Custom titles provided by user when creating reading
  - Auto-generated date titles (e.g., "January 2, 2026") if no custom title provided
  - Floating Action Button (+) at bottom to create new reading
  - Three-dot menu (⋮) on each reading with Rename and Delete options
  - Styled rename modal with auto-focus and text selection
  - Styled delete confirmation modal with reading title display
  - Click-outside-to-close functionality on all modals

- **Reading Detail Page (Redesigned)** ✓
  - **Spread-Specific Layouts** - Cards display in their traditional spread patterns:
    - **Single Card**: Centered, larger display (200px max width)
    - **Three Card Spread**: Horizontal row layout with smaller cards (100px width)
    - **Celtic Cross**: Traditional cross pattern using CSS Grid
      - Cross formation: Crown (top), Past-Present-Future (horizontal center), Foundation (bottom)
      - Challenge card rotated 90° (image only) in its own row below the horizontal cross
      - Challenge card text labels (position/name) remain upright for readability
      - Vertical staff of 4 cards on the right (Outcome, Hopes/Fears, Environment, Self)
      - Cross and staff vertically aligned and span the same height
      - Cards centered within grid cells with `justify-items: center` for balanced spacing
      - Smaller cards (80px) to fit pattern on mobile screens
  - Each card displays:
    - Position label (Past, Present, Future, etc.)
    - Card image with subtle 4px border-radius
    - Card name with fixed height to prevent text wrapping from misaligning cards
  - Cards are tappable/clickable to view details
  - Hover effect (opacity fade) indicates interactivity
  - No background boxes - transparent, minimal design
  - Toggle button (top right) to switch to Info/Cards view
    - Info view shows spread description and guidance (plain text, no colored tip boxes)
    - Toggle properly maintains spread layout when switching back to cards view
  - Back button returns to readings list
  - Responsive design works on mobile (max-width 400px) and scales down for very small screens

- **Card Detail Page (New)** ✓
  - Individual page for each card in a reading
  - Accessed by tapping any card in the reading view
  - Larger card image display (280px max width)
  - Shows card name with orientation (Upright/Reversed)
  - Information display order (redesigned):
    1. Position meaning (e.g., "What has led to this moment") - displayed first
    2. Upright/Reversed meanings (keywords for current orientation)
    3. Card description (detailed visual symbolism and imagery)
  - All 78 card descriptions extracted from healthmanifested.com
  - Descriptions include detailed symbolism, visual elements, and interpretations
  - Line breaks added for better readability (2-3 paragraphs per card)
  - CSS `white-space: pre-line` preserves formatting
  - Back button returns to reading view
  - Fully styled with theme support

- **Card Images Acquisition & Optimization** ✓
  - Downloaded all 78 tarot card images from Wikimedia Commons (Rider-Waite-Smith deck)
  - Organized and renamed cards to standard naming convention:
    - Minor Arcana: "01 of Cups.jpg", "Page of Cups.jpg", etc.
    - Major Arcana: "Fool.jpg", "Magician.jpg", etc.
  - Converted all images to web-optimized WebP format
  - Resized from ~1100px to 400px width (maintaining 1:1.72 aspect ratio)
  - Achieved 89.6% file size reduction (68MB → 7.1MB total)
  - Images stored in `tarot/images/` directory (78 .webp files)
  - Source images in `tarot-images/` (gitignored)

- **Card Image Integration & Offline Caching** ✓
  - Integrated all 78 card images into the app
  - Added `getCardImagePath()` helper function in tarot-data.js
    - Maps card names to image filenames
    - Handles both Major Arcana ("Fool.webp") and Minor Arcana ("01 of Cups.webp")
  - Implemented visual reversed card indicator
    - Reversed cards display upside down (transform: rotate(180deg))
    - CSS transition for smooth rotation effect
  - Updated service worker (v3 → v4 → v6)
    - Added all 78 card images to offline cache
    - Added card-detail.html and card-detail.js to cache
    - Images cached on first visit for offline functionality
    - Total cached assets: ~7MB of images + app files
  - App fully functional offline with all card images
  - Optimized for Cloudflare Pages deployment

- **Deck Browser** ✓
  - Added deck browser button (🃏) to home page header
  - Full deck browser page showing all 78 cards
    - Organized by sections: Major Arcana, Wands, Cups, Swords, Pentacles
    - 2-column responsive grid layout
    - Cards tappable to view standalone card details
  - Standalone card detail pages from deck browser
    - Shows both upright and reversed meanings
    - No position context (unlike reading card details)
  - Current deck: **Golden Thread** (default)
    - Modern minimalist design
    - Located in `tarot/images/` (78 .webp files, 3.9MB)
    - Converted from Cards-jpg folder source
    - Features clean, contemporary artwork
  - Deck caching system via deck-manager.js
    - Infrastructure ready for multiple decks
    - Service worker message handlers for deck management (CACHE_DECK, REMOVE_DECK)
    - Deck selection UI temporarily disabled (for future multi-deck support)
  - **Rider-Waite-Smith Deck** (archived)
    - Classic tarot imagery from Wikimedia Commons
    - Stored in `tarot-deck-rider-waite/` (gitignored, 78 .webp files, 7.1MB)
    - Ready to be re-enabled when multi-deck support is implemented

- **Card Descriptions Integration** ✓
  - Created `card-descriptions.js` with all 78 card descriptions
  - Extracted detailed visual descriptions from scraped markdown files
  - Python script (`extract-card-descriptions.py`) used to parse markdown and create JavaScript data
  - Helper function `getCardDescription(cardName)` maps card names to descriptions
  - Integrated into both card detail contexts:
    - Reading context (`card-detail.html`) - shows after position meaning and upright/reversed keywords
    - Deck browser context (`deck-card-detail.html`) - shows after upright and reversed meanings
  - All descriptions formatted with line breaks for readability (2-3 paragraphs each)
  - CSS `white-space: pre-line` property added to preserve formatting
  - Service worker updated to v7 to cache new card-descriptions.js file
  - Total content: ~90KB of detailed card symbolism and interpretations

### In Progress
- None currently

### Planned Features
- Additional tarot decks (Modern Witch, etc.)
- Custom spreads creator
- Card meanings encyclopedia/reference page
- Reading journal with notes
- Export readings (JSON/PDF)
- Card flip animations

## Technology Stack

- **Vanilla JavaScript** - No frameworks
- **IndexedDB** - Local storage for reading history
- **Service Workers** - Offline functionality and caching
- **PWA** - Installable progressive web app

## File Structure

```
tarot/
├── index.html           # Home page - readings list with FAB and deck button
├── reading.html         # Reading overview page with all cards
├── card-detail.html     # Card detail page (from reading context)
├── deck.html            # Full deck browser page
├── deck-card-detail.html # Card detail page (from deck browser)
├── style.css           # Styles with theme support and mobile-first layout
├── app.js              # Main application logic for home page
├── reading.js          # Reading overview page logic
├── card-detail.js      # Card detail page logic (reading context)
├── deck.js             # Deck browser page logic
├── deck-card-detail.js # Card detail page logic (deck browser)
├── deck-manager.js     # Deck selection and caching system
├── db.js               # IndexedDB wrapper with CRUD operations
├── tarot-data.js       # Card data (78 cards) and spread definitions
├── card-descriptions.js # Card descriptions (78 cards, ~90KB) with visual symbolism
├── sw.js               # Service worker (v7)
├── manifest.json       # PWA manifest
├── list-of-cards.md    # Reference list with URLs to card meanings
├── icon-192.png        # App icon (192x192) - TODO: needs creation
├── icon-512.png        # App icon (512x512) - TODO: needs creation
├── images/             # Rider-Waite-Smith deck (78 .webp files, 7.1MB)
│   └── golden-thread/  # Golden Thread deck (78 .webp files, 3.9MB)
├── scraper/            # Content scraping tools (gitignored via root .gitignore)
│   ├── venv/           # Python virtual environment
│   ├── scrape-card.py  # Script to scrape single card content
│   ├── scrape-all-cards.py # Script to scrape all 78 cards
│   └── card-content/   # Scraped markdown files (78 cards) from healthmanifested.com
└── CLAUDE.md           # This file

Root directory (gitignored):
├── tarot-images/        # Source card images (78 .jpg files, Rider-Waite-Smith deck)
├── Cards-jpg/           # Source card images for Golden Thread deck (78 .jpg files)
├── download-tarot-images.py      # Script to download Rider-Waite cards from Wikimedia
├── organize-tarot-images.py      # Script to rename cards to standard format
├── download-major-arcana.py      # Script to download Major Arcana cards
├── convert-tarot-images.py       # Script to convert Rider-Waite JPG to WebP (400px width)
├── convert-second-deck.py        # Script to convert Golden Thread deck to WebP
├── create-pixel-deck.py          # Script to create pixel art deck (experimental)
└── test-tinypng.py               # Script to test TinyPNG compression
```

## Architecture

### Data Layer
- **db.js**: IndexedDB wrapper with CRUD operations
  - `initDB()` - Initialize database with readings object store
  - `saveReading(reading)` - Save new reading to database
  - `getAllReadings()` - Get all readings sorted by date (newest first)
  - `getReading(id)` - Get single reading by ID
  - `updateReading(reading)` - Update existing reading (for rename)
  - `deleteReading(id)` - Delete reading from database
- **tarot-data.js**: Contains all tarot card definitions and spread configurations
  - Full 78-card deck with upright/reversed meanings
  - Spread definitions (single, three, celtic)
  - `getCardImagePath(card, deckId)` - Helper function to map card names to image file paths
    - Supports multiple decks via DECK_CONFIG
    - Uses current deck from localStorage if deckId not specified
    - Returns proper path based on deck's imagePrefix and imageExtension

### Application Layer
- **app.js**: Home page logic
  - Readings list rendering and management (sorted by date, newest first)
  - New reading modal with spread selection and title input
  - Rename modal with styled input and auto-focus
  - Delete confirmation modal with reading title
  - Three-dot menu handlers for each reading
  - Card drawing uses random selection with shuffle algorithm
  - Each card has 50% chance of being reversed
  - Creates reading and navigates to reading detail page
- **reading.js**: Reading overview page
  - Loads reading from database by ID from URL parameter
  - Displays clean grid of all cards in the reading
  - Each card shows: position label, image, and card name only
  - Cards are clickable/tappable to navigate to card detail page
  - Card images loaded using `getCardImagePath()` helper
  - Reversed cards displayed upside down (CSS transform)
  - Toggle to Info view shows spread information and guidance
  - Back button navigation to readings list
- **card-detail.js**: Individual card detail page (reading context)
  - Loads specific card from reading by readingId and cardIndex
  - Displays larger card image (280px)
  - Shows card name with orientation (Upright/Reversed)
  - Lists all meanings for current card orientation
  - Shows position-specific description
  - Back button returns to reading overview
- **deck.js**: Deck browser page
  - Displays all 78 cards organized by sections
  - Filters cards by type (Major Arcana, suits)
  - 2-column grid layout for each section
  - Cards clickable to view standalone detail page
  - Deck selection UI removed (temporarily, for future multi-deck support)
- **deck-card-detail.js**: Card detail page (deck browser context)
  - Loads card by name from URL parameter
  - Shows both upright and reversed meanings
  - No position context (standalone card reference)
  - Back button returns to deck browser
- **deck-manager.js**: Deck management system
  - `DECK_CONFIG` - Configuration for all available decks (golden-thread default, rider-waite archived)
  - `getCurrentDeck()` / `setCurrentDeck()` - localStorage deck preference (defaults to 'golden-thread')
  - `getDeckImageUrls()` - Generates list of all image URLs for a deck
  - `cacheDeck()` - Sends message to service worker to cache deck images
  - `removeDeckFromCache()` - Removes old deck images from cache
  - `switchDeck()` - Handles complete deck switching process
  - Infrastructure ready for future multi-deck support

### UI/Presentation
- **style.css**: Theme-aware styles with light/dark mode support
- Mobile-first centered layout (max-width: 400px)
- Modals with consistent styling across the app:
  - New reading modal
  - Rename modal with auto-focus
  - Delete confirmation modal with warning
- Three-dot dropdown menus on reading items
- Floating action button (FAB) for creating new readings
- Toggle button for Cards/Info view (CSS-only icons)
- Spread information display with styled tips and card positions
- Card image styling:
  - Reading overview: 200px max width
  - Card detail page: 280px max width
  - Subtle rounded corners (4px border-radius)
  - Box shadow for depth effect
  - Reversed cards rotated 180deg with smooth transition
  - Responsive sizing for mobile devices
- Card grid layout:
  - Transparent backgrounds, no boxes
  - Hover effect (opacity fade) on clickable cards
  - Clean, minimal presentation focused on imagery
- Deck browser styling:
  - 2-column responsive grid
  - Section headers for card organization
  - Current deck name display ("Golden Thread")
  - Deck selection UI temporarily removed

## Offline Strategy

- **Network-first with cache fallback**: Ensures users get updates when online
- **Redirect metadata stripping**: Prevents ERR_FAILED errors on Cloudflare Pages and Safari
- **Enhanced cache matching**: Handles extensionless URLs and query parameters
- **IndexedDB for user data**: Reading history stored locally
- **Service worker versioning**: Uses `tarot-v8` cache name (increment when updating)
- **Immediate activation**: Uses `skipWaiting()` and `clients.claim()` for instant updates
- **Image caching**: All 78 Golden Thread card images (3.9MB total) cached on first visit for offline use
- **Deck management caching**: Service worker message handlers for CACHE_DECK and REMOVE_DECK
  - Infrastructure ready for dynamically caching new deck images when multi-deck support is added
  - Can remove old deck images to save storage space
  - Designed to cache only one deck at a time
- **Total offline cache**: ~4-5MB (app files + Golden Thread deck)

## UI Design

### Mobile-First Centered Layout
- Follows the same design pattern as birdle app
- **Centered content**: `max-width: 400px; margin: 0 auto;` on body element
- **No wrapper divs**: Content is direct children of `<body>` element
- **Responsive padding**: 20px default, 16px on very small screens (<360px)
- **Mobile-first approach**: Designed primarily for mobile/phone screens, scales gracefully to desktop
- **Clean, focused UI**: Content centered on screen like a mobile app, even on desktop displays

### Color Themes
- **System-based theming**: Uses `@media (prefers-color-scheme: dark)` to automatically match user's system preference
- **Dark mode (default on dark systems)**:
  - Primary bg: `#1a0033` (dark purple)
  - Text: `#ffffff` (white)
  - Accent: `#8b5cf6` (purple)
- **Light mode (default on light systems)**:
  - Primary bg: `#f5f0ff` (light purple)
  - Text: `#1a0033` (dark purple)
  - Accent: `#7c3aed` (purple)
- **Smooth transitions**: Color transitions animate when system theme changes

## Card Data Structure

Each card in `tarot-data.js` includes:
- `name`: Card name (e.g., "The Fool", "Ace of Wands")
- `number`: Card number (Major Arcana only, 0-21)
- `suit`: Suit name (Minor Arcana only: "wands", "cups", "swords", "pentacles")
- `upright`: Array of upright meanings (3-4 keywords)
- `reversed`: Array of reversed meanings (3-4 keywords)

When a card is drawn:
- `isReversed`: Boolean flag (true/false) added during drawing to indicate card orientation

## Spread Types

### Single Card
- One card for quick guidance

### Three Card Spread
1. Past - What has led to this moment
2. Present - Where you are now
3. Future - Where you are heading

### Celtic Cross
1. Present - The current situation
2. Challenge - What crosses or challenges you
3. Foundation - The foundation or root cause
4. Past - Recent past
5. Crown - Potential outcome
6. Future - Near future
7. Self - Your role or attitude
8. Environment - External influences
9. Hopes/Fears - Your hopes and fears
10. Outcome - The final outcome

## Development Notes

### Version Management
- Current version: 1.0.0
- Service worker cache version: v7 (tarot-v7)
- Update version in: `sw.js` (CACHE_NAME), `manifest.json`, `index.html`
- Use `dev/bump-version.sh` for version increments

### Adding New Features
- Keep vanilla JS approach
- Maintain offline-first functionality
- Store persistent data in IndexedDB
- Update service worker cache list when adding new files

### Content Scraping Tools
The project includes Python scripts for scraping card content from healthmanifested.com (located in `scraper/` directory, which is gitignored):

- **scraper/scrape-card.py** - Scrapes a single card URL and saves as markdown
  - Uses Playwright for browser automation to bypass anti-scraping protection
  - Extracts title, descriptions, keywords, and symbolism
  - Saves clean markdown files to `scraper/card-content/` directory
  - Usage: `cd scraper && source venv/bin/activate && python scrape-card.py <url>`

- **scraper/scrape-all-cards.py** - Batch scrapes all 78 cards from list-of-cards.md
  - Reads URLs from list-of-cards.md
  - Skips cards that already have markdown files (safe to re-run)
  - 3-second delay between requests to be respectful to server
  - Shows progress and summary (successful/failed/skipped counts)
  - Usage: `cd scraper && source venv/bin/activate && python scrape-all-cards.py`

**Setup**:
1. `cd scraper`
2. `python3 -m venv venv`
3. `source venv/bin/activate`
4. `pip install playwright beautifulsoup4 requests`
5. `playwright install chromium`

**Status**: All 78 cards successfully scraped (22 Major Arcana + 56 Minor Arcana) and stored in `scraper/card-content/`

**Integration**: Card descriptions have been extracted and integrated into the app:
- Python script extracts description paragraphs from markdown files
- Creates `card-descriptions.js` with all 78 descriptions
- Line breaks added for readability (2-3 paragraphs per card)
- Integrated into both card detail pages (reading and deck browser contexts)
- Descriptions displayed after card meanings on detail pages

**Note**: The `scraper/` directory is gitignored to keep the repository clean.

### Card Image Optimization Tools
The project includes Python scripts for downloading and optimizing tarot card images (located in root directory, gitignored):

**Rider-Waite-Smith Deck Scripts:**
- **download-tarot-images.py** - Downloads all 78 cards from Wikimedia Commons
  - Reads filenames from `images-for-tarot.md`
  - Uses Wikimedia API to get direct image URLs
  - Downloads JPG images to `tarot-images/` directory
  - Includes browser User-Agent headers to avoid 403 errors
  - Shows progress and skips already downloaded files
  - Usage: `python3 download-tarot-images.py`

- **organize-tarot-images.py** - Renames cards to standard naming convention
  - Converts "Cups01.jpg" → "01 of Cups.jpg"
  - Maps court cards: 11=Page, 12=Knight, 13=Queen, 14=King
  - Handles all four suits (Cups, Pentacles, Swords, Wands)
  - Usage: `python3 organize-tarot-images.py`

- **download-major-arcana.py** - Downloads just the 22 Major Arcana cards
  - Quick script for downloading Major Arcana separately
  - Names cards simply: "Fool.jpg", "Magician.jpg", etc.
  - Usage: `python3 download-major-arcana.py`

- **convert-tarot-images.py** - Converts Rider-Waite JPG to web-optimized WebP
  - Resizes images from ~1100px to 400px width
  - Maintains aspect ratio (~1:1.72)
  - Converts to WebP format with 85% quality
  - Achieves ~90% file size reduction (68MB → 7.1MB)
  - Previously output to `tarot/images/`, now archived to `tarot-deck-rider-waite/`
  - Usage: `python3 convert-tarot-images.py`

**Golden Thread Deck Scripts:**
- **convert-second-deck.py** - Converts Golden Thread deck to WebP
  - Source: Cards-jpg folder (78 .jpg files)
  - Handles both Major Arcana (00-TheFool.jpg format) and Minor Arcana (Cups01.jpg format)
  - Converts to standard naming convention matching Rider-Waite deck
  - Resizes to 400px width, maintains aspect ratio
  - WebP format with 85% quality
  - Total result: 3.4MB → 3.9MB (slight increase due to complexity of artwork)
  - Outputs to `tarot/images/` directory (currently deployed deck)
  - Usage: `python3 convert-second-deck.py`

**Experimental Scripts:**
- **create-pixel-deck.py** - Creates pixel art version of deck (experimental)
  - Applies pixelation effect using PIL
  - Downscales then upscales with nearest-neighbor interpolation
  - Reduces color palette for retro aesthetic
  - Various settings tested (4x4, 6x6, 8x8 pixel blocks)
  - Not currently integrated into app
  - Usage: `python3 create-pixel-deck.py`

- **test-tinypng.py** - Tests TinyPNG compression on single image
  - Uses TinyPNG API for compression testing
  - Compares with WebP conversion results
  - API Key: `2ZdgCC1N9KbZPQr0mhZrKSTBnYf7tzpM`
  - Usage: `python3 test-tinypng.py`

**Image Optimization Results**:
- **Rider-Waite Deck**:
  - Original JPG (1086x1810px): ~972KB per card
  - TinyPNG Compressed JPG (1086x1810px): ~508KB per card (47.8% savings)
  - WebP Optimized (400x666px): ~79KB per card (91.8% savings)
  - Final: 68MB → 7.1MB total

- **Golden Thread Deck**:
  - Original JPG (varies, ~400-600px): ~43KB per card average
  - WebP Optimized (400px width): ~52KB per card average
  - Final: 3.4MB → 3.9MB total (slight increase due to format conversion)

**Conclusion**: WebP with resize is far more efficient for web/mobile delivery. Golden Thread deck currently deployed, Rider-Waite archived for future use.

**Current Deck Storage**:
- **Deployed**: Golden Thread deck in `tarot/images/` (78 .webp files, 3.9MB)
- **Archived**: Rider-Waite deck in `tarot-deck-rider-waite/` (gitignored, 78 .webp files, 7.1MB)

### Known Issues & TODOs
- **Missing Icons**: Need to create icon-192.png and icon-512.png for PWA installation
- **Service Worker Cache**: Remember to increment cache version when updating files (currently tarot-v12)
  - Service worker now uses proper redirect handling for Cloudflare Pages compatibility
  - All 78 Golden Thread card images cached for offline use
  - Deck browser cached (selection UI removed)
  - Deck management message handlers ready for future multi-deck support
  - Card descriptions (card-descriptions.js) cached for offline access
- **Temporary Debugging Code (TODO: Remove after Jan 2026)**:
  - `deck.js` lines 3-8: localStorage version check and clearing (added to fix iOS cache issue after deck path migration)
  - `deck.js` lines 39-42: Image path replacement for legacy `images/golden-thread/` paths
  - `deck.js` line 45: `onerror` console logging for failed image loads
  - These can be removed once all production users have migrated past service worker v12

## Reading Data Model

Each saved reading in IndexedDB contains:
```javascript
{
  id: 1767365691754,                    // Unique timestamp ID
  title: "Morning Guidance",            // Custom or auto-generated title
  spreadType: "three",                  // single | three | celtic
  spreadName: "Three Card Spread",      // Human-readable spread name
  date: "2026-01-02T21:54:51.754Z",    // ISO timestamp
  message: "What should I focus on?",  // Optional message (for single card readings)
  cards: [                              // Array of drawn cards
    {
      name: "The Fool",
      number: 0,
      upright: ["beginnings", "innocence", "spontaneity"],
      reversed: ["recklessness", "naivety", "risk"],
      isReversed: false,
      position: {
        name: "Past",
        description: "What has led to this moment"
      }
    },
    // ... more cards
  ]
}
```

**Note**: For single card readings with a message, the message text replaces the position label ("Your Message") on the card display.

## Next Steps

### Planned Features
- Integrate scraped card content from `card-content/` into card detail pages
- Card detail pages with full meanings from healthmanifested.com
- Custom spreads creator
- Card meanings encyclopedia/reference using scraped content
- Reading journal with notes
- Export readings (JSON/PDF)
- Card flip animations
- Card images (currently text-only)
- Add reversed card visual indicator (upside down or icon)
- Social sharing of readings with card images

## Design Philosophy

- **Simplicity**: Clean, focused interface
- **Mystical Aesthetic**: Purple theme, serif fonts, card-based UI
- **Privacy**: All data stays on device
- **Accessibility**: Works offline, mobile-friendly
- **No Authentication**: Fully client-side, no server required
