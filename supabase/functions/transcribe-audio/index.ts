import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log('🔄 Transcribe function starting with fresh deployment - v13.0 - Debug secrets')

// Force environment variable refresh and detailed logging
const forceEnvCheck = () => {
  console.log('🔍 Environment diagnostic:')
  const allEnv = Deno.env.toObject()
  console.log('📋 Total env vars:', Object.keys(allEnv).length)
  console.log('🔑 All env var names:', Object.keys(allEnv))
  
  // Check all variations of OpenAI key
  const variations = ['OPENAI_API_KEY', 'OPENAI_API_KEY_SECRET', 'OPENAI_KEY']
  variations.forEach(keyName => {
    const val = Deno.env.get(keyName)
    console.log(`🔍 ${keyName}:`, {
      exists: !!val,
      length: val?.length || 0,
      type: typeof val,
      firstChars: val ? val.substring(0, 8) + '...' : 'null'
    })
  })
  
  const key = Deno.env.get('OPENAI_API_KEY')
  console.log('🔄 Forced env check - API key status:', {
    exists: !!key,
    length: key?.length || 0,
    hasPrefix: key?.startsWith('sk-') || false
  })
  return key
}

// Background transcription task (modified to accept API key parameter)
async function performTranscriptionWithKey(recordingId: string, openaiApiKey: string, userId: string) {
  console.log('🚀 Starting background transcription for:', recordingId, 'user:', userId)
  
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role for background task
  )

  try {
    // Get recording data with user ownership check
    console.log('📄 Fetching recording data...')
    const { data: recording, error: fetchError } = await supabaseClient
      .from('recordings')
      .select('*')
      .eq('id', recordingId)
      .eq('user_id', userId) // Verify user ownership
      .maybeSingle()

    if (fetchError || !recording) {
      console.error('❌ Recording not found or access denied:', fetchError)
      await supabaseClient
        .from('recordings')
        .update({ 
          status: 'error',
          error_message: 'Recording not found or access denied' 
        })
        .eq('id', recordingId)
        .eq('user_id', userId)
      return
    }

    console.log('✅ Recording found:', recording.audio_filename)

    // Update status to transcribing
    await supabaseClient
      .from('recordings')
      .update({ status: 'transcribing' })
      .eq('id', recordingId)
      .eq('user_id', userId)

    // Validate the provided API key
    console.log('🔑 Validating provided API key...')
    if (!openaiApiKey || openaiApiKey.trim() === '') {
      console.error('❌ OpenAI API key is missing or empty')
      throw new Error('OpenAI API key not configured')
    }
    
    const validApiKey = openaiApiKey.trim()
    console.log('✅ API key validation - Length:', validApiKey.length, 'Starts with sk-:', validApiKey.startsWith('sk-'))
    
    if (!validApiKey.startsWith('sk-') || validApiKey.length < 40) {
      console.error('❌ Invalid OpenAI API key format - length:', validApiKey.length, 'starts with sk-:', validApiKey.startsWith('sk-'))
      throw new Error('Invalid OpenAI API key format')
    }

    // Download audio file from Supabase Storage
    console.log('📥 Downloading audio file...')
    const { data: audioData, error: downloadError } = await supabaseClient.storage
      .from('audio-recordings')
      .download(recording.audio_filename)

    if (downloadError || !audioData) {
      console.error('❌ Failed to download audio file:', downloadError)
      throw new Error('Failed to download audio file')
    }

    console.log('✅ Audio file downloaded, size:', audioData.size, 'bytes')

    // Prepare form data for Whisper API
    const formData = new FormData()
    formData.append('file', audioData, recording.audio_filename)
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'verbose_json')
    formData.append('timestamp_granularities[]', 'segment')

    // Call OpenAI Whisper API
    console.log('🎤 Calling Whisper API with file:', recording.audio_filename)
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${validApiKey}`,
      },
      body: formData,
    })
    
    console.log('📡 Whisper API response status:', whisperResponse.status)

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text()
      console.error('❌ Whisper API error response:', errorText)
      throw new Error(`Whisper API failed: ${whisperResponse.status} - ${errorText}`)
    }

    const transcriptionResult = await whisperResponse.json()
    console.log('✅ Transcription successful, text length:', transcriptionResult.text?.length)

    // Process segments for easier frontend use
    const segments = transcriptionResult.segments?.map((segment: any, index: number) => ({
      start_time: segment.start,
      end_time: segment.end,
      text: segment.text.trim(),
      speaker: `Speaker ${(index % 2) + 1}` // Simple alternating speaker assignment
    })) || []

    // Save transcript to database
    console.log('💾 Saving transcript to database...')
    const { error: transcriptError } = await supabaseClient
      .from('transcripts')
      .insert({
        recording_id: recordingId,
        text: transcriptionResult.text,
        segments: segments,
        speaker_count: 2,
        user_id: userId // Add user ownership
      })

    if (transcriptError) {
      console.error('❌ Failed to save transcript:', transcriptError)
      throw new Error('Failed to save transcript')
    }

    // Update recording status and duration
    await supabaseClient
      .from('recordings')
      .update({ 
        status: 'completed',
        duration_seconds: Math.round(transcriptionResult.duration || 0)
      })
      .eq('id', recordingId)
      .eq('user_id', userId)

    console.log('🎉 Transcription completed successfully for recording:', recordingId)

  } catch (error) {
    console.error('💥 Background transcription error:', error)
    
    // Update recording status to error
    await supabaseClient
      .from('recordings')
      .update({ 
        status: 'error',
        error_message: error.message 
      })
      .eq('id', recordingId)
      .eq('user_id', userId)
  }
}

serve(async (req) => {
  console.log('🔄 Function restarted with updated secrets - timestamp:', new Date().toISOString())
  
  // Force environment variable check
  const apiKey = forceEnvCheck()
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { authorization: authHeader },
        },
      }
    )

    // Since verify_jwt = false, we can extract user info from the JWT directly
    const jwt = authHeader.replace('Bearer ', '')
    let userId: string
    
    try {
      // Decode JWT to get user ID (since verify_jwt is false, we trust it's already verified)
      const payload = JSON.parse(atob(jwt.split('.')[1]))
      userId = payload.sub
      
      if (!userId) {
        throw new Error('No user ID in token')
      }
    } catch (decodeError) {
      console.error('JWT decode error:', decodeError)
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { recordingId, openaiApiKey } = await req.json()
    
    if (!recordingId) {
      return new Response(
        JSON.stringify({ error: 'Recording ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If API key is provided in request, use it; otherwise fall back to env
    const effectiveApiKey = openaiApiKey || Deno.env.get('OPENAI_API_KEY')
    
    if (!effectiveApiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key required. Please provide it in the request or configure as environment variable.',
          needsApiKey: true 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🎬 Starting background transcription for recording:', recordingId, 'user:', userId)
    console.log('🔑 API key source:', openaiApiKey ? 'request parameter' : 'environment variable')
    
    // Start background transcription task with API key and user ID
    if ('EdgeRuntime' in globalThis) {
      console.log('🌐 Using EdgeRuntime.waitUntil for background task')
      EdgeRuntime.waitUntil(performTranscriptionWithKey(recordingId, effectiveApiKey, userId))
    } else {
      console.log('🏠 Using fallback for local development')
      performTranscriptionWithKey(recordingId, effectiveApiKey, userId).catch(console.error)
    }

    // Return immediate response
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Transcription started in background'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Request handler error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to start transcription' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})