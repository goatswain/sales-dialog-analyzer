# Sales Recorder Setup Guide

## 1. Database Setup

Go to your Supabase dashboard > SQL Editor and run this SQL:

```sql
-- Create recordings table
CREATE TABLE recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT,
  duration_seconds INTEGER,
  audio_url TEXT,
  audio_filename TEXT,
  file_size_bytes INTEGER,
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'transcribing', 'completed', 'error')),
  error_message TEXT
);

-- Create transcripts table
CREATE TABLE transcripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recording_id UUID REFERENCES recordings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  text TEXT NOT NULL,
  segments JSONB,
  speaker_count INTEGER DEFAULT 1
);

-- Create conversation_notes table
CREATE TABLE conversation_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recording_id UUID REFERENCES recordings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  timestamps JSONB
);

-- Enable Row Level Security
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_notes ENABLE ROW LEVEL SECURITY;

-- Create policies (open for single-user MVP)
CREATE POLICY "Allow all operations on recordings" ON recordings FOR ALL USING (true);
CREATE POLICY "Allow all operations on transcripts" ON transcripts FOR ALL USING (true);
CREATE POLICY "Allow all operations on conversation_notes" ON conversation_notes FOR ALL USING (true);
```

## 2. Storage Setup

1. Go to Supabase dashboard > Storage
2. Create a new bucket called `audio-recordings`
3. Make it **public** (for MVP simplicity)
4. Go to Storage > Policies and create this policy:

```sql
-- Allow public uploads to audio-recordings bucket
CREATE POLICY "Allow public uploads" ON storage.objects
FOR INSERT TO public
WITH CHECK (bucket_id = 'audio-recordings');

-- Allow public downloads from audio-recordings bucket  
CREATE POLICY "Allow public downloads" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'audio-recordings');
```

## 3. Edge Functions Setup

The edge functions are already created. Make sure they're deployed:
- `upload-audio`
- `transcribe-audio` 
- `analyze-conversation`

## 4. Environment Variables

The OpenAI API key has been added to your Supabase secrets. You can verify it's set by going to:
Supabase Dashboard > Edge Functions > Settings > Secrets

## 5. Frontend Environment Variables

Create these environment variables in your project settings:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 6. Testing the App

1. Upload or record an audio file
2. Wait for transcription to complete (status will update automatically)
3. Click on a completed recording to view transcript
4. Ask questions about the conversation using the chat interface

## Features Included

- ✅ Audio recording (browser MediaRecorder)
- ✅ File upload (MP3, WAV, M4A)
- ✅ Automatic transcription via OpenAI Whisper
- ✅ Real-time status updates
- ✅ Transcript viewer with timestamps
- ✅ AI-powered conversation analysis
- ✅ Click timestamps to jump in audio
- ✅ Suggested questions and follow-up templates
- ✅ Copy functionality for responses

## Troubleshooting

**Upload fails**: Check storage bucket exists and is public
**Transcription fails**: Verify OPENAI_API_KEY is set in Supabase secrets  
**No recordings show**: Check database tables were created properly
**Audio won't play**: Ensure audio URLs are publicly accessible