export interface Bird {
  id: number;
  name: string;
  preferred_common_name: string;
  default_photo?: {
    url: string;
    medium_url: string;
  };
  taxon_photos?: Array<{
    photo: {
      url: string;
      medium_url: string;
    };
  }>;
  rank: string;
  ancestry: string;
}

export interface BirdSearchResponse {
  results: Bird[];
  total_results: number;
}

export interface PersonalBirdEntry {
  id: string;
  bird: Bird;
  dateSpotted: string;
  location?: string;
  notes?: string;
  photos?: string[];
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BirdSearchFilters {
  southAfricaOnly: boolean;
  query: string;
}

export interface AIIdentificationResult {
  confidence: number;
  species: string;
  commonName?: string;
  reasoning: string;
  suggestedSearchTerms: string[];
}

export interface AIIdentificationResponse {
  success: boolean;
  result?: AIIdentificationResult;
  error?: string;
}