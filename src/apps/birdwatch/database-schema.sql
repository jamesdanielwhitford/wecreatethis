-- BirdWatch Supabase Database Schema
-- Run this in your Supabase SQL editor to create the required tables

-- Enable Row Level Security (RLS) for all tables
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create bird_entries table
CREATE TABLE IF NOT EXISTS bird_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bird_data JSONB NOT NULL,
    date_spotted TIMESTAMPTZ NOT NULL,
    location TEXT,
    notes TEXT,
    photos TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS bird_entries_user_id_idx ON bird_entries(user_id);
CREATE INDEX IF NOT EXISTS bird_entries_date_spotted_idx ON bird_entries(date_spotted);
CREATE INDEX IF NOT EXISTS bird_entries_created_at_idx ON bird_entries(created_at);

-- Enable Row Level Security
ALTER TABLE bird_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only access their own bird entries
CREATE POLICY "Users can view their own bird entries" ON bird_entries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bird entries" ON bird_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bird entries" ON bird_entries
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bird entries" ON bird_entries
    FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for bird photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bird-photos', 'bird-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
-- Anyone can view photos (public bucket)
CREATE POLICY "Anyone can view bird photos" ON storage.objects
    FOR SELECT USING (bucket_id = 'bird-photos');

-- Only authenticated users can upload photos to their own folder
CREATE POLICY "Users can upload bird photos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'bird-photos' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can update their own photos
CREATE POLICY "Users can update their own bird photos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'bird-photos' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can delete their own photos
CREATE POLICY "Users can delete their own bird photos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'bird-photos' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_bird_entries_updated_at 
    BEFORE UPDATE ON bird_entries 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Optional: Create a view for easier querying (includes parsed bird data)
CREATE OR REPLACE VIEW bird_entries_with_bird_info AS
SELECT 
    id,
    user_id,
    bird_data,
    (bird_data->>'preferred_common_name') as common_name,
    (bird_data->>'name') as scientific_name,
    (bird_data->>'id')::integer as bird_species_id,
    date_spotted,
    location,
    notes,
    photos,
    created_at,
    updated_at
FROM bird_entries;

-- Grant access to the view
GRANT SELECT ON bird_entries_with_bird_info TO authenticated;