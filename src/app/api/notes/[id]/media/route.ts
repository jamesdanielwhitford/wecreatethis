// src/app/api/notes/[id]/media/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { aiMatchingService } from '@/apps/beautifulmind/utils/ai-matching';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to get media URL
const getMediaUrl = (path: string): string => {
  const { data } = supabase.storage.from('note-media').getPublicUrl(path);
  return data.publicUrl;
};

// Helper function to auto-process embeddings
async function triggerEmbeddingProcessing(): Promise<void> {
  try {
    console.log('Triggering embedding processing after media upload...');
    
    // Use a separate fetch to trigger the processing endpoint
    fetch('/api/embeddings/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.EMBEDDING_API_KEY || 'auto-process'
      },
      body: JSON.stringify({ batchSize: 15 })
    }).catch(err => {
      console.warn('Background embedding processing failed:', err);
    });
  } catch (error) {
    console.warn('Failed to trigger embedding processing:', error);
    // Don't throw - this is a background process
  }
}

// Helper function to get audio duration
async function getAudioDuration(buffer: ArrayBuffer): Promise<number | undefined> {
  // Note: In a production environment, you'd want to use a proper audio processing library
  // For now, we'll return undefined and let the client handle duration
  return undefined;
}

// Helper function to get video duration  
async function getVideoDuration(buffer: ArrayBuffer): Promise<number | undefined> {
  // Note: In a production environment, you'd want to use a proper video processing library
  // For now, we'll return undefined and let the client handle duration
  return undefined;
}

// Helper function to get image dimensions
async function getImageDimensions(buffer: ArrayBuffer): Promise<{ width?: number; height?: number }> {
  // Note: In a production environment, you'd want to use a proper image processing library
  // For now, we'll return empty object and let the client handle dimensions
  return {};
}

// Helper function to transcribe audio file
async function transcribeAudioFile(file: File): Promise<string> {
  // Validate file size (Whisper has a 25MB limit)
  const maxSize = 25 * 1024 * 1024; // 25MB
  if (file.size > maxSize) {
    throw new Error('Audio file too large for transcription (max 25MB)');
  }

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en', // You could make this configurable
      response_format: 'text',
    });

    return transcription;
  } catch (error) {
    console.error('OpenAI Whisper error:', error);
    throw new Error('Failed to transcribe audio');
  }
}

// Helper function to generate AI description for image
async function generateImageDescription(file: File): Promise<string> {
  try {
    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    
    // Call OpenAI Vision API
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
                url: `data:${file.type};base64,${base64Image}`,
                detail: "low"
              }
            }
          ]
        }
      ],
      max_tokens: 150
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Failed to generate image description:', error);
    throw error;
  }
}

