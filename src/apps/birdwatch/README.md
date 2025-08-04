# BirdWatch - AI-Powered Bird Identification & Tracking

A comprehensive birding app built with Next.js, featuring AI-powered bird identification, personal bird lists, and cloud synchronization.

## Features

### 🔍 **Stage 1: Bird Search**
- Search through thousands of bird species using iNaturalist API
- Filter results for South Africa region
- View bird photos, common names, and scientific names
- Comprehensive species database with high-quality images

### 📝 **Stage 2: Personal Bird List**
- Add birds to your personal collection
- Track sighting date, location, and notes
- Sort by chronological order or alphabetical by species
- Statistics: total sightings and unique species count
- Duplicate prevention - already added birds show as "Already in List ✓"

### 📷 **Stage 3: Photo Upload & Gallery**
- Upload photos directly from device or camera
- Drag-and-drop photo upload
- Automatic image compression and resizing (1200px max, 80% quality)
- Photo gallery with lightbox viewer and keyboard navigation
- Up to 3 photos per bird entry

### 🤖 **Stage 4: AI Bird Identification**
- OpenAI Vision API (GPT-4V) powered bird identification
- Confidence scoring with color-coded indicators
- Detailed AI reasoning for identification decisions
- Auto-search for identified species in iNaturalist database
- Suggested alternative search terms
- Location context for improved accuracy

### ☁️ **Stage 5: Cloud Sync & Authentication**
- Supabase integration for cloud storage
- User authentication (sign up/sign in)
- Cross-device synchronization
- Photo storage in Supabase Storage
- Automatic sync of local data when signing in
- Fallback to local storage when offline

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, CSS Modules
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **AI**: OpenAI Vision API (GPT-4V)
- **APIs**: iNaturalist API, xeno-canto API (future)
- **Image Processing**: Canvas API for compression/resizing

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file with:

```env
# Required for AI bird identification
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here

# Required for cloud sync and authentication
NEXT_PUBLIC_BIRD_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_BIRD_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Supabase Setup

1. Create a new Supabase project
2. Run the SQL schema in `database-schema.sql` in your Supabase SQL editor
3. This creates:
   - `bird_entries` table with Row Level Security
   - `bird-photos` storage bucket
   - Proper security policies
   - Database indexes for performance

### 3. API Keys

**OpenAI API Key:**
1. Go to [OpenAI API](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add it to your environment variables

**Supabase Keys:**
1. Go to your Supabase project settings
2. Copy the Project URL and anon/public key
3. Add them to your environment variables

## Usage

### Basic Usage (No Setup Required)
- Search for birds using the iNaturalist database
- Add birds to local collection
- Upload and view photos
- All data stored locally in browser

### With OpenAI API Key
- Enables AI-powered bird identification from photos
- Upload photo → AI analyzes → Suggests species → Add to list

### With Supabase Setup
- User authentication (sign up/sign in)
- Cloud storage for all bird data and photos
- Cross-device synchronization
- Automatic backup of local data

## File Structure

```
src/apps/birdwatch/
├── components/
│   ├── BirdSearch/         # Search interface
│   ├── PersonalList/       # User's bird collection
│   ├── PhotoUpload/        # Photo upload component
│   ├── PhotoGallery/       # Photo viewer with lightbox
│   ├── AIIdentification/   # AI bird identification
│   ├── AuthModal/          # Login/signup modal
│   └── UserMenu/           # User account menu
├── hooks/
│   ├── useBirdSearch.ts    # Search functionality
│   ├── usePersonalList.ts  # Bird list management
│   ├── usePhotoUpload.ts   # Photo handling
│   └── useAuth.ts          # Authentication
├── utils/
│   ├── inaturalist-api.ts  # iNaturalist API integration
│   ├── openai-vision.ts    # OpenAI Vision API
│   └── supabase.ts         # Supabase client & services
├── types/
│   └── bird.types.ts       # TypeScript interfaces
└── database-schema.sql     # Supabase database setup
```

## API Integration

### iNaturalist API
- **Base URL**: `https://api.inaturalist.org/v1`
- **Search**: `/taxa?q=<search_term>&taxon_id=3` (Birds class)
- **South Africa Filter**: `&place_id=113057`
- **Fields**: name, preferred_common_name, default_photo, taxon_photos

### OpenAI Vision API
- **Model**: GPT-4V (gpt-4o)
- **Purpose**: Bird identification from photos
- **Input**: Base64 image + location context
- **Output**: Species name, confidence, reasoning, search suggestions

### Future APIs
- **xeno-canto**: Bird call recordings
- **eBird**: Sightings and location data

## Database Schema

### `bird_entries` Table
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key to auth.users)
- bird_data (JSONB) - Complete bird info from iNaturalist
- date_spotted (TIMESTAMPTZ)
- location (TEXT)
- notes (TEXT)
- photos (TEXT[]) - Array of photo URLs
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### Storage
- **Bucket**: `bird-photos`
- **Structure**: `{user_id}/birds/{bird_id}/{timestamp}-{random}.jpg`
- **Access**: Public read, authenticated write (own folder only)

## Security

- **Row Level Security**: Users can only access their own data
- **Storage Policies**: Users can only upload to their own folders
- **API Keys**: Client-side keys for public APIs only
- **Authentication**: Handled by Supabase (email/password)

## Performance Features

- **Image Optimization**: Auto-resize to 1200px max, 80% JPEG compression
- **Lazy Loading**: Images loaded on demand
- **Caching**: Local storage caching for offline functionality
- **Database Indexes**: Optimized queries for user_id and date fields
- **Fallback Strategy**: Local storage when cloud services unavailable

## Future Enhancements

- **Bird Calls**: xeno-canto API integration for audio
- **Location Services**: GPS-based location detection
- **Offline Mode**: Service worker for offline functionality
- **Export/Import**: CSV export of bird lists
- **Social Features**: Share sightings with other users
- **Advanced Filters**: Date ranges, location-based filtering
- **Statistics**: Advanced analytics and charts

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - See LICENSE file for details