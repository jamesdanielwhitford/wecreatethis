// src/utils/firebase/highScoreService.ts (Updated for SurvivorPuzzle)
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  updateDoc
} from 'firebase/firestore';
import { db } from './config';
import { 
  HighScore, 
  GameType, 
  WeekData,
  // SurvivorPuzzleHighScore,
  // FifteenPuzzleHighScore,
  // PicturePuzzleHighScore,
  // WordGameHighScore
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
  weekNumber?: number;
  isAllTimeHigh?: boolean;
  moves?: number;
  timeTaken?: number;
  scoreOrder?: 'asc' | 'desc';
  category?: string;
  wordGameType?: string;
  gameType?: GameType;
}

class HighScoreService {
  private readonly WEEK_DOC_ID = 'current-week';

  // Get the collection reference for all high scores
  private getHighScoresCollection() {
    return collection(db, 'highScores');
  }

  // Get the current week number
  async getCurrentWeekNumber(): Promise<number> {
    const weekDocRef = doc(db, 'weekData', this.WEEK_DOC_ID);
    
    try {
      const weekDoc = await getDoc(weekDocRef);
      
      if (weekDoc.exists()) {
        const weekData = weekDoc.data() as WeekData;
        
        // Check if we need to update the week
        const now = Date.now();
        const lastUpdated = weekData.lastUpdated;
        const daysSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60 * 24);
        
        // If it's been more than 7 days, update the week number
        if (daysSinceUpdate >= 7) {
          const newWeekNumber = weekData.currentWeekNumber + 1;
          await updateDoc(weekDocRef, { 
            currentWeekNumber: newWeekNumber,
            lastUpdated: now
          });
          return newWeekNumber;
        }
        
        return weekData.currentWeekNumber;
      } else {
        // Initialize week data if it doesn't exist
        const initialWeekData: WeekData = {
          currentWeekNumber: 1,
          lastUpdated: Date.now()
        };
        await setDoc(weekDocRef, initialWeekData);
        return 1;
      }
    } catch (error) {
      console.error("Error getting current week number:", error);
      // Return a default week number if there's an error
      return 1;
    }
  }

  // Get high scores for a specific game
  async getHighScores(gameType: GameType, options?: HighScoreOptions): Promise<HighScore[]> {
    try {
      const weekNumber = await this.getCurrentWeekNumber();
      
      // Start with a simple query to avoid index issues initially
      const highScoresCollection = this.getHighScoresCollection();
      let highScoresQuery;
      
      // If we have specific options, use a more complex query (requires index)
      if (gameType === 'survivorPuzzle') {
        // For survivorPuzzle, always sort by time (lower is better)
        highScoresQuery = query(
          highScoresCollection,
          where('gameType', '==', gameType),
          where('weekNumber', 'in', [weekNumber, 0]), // 0 for all-time high scores
          orderBy('score', 'asc'), // Lower time is better
          limit(10)
        );
      } else if (options?.category && gameType === 'picturePuzzle') {
        // For picturePuzzle, filter by category
        highScoresQuery = query(
          highScoresCollection,
          where('gameType', '==', gameType),
          where('category', '==', options.category),
          where('weekNumber', 'in', [weekNumber, 0]),
          orderBy('score', options?.scoreOrder || 'desc'),
          limit(10)
        );
      } else if (options?.wordGameType && gameType === 'wordGame') {
        // For wordGame, filter by word game type
        highScoresQuery = query(
          highScoresCollection,
          where('gameType', '==', gameType),
          where('wordGameType', '==', options.wordGameType),
          where('weekNumber', 'in', [weekNumber, 0]),
          orderBy('score', options?.scoreOrder || 'desc'),
          limit(10)
        );
      } else {
        // Simple query for all scores of this game type
        highScoresQuery = query(
          highScoresCollection,
          where('gameType', '==', gameType),
          where('weekNumber', 'in', [weekNumber, 0]),
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
  async checkHighScore(gameType: GameType, score: number, options?: HighScoreOptions): Promise<boolean> {
    try {
      const highScores = await this.getHighScores(gameType, options);
      
      // If there are no scores yet, any score qualifies
      if (highScores.length === 0) {
        return true;
      }
      
      // If there are fewer than 10 scores, any score qualifies
      if (highScores.length < 10) {
        return true;
      }
      
      // For time-based scores where lower is better
      if (options?.scoreOrder === 'asc' || gameType === 'survivorPuzzle') {
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

  // Add a new high score
  async addHighScore(gameType: GameType, highScore: HighScoreData): Promise<string | null> {
    try {
      const weekNumber = await this.getCurrentWeekNumber();
      
      // Get the collection reference
      const highScoresCollection = this.getHighScoresCollection();
      
      // Check for all-time high scores of this game type
      const allTimeHighQuery = query(
        highScoresCollection,
        where('gameType', '==', gameType),
        where('isAllTimeHigh', '==', true),
        limit(1)
      );
      
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
          if (highScore.scoreOrder === 'asc' || gameType === 'survivorPuzzle') {
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
      
      // Clean up the highScore object to remove any undefined values
      const cleanHighScore: Record<string, unknown> = {
        ...highScore,
        gameType, // Always include the game type
        timestamp: Date.now(),
        weekNumber: isNewAllTimeHigh ? 0 : weekNumber, // 0 means all-time high
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
          await updateDoc(oldDocRef, { 
            isAllTimeHigh: false,
            weekNumber: weekNumber // Move to current week
          });
        } catch (error) {
          console.error("Error updating old all-time high:", error);
        }
      }
      
      return docRef.id;
    } catch (error) {
      console.error("Error adding high score:", error);
      return null;
    }
  }

  // Add a survivor puzzle high score - updated for time-based scoring only
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
      // Check if this score qualifies for the high score list
      const qualifies = await this.checkHighScore('survivorPuzzle', timeTaken, { 
        scoreOrder: 'asc' // Lower time is better
      });
      
      if (!qualifies) return null;
      
      // Create the high score object
      const highScore: HighScoreData = {
        name,
        score: timeTaken, // Raw score is the time in milliseconds
        formattedScore: formatTime(timeTaken),
        timestamp: Date.now(),
        weekNumber: 0, // Will be set in addHighScore
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

  // Other game-specific high score methods remain unchanged
  // ...
}

export const highScoreService = new HighScoreService();