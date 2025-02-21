// src/apps/bossbitch/types/goal.types.ts

export interface IncomeSource {
    id: string;
    name: string;
    value: number;
    color: string;
  }
  
  export interface Goal {
    current: number;
    target: number;
    incomeSources: IncomeSource[];
  }
  
  export interface DailyGoal extends Goal {
    date: string;
  }
  
  export interface MonthlyGoal extends Goal {
    month: string;
    year: number;
  }