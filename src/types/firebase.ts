// src/types/firebase.ts
export interface Post {
    id: string;
    date: string;
    imageUrl: string;
    caption?: string;
    prompt: string;
    companyName: string;
    companyLogoUrl?: string;
    createdAt: number;
  }
  
  export interface FirebaseError {
    code: string;
    message: string;
  }