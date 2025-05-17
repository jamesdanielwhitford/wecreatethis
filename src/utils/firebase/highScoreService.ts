// src/utils/firebase/highScoreService.ts
import { 
  collection, 
  doc, 
  // getDoc, 
  getDocs, 
  // setDoc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './config';
import { 
  HighScore, 
  GameType, 
  // WeekData,
  SurvivorPuzzleHighScore,
  FifteenPuzzleHighScore
} from './types';

// Define new types for options and high score data
interface HighScoreOptions {
  scoreOrder?: 'asc' | 'desc';
  category?: string;
  wordGameType?: string;
}

interface HighScoreData {
  name: string;
  score: number;
  formattedScore?: string;
  timestamp?: number;
  isAllTimeHigh?: boolean;
  moves?: number;
  timeTaken?: number;
  scoreOrder?: 'asc' | 'desc';
  category?: string;
  wordGameType?: string;
  gameType?: GameType;
}

class HighScoreService {
  // Get the collection reference for all high scores
  private getHighScoresCollection() {
    return collection(db, 'highScores');
  }

  // Get high scores for a specific game
  async getHighScores(gameType: GameType, options?: HighScoreOptions): Promise<HighScore[]> {
    try {
      // Start with a simple query to avoid index issues initially
      const highScoresCollection = this.getHighScoresCollection();
      let highScoresQuery;
      
      // If we have specific options, use a more complex query (requires index)
      if (gameType === 'survivorPuzzle') {
        // For survivorPuzzle, always sort by time (lower is better)
        // We'll fetch more scores to account for ties and sort by moves later
        highScoresQuery = query(
          highScoresCollection,
          where('gameType', '==', gameType),
          orderBy('score', 'asc'), // Lower time is better
          limit(20) // Get more scores to handle secondary sorting by moves
        );
      } else if (gameType === 'fifteenPuzzle' && options?.category) {
        // For fifteenPuzzle, filter by category (daily/infinite)
        highScoresQuery = query(
          highScoresCollection,
          where('gameType', '==', gameType),
          where('category', '==', options.category),
          orderBy('score', 'asc'), // Lower time is better for puzzle games
          limit(20) // Get more scores to handle secondary sorting by moves
        );
      } else if (options?.category && gameType === 'picturePuzzle') {
        // For picturePuzzle, filter by category
        highScoresQuery = query(
          highScoresCollection,
          where('gameType', '==', gameType),
          where('category', '==', options.category),
          orderBy('score', options?.scoreOrder || 'desc'),
          limit(10)
        );
      } else if (options?.wordGameType && gameType === 'wordGame') {
        // For wordGame, filter by word game type
        highScoresQuery = query(
          highScoresCollection,
          where('gameType', '==', gameType),
          where('wordGameType', '==', options.wordGameType),
          orderBy('score', options?.scoreOrder || 'desc'),
          limit(10)
        );
      } else {
        // Simple query for all scores of this game type
        highScoresQuery = query(
          highScoresCollection,
          where('gameType', '==', gameType),
          orderBy('score', options?.scoreOrder || 'desc'),
          limit(10)
        );
      }
      
      // Execute the query
      try {
        const querySnapshot = await getDocs(highScoresQuery);
        const highScores: HighScore[] = [];
        
        querySnapshot.forEach((doc) => {
          highScores.push({ id: doc.id, ...doc.data() } as HighScore);
        });
        
        // For SurvivorPuzzle and FifteenPuzzle, implement secondary sorting by moves
        if (gameType === 'survivorPuzzle' || gameType === 'fifteenPuzzle') {
          // Sort by time (already done by Firestore), then by moves for same times
          highScores.sort((a, b) => {
            // If times are different, maintain the time-based sort
            if (a.score !== b.score) return a.score - b.score;
            
            // If times are the same, sort by moves (lower is better)
            const movesA = (gameType === 'survivorPuzzle') 
              ? (a as SurvivorPuzzleHighScore).moves || 0
              : (a as FifteenPuzzleHighScore).moves || 0;
              
            const movesB = (gameType === 'survivorPuzzle')
              ? (b as SurvivorPuzzleHighScore).moves || 0
              : (b as FifteenPuzzleHighScore).moves || 0;
              
            return movesA - movesB;
          });
          
          // Limit to top 10
          return highScores.slice(0, 10);
        }
        
        return highScores;
      } catch (indexError) {
        console.error("Index error, using simpler query:", indexError);
        
        // If we get an index error, fall back to a simpler query
        const simpleQuery = query(
          highScoresCollection,
          where('gameType', '==', gameType),
          limit(10)
        );
        
        const querySnapshot = await getDocs(simpleQuery);
        const highScores: HighScore[] = [];
        
        querySnapshot.forEach((doc) => {
          highScores.push({ id: doc.id, ...doc.data() } as HighScore);
        });
        
        return highScores;
      }
    } catch (error) {
      console.error("Error fetching high scores:", error);
      return [];
    }
  }

  // Check if a score qualifies for the high score list
  async checkHighScore(
    gameType: GameType, 
    score: number, 
    options?: HighScoreOptions, 
    moves?: number
  ): Promise<boolean> {
    try {
      const highScores = await this.getHighScores(gameType, options);
      
      // If there are fewer than 10 scores, any score qualifies
      if (highScores.length < 10) {
        return true;
      }
      
      // For SurvivorPuzzle or FifteenPuzzle with moves as a tiebreaker
      if ((gameType === 'survivorPuzzle' || gameType === 'fifteenPuzzle') && moves !== undefined) {
        const worstScore = highScores[highScores.length - 1];
        const worstScoreMoves = gameType === 'survivorPuzzle' 
          ? (worstScore as SurvivorPuzzleHighScore).moves
          : (worstScore as FifteenPuzzleHighScore).moves;
        
        // Better time always qualifies
        if (score < worstScore.score) {
          return true;
        }
        
        // Equal time but fewer moves qualifies
        if (score === worstScore.score && moves < worstScoreMoves) {
          return true;
        }
        
        return false;
      } 
      // For time-based scores where lower is better
      else if (options?.scoreOrder === 'asc' || gameType === 'survivorPuzzle' || gameType === 'fifteenPuzzle') {
        // Check if this score is better than the worst score
        const worstScore = highScores[highScores.length - 1];
        return score < worstScore.score;
      } 
      // For regular scores where higher is better
      else {
        // Check if this score is better than the worst score
        const worstScore = highScores[highScores.length - 1];
        return score > worstScore.score;
      }
    } catch (error) {
      console.error("Error checking high score:", error);
      // If there's an error, return true to allow the user to submit their score anyway
      return true;
    }
  }

  // Helper function to delete the lowest score if there are already 10 scores
  private async deleteLowestScoreIfNeeded(gameType: GameType, options?: HighScoreOptions): Promise<void> {
    try {
      const highScores = await this.getHighScores(gameType, options);
      
      // If we already have 10 scores, delete the lowest one
      if (highScores.length >= 10) {
        // The lowest score is the last one in the array after sorting
        const lowestScore = highScores[highScores.length - 1];
        
        if (lowestScore.id) {
          // Delete the document from Firestore
          const docRef = doc(this.getHighScoresCollection(), lowestScore.id);
          await deleteDoc(docRef);
          console.log(`Deleted lowest score ID: ${lowestScore.id} with score: ${lowestScore.score}`);
        }
      }
    } catch (error) {
      console.error("Error deleting lowest score:", error);
    }
  }

  // Add a new high score
  async addHighScore(gameType: GameType, highScore: HighScoreData): Promise<string | null> {
    try {
      // Get the collection reference
      const highScoresCollection = this.getHighScoresCollection();
      
      // For SurvivorPuzzle and FifteenPuzzle, determine all-time high based on time and moves
      if (gameType === 'survivorPuzzle' || gameType === 'fifteenPuzzle') {
        let allTimeHighQuery;
        
        // For FifteenPuzzle, we need to filter by category too
        if (gameType === 'fifteenPuzzle' && highScore.category) {
          allTimeHighQuery = query(
            highScoresCollection,
            where('gameType', '==', gameType),
            where('category', '==', highScore.category),
            where('isAllTimeHigh', '==', true),
            limit(1)
          );
        } else {
          allTimeHighQuery = query(
            highScoresCollection,
            where('gameType', '==', gameType),
            where('isAllTimeHigh', '==', true),
            limit(1)
          );
        }
        
        // Get current all-time high score
        let isNewAllTimeHigh = false;
        let oldAllTimeHighId: string | null = null;
        
        try {
          const allTimeHighSnapshot = await getDocs(allTimeHighQuery);
          
          // Check if this is a new all-time high score
          if (allTimeHighSnapshot.empty) {
            // No existing all-time high, this is automatically the all-time high
            isNewAllTimeHigh = true;
          } else {
            const currentAllTimeHigh = allTimeHighSnapshot.docs[0].data() as (SurvivorPuzzleHighScore | FifteenPuzzleHighScore);
            oldAllTimeHighId = allTimeHighSnapshot.docs[0].id;
            
            // Better time is always a new all-time high
            if (highScore.score < currentAllTimeHigh.score) {
              isNewAllTimeHigh = true;
            } 
            // Equal time but fewer moves is also a new all-time high
            else if (
              highScore.score === currentAllTimeHigh.score && 
              highScore.moves !== undefined && 
              highScore.moves < currentAllTimeHigh.moves
            ) {
              isNewAllTimeHigh = true;
            }
          }
        } catch (error) {
          console.error("Error checking all-time high, treating as new all-time high:", error);
          isNewAllTimeHigh = true;
        }
        
        // Before adding the new score, delete the lowest score if needed
        if (!isNewAllTimeHigh) {
          // Pass category for FifteenPuzzle
          if (gameType === 'fifteenPuzzle' && highScore.category) {
            await this.deleteLowestScoreIfNeeded(gameType, { 
              scoreOrder: 'asc',
              category: highScore.category
            });
          } else {
            await this.deleteLowestScoreIfNeeded(gameType, { scoreOrder: 'asc' });
          }
        }
        
        // Set the appropriate properties for this high score
        highScore.isAllTimeHigh = isNewAllTimeHigh;
        
        // Add the new high score
        const docRef = await addDoc(highScoresCollection, {
          ...highScore,
          gameType, // Always include the game type
          timestamp: Date.now()
        });
        
        // If this is a new all-time high, update the old all-time high
        if (isNewAllTimeHigh && oldAllTimeHighId) {
          try {
            const oldDocRef = doc(highScoresCollection, oldAllTimeHighId);
            await updateDoc(oldDocRef, { isAllTimeHigh: false });
          } catch (error) {
            console.error("Error updating old all-time high:", error);
          }
        }
        
        return docRef.id;
      } 
      // For other game types, use similar logic
      else {
        // Check for all-time high scores of this game type
        let allTimeHighQuery;
        
        // For category-specific high scores
        if (highScore.category) {
          allTimeHighQuery = query(
            highScoresCollection,
            where('gameType', '==', gameType),
            where('category', '==', highScore.category),
            where('isAllTimeHigh', '==', true),
            limit(1)
          );
        } else if (gameType === 'wordGame' && highScore.wordGameType) {
          allTimeHighQuery = query(
            highScoresCollection,
            where('gameType', '==', gameType),
            where('wordGameType', '==', highScore.wordGameType),
            where('isAllTimeHigh', '==', true),
            limit(1)
          );
        } else {
          allTimeHighQuery = query(
            highScoresCollection,
            where('gameType', '==', gameType),
            where('isAllTimeHigh', '==', true),
            limit(1)
          );
        }
        
        // Get current all-time high score
        let isNewAllTimeHigh = false;
        let oldAllTimeHighId: string | null = null;
        
        try {
          const allTimeHighSnapshot = await getDocs(allTimeHighQuery);
          
          // Check if this is a new all-time high score
          if (allTimeHighSnapshot.empty) {
            // No existing all-time high, this is automatically the all-time high
            isNewAllTimeHigh = true;
          } else {
            const currentAllTimeHigh = allTimeHighSnapshot.docs[0].data() as HighScore;
            oldAllTimeHighId = allTimeHighSnapshot.docs[0].id;
            
            // Check if new score is better than current all-time high
            // For time-based scores (lower is better)
            if (highScore.scoreOrder === 'asc') {
              isNewAllTimeHigh = highScore.score < currentAllTimeHigh.score;
            } 
            // For regular scores (higher is better)
            else {
              isNewAllTimeHigh = highScore.score > currentAllTimeHigh.score;
            }
          }
        } catch (error) {
          console.error("Error checking all-time high, treating as new all-time high:", error);
          isNewAllTimeHigh = true;
        }
        
        // Before adding the new score, delete the lowest score if needed
        if (!isNewAllTimeHigh) {
          await this.deleteLowestScoreIfNeeded(gameType, { 
            scoreOrder: highScore.scoreOrder,
            category: highScore.category,
            wordGameType: highScore.wordGameType
          });
        }
        
        // Clean up the highScore object to remove any undefined values
        const cleanHighScore: Record<string, unknown> = {
          ...highScore,
          gameType, // Always include the game type
          timestamp: Date.now(),
          isAllTimeHigh: isNewAllTimeHigh
        };
        
        // Remove any properties with undefined values
        Object.keys(cleanHighScore).forEach(key => {
          if (cleanHighScore[key] === undefined) {
            delete cleanHighScore[key];
          }
        });
        
        // Remove any extra properties that aren't needed in Firestore
        delete cleanHighScore.scoreOrder;
        
        // Add the new high score
        const docRef = await addDoc(highScoresCollection, cleanHighScore);
        
        // If this is a new all-time high, update the old all-time high
        if (isNewAllTimeHigh && oldAllTimeHighId) {
          try {
            const oldDocRef = doc(highScoresCollection, oldAllTimeHighId);
            await updateDoc(oldDocRef, { isAllTimeHigh: false });
          } catch (error) {
            console.error("Error updating old all-time high:", error);
          }
        }
        
        return docRef.id;
      }
    } catch (error) {
      console.error("Error adding high score:", error);
      return null;
    }
  }

  // Add a survivor puzzle high score - updated to use the new time+moves ranking
  async addSurvivorPuzzleHighScore(
    name: string,
    timeTaken: number,
    moves: number
  ): Promise<string | null> {
    // Format time for display
    const formatTime = (ms: number): string => {
      const totalSeconds = Math.floor(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const hundredths = Math.floor((ms % 1000) / 10);
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;
    };
    
    try {
      // Check if this score qualifies for the high score list using both time and moves
      const qualifies = await this.checkHighScore(
        'survivorPuzzle', 
        timeTaken, 
        { scoreOrder: 'asc' }, // Lower time is better
        moves // Pass moves for tiebreaker
      );
      
      if (!qualifies) return null;
      
      // Create the high score object
      const highScore: HighScoreData = {
        name,
        score: timeTaken, // Raw score is the time in milliseconds
        formattedScore: formatTime(timeTaken),
        timestamp: Date.now(),
        isAllTimeHigh: false, // Will be set in addHighScore
        moves,
        timeTaken,
        scoreOrder: 'asc' // This will be removed before saving to Firestore
      };
      
      // Add the high score and return the ID
      return this.addHighScore('survivorPuzzle', highScore);
    } catch (error) {
      console.error("Error adding survivor puzzle high score:", error);
      return null;
    }
  }

  // Add a fifteen puzzle high score - with category for daily/infinite and moves tiebreaker
  async addFifteenPuzzleHighScore(
    name: string,
    timeTaken: number,
    moves: number,
    gameMode: 'daily' | 'infinite'
  ): Promise<string | null> {
    // Format time for display - now with hundredths of a second to match Survivor Puzzle
    const formatTime = (ms: number): string => {
      const totalSeconds = Math.floor(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const hundredths = Math.floor((ms % 1000) / 10);
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;
    };
    
    try {
      // Create category based on game mode
      const category = `fifteenPuzzle-${gameMode}`;
      
      // Check if this score qualifies for the high score list using both time and moves
      const qualifies = await this.checkHighScore(
        'fifteenPuzzle', 
        timeTaken, 
        { 
          scoreOrder: 'asc', // Lower time is better
          category: category
        }, 
        moves // Pass moves for tiebreaker
      );
      
      if (!qualifies) return null;
      
      // Create the high score object
      const highScore: HighScoreData = {
        name,
        score: timeTaken, // Raw score is the time in milliseconds
        formattedScore: formatTime(timeTaken),
        timestamp: Date.now(),
        isAllTimeHigh: false, // Will be set in addHighScore
        moves,
        timeTaken,
        category: category, // Store the category for filtering
        scoreOrder: 'asc' // This will be removed before saving to Firestore
      };
      
      // Add the high score and return the ID
      return this.addHighScore('fifteenPuzzle', highScore);
    } catch (error) {
      console.error("Error adding fifteen puzzle high score:", error);
      return null;
    }
  }

  // Other game-specific high score methods remain unchanged
  // ...
}

export const highScoreService = new HighScoreService();