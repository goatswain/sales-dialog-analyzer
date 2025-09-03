import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log('🎤 Transcribe Audio v2 - Clean Implementation Started')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get JWT token from Authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify user authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      console.error('Authentication failed:', userError)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication', code: 'INVALID_TOKEN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('✅ User authenticated:', user.id)

    // Parse request body
    const { recordingId } = await req.json()
    
    if (!recordingId) {
      return new Response(
        JSON.stringify({ error: 'Recording ID required', code: 'MISSING_RECORDING_ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use server-side OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key not configured on server', 
          code: 'SERVER_API_KEY_MISSING',
          message: 'Server configuration error - please contact support'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🎬 Starting transcription for recording:', recordingId)

    // Start background transcription
    EdgeRuntime.waitUntil(performTranscription(recordingId, openaiApiKey, user.id))

    // Return immediate response
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Transcription started successfully',
        recordingId: recordingId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Request error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        code: 'SERVER_ERROR',
        message: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function performTranscription(recordingId: string, apiKey: string, userId: string) {
  console.log('🚀 Background transcription started for:', recordingId)
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  try {
    // Get recording data
    const { data: recording, error: fetchError } = await supabase
      .from('recordings')
      .select('*')
      .eq('id', recordingId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !recording) {
      console.error('❌ Recording not found:', fetchError)
      await updateRecordingStatus(supabase, recordingId, userId, 'error', 'Recording not found')
      return
    }

    console.log('✅ Recording found:', recording.audio_filename)

    // Update status to transcribing
    await updateRecordingStatus(supabase, recordingId, userId, 'transcribing')

    // Download audio file
    const { data: audioData, error: downloadError } = await supabase.storage
      .from('audio-recordings')
      .download(recording.audio_filename)

    if (downloadError || !audioData) {
      console.error('❌ Download failed:', downloadError)
      await updateRecordingStatus(supabase, recordingId, userId, 'error', 'Failed to download audio file')
      return
    }

    console.log('✅ Audio downloaded, size:', audioData.size, 'bytes')

    // Prepare for Whisper API
    const formData = new FormData()
    formData.append('file', audioData, recording.audio_filename)
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'verbose_json')
    formData.append('timestamp_granularities[]', 'segment')

    console.log('🎤 Calling Whisper API...')

    // Call OpenAI Whisper API
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    })

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text()
      console.error('❌ Whisper API failed:', whisperResponse.status, errorText)
      await updateRecordingStatus(supabase, recordingId, userId, 'error', `Whisper API error: ${whisperResponse.status}`)
      return
    }

    const result = await whisperResponse.json()
    console.log('✅ Transcription completed, length:', result.text?.length)

    // Process segments
    const segments = result.segments?.map((segment: any, index: number) => ({
      start_time: segment.start,
      end_time: segment.end,
      text: segment.text.trim(),
      speaker: `Speaker ${(index % 2) + 1}`
    })) || []

    // Save transcript
    const { error: transcriptError } = await supabase
      .from('transcripts')
      .insert({
        recording_id: recordingId,
        text: result.text,
        segments: segments,
        speaker_count: 2,
        user_id: userId
      })

    if (transcriptError) {
      console.error('❌ Failed to save transcript:', transcriptError)
      await updateRecordingStatus(supabase, recordingId, userId, 'error', 'Failed to save transcript')
      return
    }

    // Update recording as completed
    await supabase
      .from('recordings')
      .update({ 
        status: 'completed',
        duration_seconds: Math.round(result.duration || 0)
      })
      .eq('id', recordingId)
      .eq('user_id', userId)

    console.log('🎉 Transcription completed successfully!')

  } catch (error) {
    console.error('💥 Transcription error:', error)
    await updateRecordingStatus(supabase, recordingId, userId, 'error', error.message)
  }
}

async function updateRecordingStatus(supabase: any, recordingId: string, userId: string, status: string, errorMessage?: string) {
  const updateData: any = { status }
  if (errorMessage) {
    updateData.error_message = errorMessage
  }
  
  await supabase
    .from('recordings')
    .update(updateData)
    .eq('id', recordingId)
    .eq('user_id', userId)
}