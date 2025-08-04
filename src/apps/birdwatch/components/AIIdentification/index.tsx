import { useState } from 'react';
import { identifyBirdFromPhoto } from '../../utils/openai-vision';
import { searchBirds } from '../../utils/inaturalist-api';
import { AIIdentificationResult, Bird } from '../../types/bird.types';
import styles from './styles.module.css';

interface AIIdentificationProps {
  photo: string;
  location?: string;
  onBirdSuggested?: (bird: Bird) => void;
  onSearchSuggested?: (searchTerm: string) => void;
}

export default function AIIdentification({ 
  photo, 
  location, 
  onBirdSuggested, 
  onSearchSuggested 
}: AIIdentificationProps) {
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [result, setResult] = useState<AIIdentificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestedBirds, setSuggestedBirds] = useState<Bird[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleIdentify = async () => {
    setIsIdentifying(true);
    setError(null);
    setResult(null);
    setSuggestedBirds([]);

    try {
      const identification = await identifyBirdFromPhoto(photo, location);
      
      if (identification.success && identification.result) {
        setResult(identification.result);
        
        // Automatically search for the identified species
        await searchForSuggestions(identification.result);
      } else {
        setError(identification.error || 'Failed to identify bird');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identification failed');
    } finally {
      setIsIdentifying(false);
    }
  };

  const searchForSuggestions = async (aiResult: AIIdentificationResult) => {
    setIsSearching(true);
    
    try {
      // Try searching with the species name first
      let searchResponse = await searchBirds(aiResult.species);
      
      // If no results, try with common name
      if (searchResponse.results.length === 0 && aiResult.commonName) {
        searchResponse = await searchBirds(aiResult.commonName);
      }
      
      // If still no results, try with suggested search terms
      if (searchResponse.results.length === 0 && aiResult.suggestedSearchTerms.length > 0) {
        for (const term of aiResult.suggestedSearchTerms) {
          searchResponse = await searchBirds(term);
          if (searchResponse.results.length > 0) break;
        }
      }
      
      setSuggestedBirds(searchResponse.results.slice(0, 3)); // Show top 3 matches
    } catch (err) {
      console.error('Error searching for bird suggestions:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return '#28a745'; // Green
    if (confidence >= 60) return '#ffc107'; // Yellow
    if (confidence >= 40) return '#fd7e14'; // Orange
    return '#dc3545'; // Red
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 80) return 'High';
    if (confidence >= 60) return 'Medium';
    if (confidence >= 40) return 'Low';
    return 'Very Low';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4 className={styles.title}>🤖 AI Bird Identification</h4>
        <button 
          onClick={handleIdentify}
          disabled={isIdentifying}
          className={styles.identifyButton}
        >
          {isIdentifying ? 'Identifying...' : 'Identify Bird'}
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          <strong>Error:</strong> {error}
          {error.includes('API key') && (
            <p className={styles.apiKeyHelp}>
              To enable AI identification, add your OpenAI API key to your environment variables as NEXT_PUBLIC_OPENAI_API_KEY.
            </p>
          )}
        </div>
      )}

      {result && (
        <div className={styles.result}>
          <div className={styles.identification}>
            <div className={styles.identificationHeader}>
              <div className={styles.speciesInfo}>
                <h5 className={styles.commonName}>{result.commonName}</h5>
                <p className={styles.scientificName}>{result.species}</p>
              </div>
              <div 
                className={styles.confidence}
                style={{ color: getConfidenceColor(result.confidence) }}
              >
                {result.confidence}% {getConfidenceText(result.confidence)}
              </div>
            </div>
            
            <div className={styles.reasoning}>
              <strong>AI Analysis:</strong> {result.reasoning}
            </div>

            {result.suggestedSearchTerms.length > 0 && (
              <div className={styles.searchTerms}>
                <strong>Try searching for:</strong>
                <div className={styles.termButtons}>
                  {result.suggestedSearchTerms.map((term, index) => (
                    <button
                      key={index}
                      onClick={() => onSearchSuggested?.(term)}
                      className={styles.termButton}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {isSearching && (
            <div className={styles.searching}>
              Searching for matching birds...
            </div>
          )}

          {suggestedBirds.length > 0 && (
            <div className={styles.suggestions}>
              <h6 className={styles.suggestionsTitle}>Possible Matches:</h6>
              <div className={styles.birdSuggestions}>
                {suggestedBirds.map((bird) => (
                  <div key={bird.id} className={styles.birdSuggestion}>
                    {bird.default_photo?.medium_url && (
                      <img 
                        src={bird.default_photo.medium_url} 
                        alt={bird.preferred_common_name || bird.name}
                        className={styles.suggestionImage}
                      />
                    )}
                    <div className={styles.suggestionInfo}>
                      <div className={styles.suggestionName}>
                        {bird.preferred_common_name || bird.name}
                      </div>
                      <div className={styles.suggestionScientific}>
                        {bird.name}
                      </div>
                    </div>
                    <button
                      onClick={() => onBirdSuggested?.(bird)}
                      className={styles.selectButton}
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}