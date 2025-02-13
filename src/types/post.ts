export type PostType = 'image' | 'video' | 'text';

export interface Post {
  id: string;
  type: PostType;
  content: string;
  alt?: string;
  createdAt: number;
}