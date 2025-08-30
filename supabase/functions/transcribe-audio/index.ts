import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log('🔄 Transcribe function starting with fresh deployment - v11.0 - Secret refreshed')

// Background transcription task
async function performTranscription(recordingId: string) {
  console.log('🚀 Starting background transcription for:', recordingId)
  
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  )

  try {
    // Get recording data
    console.log('📄 Fetching recording data...')
    const { data: recording, error: fetchError } = await supabaseClient
      .from('recordings')
      .select('*')
      .eq('id', recordingId)
      .maybeSingle()

    if (fetchError || !recording) {
      console.error('❌ Recording not found:', fetchError)
      await supabaseClient
        .from('recordings')
        .update({ 
          status: 'error',
          error_message: 'Recording not found' 
        })
        .eq('id', recordingId)
      return
    }

    console.log('✅ Recording found:', recording.audio_filename)

    // Update status to transcribing
    await supabaseClient
      .from('recordings')
      .update({ status: 'transcribing' })
      .eq('id', recordingId)

    // Get and validate OpenAI API key with detailed logging
    console.log('🔑 Checking environment variables...')
    const allEnvVars = Object.keys(Deno.env.toObject())
    console.log('📝 Available env vars:', allEnvVars.filter(key => key.includes('OPENAI') || key.includes('API')))
    console.log('📝 All env vars:', allEnvVars)
    
    const rawApiKey = Deno.env.get('OPENAI_API_KEY')
    console.log('🔑 Raw API key exists:', !!rawApiKey, 'Length:', rawApiKey?.length || 0)
    console.log('🔑 Raw API key value (first 10 chars):', rawApiKey ? rawApiKey.substring(0, 10) + '...' : 'null')
    
    if (!rawApiKey || rawApiKey.trim() === '') {
      console.error('❌ OpenAI API key is missing or empty')
      throw new Error('OpenAI API key not configured')
    }
    
    const openaiApiKey = rawApiKey.trim()
    console.log('✅ API key validation - Length:', openaiApiKey.length, 'Starts with sk-:', openaiApiKey.startsWith('sk-'))
    
    if (!openaiApiKey.startsWith('sk-') || openaiApiKey.length < 40) {
      console.error('❌ Invalid OpenAI API key format - length:', openaiApiKey.length, 'starts with sk-:', openaiApiKey.startsWith('sk-'))
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
        'Authorization': `Bearer ${openaiApiKey}`,
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
        speaker_count: 2
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
  }
}

serve(async (req) => {
  console.log('🔄 Function restarted with updated secrets - timestamp:', new Date().toISOString())
  
  // Immediate API key check at startup
  const startupApiKey = Deno.env.get('OPENAI_API_KEY')
  console.log('🔑 Startup API key check:', {
    exists: !!startupApiKey,
    length: startupApiKey?.length || 0,
    firstChars: startupApiKey ? startupApiKey.substring(0, 10) : 'null'
  })
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { recordingId } = await req.json()
    
    if (!recordingId) {
      return new Response(
        JSON.stringify({ error: 'Recording ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🎬 Starting background transcription for recording:', recordingId)
    
    // Start background transcription task
    if ('EdgeRuntime' in globalThis) {
      console.log('🌐 Using EdgeRuntime.waitUntil for background task')
      EdgeRuntime.waitUntil(performTranscription(recordingId))
    } else {
      console.log('🏠 Using fallback for local development')
      // Fallback for local development
      performTranscription(recordingId).catch(console.error)
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