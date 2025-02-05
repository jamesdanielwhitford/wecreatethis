// src/types/firebase.ts
export interface Post {
  id: string;
  date: string;
  imageUrl: string;
  caption?: string;
  prompt: string;
  imageCompanyName: string;
  imageCompanyUrl?: string;
  promptCompanyName: string;
  promptCompanyUrl?: string;
  promptIsContribution: boolean;
  createdAt: number;
}

export interface FirebaseError {
  code: string;
  message: string;
}