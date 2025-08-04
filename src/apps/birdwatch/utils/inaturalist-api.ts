import { Bird, BirdSearchResponse } from '../types/bird.types';

const INATURALIST_BASE_URL = 'https://api.inaturalist.org/v1';

export async function searchBirds(
  query: string, 
  southAfricaOnly: boolean = false
): Promise<BirdSearchResponse> {
  try {
    const params = new URLSearchParams({
      q: query,
      taxon_id: '3', // Birds class
      per_page: '20',
      order: 'desc',
      order_by: 'observations_count'
    });

    if (southAfricaOnly) {
      params.append('place_id', '6986'); // South Africa place ID
    }

    const response = await fetch(`${INATURALIST_BASE_URL}/taxa?${params}`);
    
    if (!response.ok) {
      throw new Error(`iNaturalist API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      results: data.results || [],
      total_results: data.total_results || 0
    };
  } catch (error) {
    console.error('Error searching birds:', error);
    return {
      results: [],
      total_results: 0
    };
  }
}

export function getBirdImageUrl(bird: Bird): string | null {
  if (bird.default_photo?.medium_url) {
    return bird.default_photo.medium_url;
  }
  
  if (bird.taxon_photos && bird.taxon_photos.length > 0) {
    return bird.taxon_photos[0].photo.medium_url;
  }
  
  return null;
}