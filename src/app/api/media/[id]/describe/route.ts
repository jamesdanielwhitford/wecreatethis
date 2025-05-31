// src/app/api/media/[id]/describe/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to download file from Supabase storage
async function downloadImageFile(storagePath: string): Promise<Blob> {
  const { data, error } = await supabase.storage
    .from('note-media')
    .download(storagePath);
  
  if (error) throw error;
  if (!data) throw new Error('No file data received');
  
  return data;
}

// Helper function to resize image and convert to base64
async function resizeImageToBase64(blob: Blob, maxSize: number = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to base64
      canvas.toBlob((resizedBlob) => {
        if (!resizedBlob) {
          reject(new Error('Failed to resize image'));
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          // Remove data:image/jpeg;base64, prefix
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(resizedBlob);
      }, 'image/jpeg', 0.8);
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}

// Alternative server-side image processing (simpler approach)
async function convertBlobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

// POST /api/media/[id]/describe - Generate AI description for image
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the media attachment
    const { data: attachment, error: fetchError } = await supabase
      .from('media_attachments')
      .select('*')
      .eq('id', params.id)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (!attachment) {
      return NextResponse.json(
        { error: 'Media attachment not found' },
        { status: 404 }
      );
    }

    // Check if it's an image file
    if (attachment.media_type !== 'image') {
      return NextResponse.json(
        { error: 'Only image files can be described' },
        { status: 400 }
      );
    }

    // Update status to pending
    const { error: updateError } = await supabase
      .from('media_attachments')
      .update({ 
        description_status: 'pending',
        description_error: null
      })
      .eq('id', params.id);
    
    if (updateError) throw updateError;

    try {
      // Download the image file from storage
      const imageBlob = await downloadImageFile(attachment.storage_path);
      
      // Convert to base64 (simplified approach - in production you might want to resize)
      const base64Image = await convertBlobToBase64(imageBlob);
      
      // Validate file size (OpenAI has limits)
      const maxSize = 20 * 1024 * 1024; // 20MB
      if (imageBlob.size > maxSize) {
        throw new Error('Image file too large for description (max 20MB)');
      }

      // Call OpenAI Vision API
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Use the vision-capable model
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please provide a clear, concise description of this image. Focus on the main subjects, objects, setting, and any important details. Keep it informative but brief (1-3 sentences)."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${attachment.mime_type};base64,${base64Image}`,
                  detail: "low" // Use low detail to save costs
                }
              }
            ]
          }
        ],
        max_tokens: 150
      });

      const description = response.choices[0]?.message?.content;

      if (!description) {
        throw new Error('No description generated');
      }

      // Update the database with the description
      const { data: updatedAttachment, error: finalUpdateError } = await supabase
        .from('media_attachments')
        .update({
          description: description,
          ai_generated_description: true,
          description_status: 'completed',
          description_error: null,
          described_at: new Date().toISOString()
        })
        .eq('id', params.id)
        .select()
        .single();

      if (finalUpdateError) throw finalUpdateError;

      // Add URL for convenience
      const result = {
        ...updatedAttachment,
        url: supabase.storage.from('note-media').getPublicUrl(updatedAttachment.storage_path).data.publicUrl
      };

      return NextResponse.json(result);

    } catch (descriptionError) {
      console.error('Description error:', descriptionError);
      
      // Update status to failed
      await supabase
        .from('media_attachments')
        .update({
          description_status: 'failed',
          description_error: descriptionError instanceof Error 
            ? descriptionError.message 
            : 'Unknown description error'
        })
        .eq('id', params.id);

      throw descriptionError;
    }

  } catch (error) {
    console.error('Error in image description:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'Failed to process image description' 
      },
      { status: 500 }
    );
  }
}

// PUT /api/media/[id]/describe - Update description manually
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { description } = body;

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    // Update the database with the manual description
    const { data: updatedAttachment, error } = await supabase
      .from('media_attachments')
      .update({
        description: description.trim(),
        ai_generated_description: false,
        description_status: 'completed',
        description_error: null,
        described_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    // Add URL for convenience
    const result = {
      ...updatedAttachment,
      url: supabase.storage.from('note-media').getPublicUrl(updatedAttachment.storage_path).data.publicUrl
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error updating description:', error);
    return NextResponse.json(
      { error: 'Failed to update description' },
      { status: 500 }
    );
  }
}