// POST /api/notes/[id]/media - Upload media to a note with AI categorization
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }
    
    // Get note context for AI categorization
    const { data: noteData } = await supabase
      .from('notes')
      .select('title, content')
      .eq('id', params.id)
      .single();
    
    const noteContext = noteData ? { title: noteData.title, content: noteData.content } : undefined;
    
    // Get existing folders for AI context
    const existingFolders = await aiMatchingService.getExistingFolders();
    
    const uploadedAttachments = [];
    let shouldTriggerEmbeddings = false;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check if transcription was requested for this file
      const shouldTranscribe = formData.get(`transcribe_${i}`) === 'true';
      
      // Check if description was requested for this file
      const shouldDescribe = formData.get(`describe_${i}`) === 'true';
      const manualDescription = formData.get(`description_${i}`) as string;
      
      // Generate unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${params.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      // Convert File to ArrayBuffer for upload
      const arrayBuffer = await file.arrayBuffer();
      
      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('note-media')
        .upload(fileName, arrayBuffer, {
          contentType: file.type
        });
      
      if (uploadError) throw uploadError;
      
      // Determine media type
      let mediaType: 'image' | 'video' | 'audio';
      if (file.type.startsWith('video/')) {
        mediaType = 'video';
      } else if (file.type.startsWith('audio/')) {
        mediaType = 'audio';
      } else {
        mediaType = 'image';
      }
      
      // Get media-specific metadata
      let metadata = {};
      
      if (mediaType === 'image') {
        metadata = await getImageDimensions(arrayBuffer);
      } else if (mediaType === 'video') {
        const duration = await getVideoDuration(arrayBuffer);
        if (duration) {
          metadata = { duration };
        }
      } else if (mediaType === 'audio') {
        const duration = await getAudioDuration(arrayBuffer);
        if (duration) {
          metadata = { duration };
        }
      }
      
      // Prepare description data
      let descriptionData = {};
      if (mediaType === 'image') {
        if (manualDescription && manualDescription.trim()) {
          // Manual description provided
          descriptionData = {
            description: manualDescription.trim(),
            ai_generated_description: false,
            description_status: 'completed',
            described_at: new Date().toISOString()
          };
          shouldTriggerEmbeddings = true; // Description provided, will need embedding
        } else if (shouldDescribe) {
          // AI description requested
          descriptionData = {
            description_status: 'pending',
            description_error: null
          };
        } else {
          // No description requested
          descriptionData = {
            description_status: 'not_started'
          };
        }
      }
      
      // Prepare transcription data
      let transcriptionData = {};
      if (mediaType === 'audio' && shouldTranscribe) {
        try {
          // Set initial transcription status
          transcriptionData = {
            transcription_status: 'pending',
            transcription_error: null
          };
          
          // Create media attachment record first
          const attachmentData = {
            note_id: params.id,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            storage_path: uploadData.path,
            media_type: mediaType,
            ...metadata,
            ...transcriptionData,
            ...descriptionData
          };
          
          const { data: attachment, error } = await supabase
            .from('media_attachments')
            .insert([attachmentData])
            .select()
            .single();
          
          if (error) {
            // Clean up uploaded file on error
            await supabase.storage.from('note-media').remove([uploadData.path]);
            throw error;
          }

          // Start transcription in background
          try {
            const transcriptionText = await transcribeAudioFile(file);
            
            // Update with completed transcription
            const { data: updatedAttachment, error: updateError } = await supabase
              .from('media_attachments')
              .update({
                transcription_text: transcriptionText,
                transcription_status: 'completed',
                transcribed_at: new Date().toISOString()
              })
              .eq('id', attachment.id)
              .select()
              .single();

            if (updateError) throw updateError;

            shouldTriggerEmbeddings = true; // Transcription completed, will need embedding

            // Generate AI categorization for this media
            try {
              const aiResult = await aiMatchingService.generateMediaCategorization(
                { ...updatedAttachment, transcription_text: transcriptionText },
                noteContext,
                existingFolders
              );
              
              if (aiResult.description) {
                const { data: categorizedAttachment, error: categorizationError } = await supabase
                  .from('media_attachments')
                  .update({
                    ai_categorization_description: aiResult.description
                  })
                  .eq('id', attachment.id)
                  .select()
                  .single();

                if (categorizationError) throw categorizationError;
                
                // Queue embedding for AI categorization
                await aiMatchingService.queueEmbeddingGeneration('media_attachment', attachment.id, 'ai_categorization');
                updatedAttachment.ai_categorization_description = aiResult.description;
              }
            } catch (aiCategorizeError) {
              console.error('AI categorization failed for audio:', aiCategorizeError);
              // Continue without AI categorization
            }

            // Handle AI description for images
            let finalAttachment = updatedAttachment;
            if (mediaType === 'image' && shouldDescribe) {
              try {
                const description = await generateImageDescription(file);
                
                const { data: describedAttachment, error: describeError } = await supabase
                  .from('media_attachments')
                  .update({
                    description: description,
                    ai_generated_description: true,
                    description_status: 'completed',
                    described_at: new Date().toISOString()
                  })
                  .eq('id', attachment.id)
                  .select()
                  .single();

                if (describeError) throw describeError;
                finalAttachment = describedAttachment;
                shouldTriggerEmbeddings = true; // Description generated, will need embedding
              } catch (descriptionError) {
                console.error('Description failed:', descriptionError);
                
                await supabase
                  .from('media_attachments')
                  .update({
                    description_status: 'failed',
                    description_error: descriptionError instanceof Error 
                      ? descriptionError.message 
                      : 'Unknown description error'
                  })
                  .eq('id', attachment.id);
              }
            }

            // Add URLs for convenience
            const attachmentWithUrls = {
              ...finalAttachment,
              url: getMediaUrl(finalAttachment.storage_path),
              thumbnailUrl: finalAttachment.thumbnail_path ? getMediaUrl(finalAttachment.thumbnail_path) : undefined
            };

            uploadedAttachments.push(attachmentWithUrls);

          } catch (transcriptionError) {
            console.error('Transcription failed:', transcriptionError);
            
            // Update status to failed but keep the attachment
            await supabase
              .from('media_attachments')
              .update({
                transcription_status: 'failed',
                transcription_error: transcriptionError instanceof Error 
                  ? transcriptionError.message 
                  : 'Unknown transcription error'
              })
              .eq('id', attachment.id);

            // Add URLs for convenience
            const attachmentWithUrls = {
              ...attachment,
              transcription_status: 'failed',
              transcription_error: transcriptionError instanceof Error 
                ? transcriptionError.message 
                : 'Unknown transcription error',
              url: getMediaUrl(attachment.storage_path),
              thumbnailUrl: attachment.thumbnail_path ? getMediaUrl(attachment.thumbnail_path) : undefined
            };

            uploadedAttachments.push(attachmentWithUrls);
          }

        } catch (error) {
          console.error('Error setting up transcription:', error);
          // Fall back to regular upload without transcription
          transcriptionData = {
            transcription_status: 'failed',
            transcription_error: 'Failed to initialize transcription'
          };
        }
      } else {
        // Regular upload without transcription
        if (mediaType === 'audio') {
          transcriptionData = {
            transcription_status: 'not_started'
          };
        }
        
        // Create media attachment record
        const attachmentData = {
          note_id: params.id,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          storage_path: uploadData.path,
          media_type: mediaType,
          ...metadata,
          ...transcriptionData,
          ...descriptionData
        };
        
        const { data, error } = await supabase
          .from('media_attachments')
          .insert([attachmentData])
          .select()
          .single();
        
        if (error) {
          // Clean up uploaded file on error
          await supabase.storage.from('note-media').remove([uploadData.path]);
          throw error;
        }
        
        // Generate AI categorization for all media types
        try {
          const aiResult = await aiMatchingService.generateMediaCategorization(
            data,
            noteContext,
            existingFolders
          );
          
          if (aiResult.description) {
            const { data: categorizedAttachment, error: categorizationError } = await supabase
              .from('media_attachments')
              .update({
                ai_categorization_description: aiResult.description
              })
              .eq('id', data.id)
              .select()
              .single();

            if (!categorizationError) {
              data.ai_categorization_description = aiResult.description;
              // Queue embedding for AI categorization
              await aiMatchingService.queueEmbeddingGeneration('media_attachment', data.id, 'ai_categorization');
              shouldTriggerEmbeddings = true;
            }
          }
        } catch (aiCategorizeError) {
          console.error('AI categorization failed:', aiCategorizeError);
          // Continue without AI categorization
        }
        
        // Handle AI description for images
        let finalAttachment = data;
        if (mediaType === 'image' && shouldDescribe && !manualDescription?.trim()) {
          try {
            const description = await generateImageDescription(file);
            
            const { data: describedAttachment, error: describeError } = await supabase
              .from('media_attachments')
              .update({
                description: description,
                ai_generated_description: true,
                description_status: 'completed',
                described_at: new Date().toISOString()
              })
              .eq('id', data.id)
              .select()
              .single();

            if (describeError) throw describeError;
            finalAttachment = describedAttachment;
            shouldTriggerEmbeddings = true; // Description generated, will need embedding
          } catch (descriptionError) {
            console.error('Description failed:', descriptionError);
            
            await supabase
              .from('media_attachments')
              .update({
                description_status: 'failed',
                description_error: descriptionError instanceof Error 
                  ? descriptionError.message 
                  : 'Unknown description error'
              })
              .eq('id', data.id);
          }
        }
        
        // Add URLs for convenience
        const attachmentWithUrls = {
          ...finalAttachment,
          url: getMediaUrl(finalAttachment.storage_path),
          thumbnailUrl: finalAttachment.thumbnail_path ? getMediaUrl(finalAttachment.thumbnail_path) : undefined
        };
        
        uploadedAttachments.push(attachmentWithUrls);
      }
    }
    
    // Trigger embedding processing if any transcriptions, descriptions, or AI categorizations were created
    if (shouldTriggerEmbeddings) {
      setTimeout(() => {
        triggerEmbeddingProcessing();
      }, 2000); // Delay to ensure database commits are complete
    }
    
    return NextResponse.json(uploadedAttachments);
  } catch (error) {
    console.error('Error uploading media with AI categorization:', error);
    return NextResponse.json(
      { error: 'Failed to upload media' },
      { status: 500 }
    );
  }
}