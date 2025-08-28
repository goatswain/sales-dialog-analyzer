import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Get recording data
    const { data: recording, error: fetchError } = await supabaseClient
      .from('recordings')
      .select('*')
      .eq('id', recordingId)
      .single()

    if (fetchError || !recording) {
      return new Response(
        JSON.stringify({ error: 'Recording not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update status to transcribing
    await supabaseClient
      .from('recordings')
      .update({ status: 'transcribing' })
      .eq('id', recordingId)

    // Get OpenAI API key from secrets
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('OpenAI API key not found in environment variables')
      throw new Error('OpenAI API key not configured')
    }
    console.log('OpenAI API key found:', openaiApiKey ? 'Yes' : 'No')

    // Download audio file from Supabase Storage
    const { data: audioData, error: downloadError } = await supabaseClient.storage
      .from('audio-recordings')
      .download(recording.audio_filename)

    if (downloadError || !audioData) {
      throw new Error('Failed to download audio file')
    }

    // Prepare form data for Whisper API
    const formData = new FormData()
    formData.append('file', audioData, recording.audio_filename)
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'verbose_json')
    formData.append('timestamp_granularities[]', 'segment')

    // Call OpenAI Whisper API
    console.log('Calling Whisper API with file:', recording.audio_filename)
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    })
    
    console.log('Whisper API response status:', whisperResponse.status)

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text()
      console.error('Whisper API error:', errorText)
      throw new Error(`Whisper API failed: ${whisperResponse.status}`)
    }

    const transcriptionResult = await whisperResponse.json()

    // Process segments for easier frontend use
    const segments = transcriptionResult.segments?.map((segment: any, index: number) => ({
      start_time: segment.start,
      end_time: segment.end,
      text: segment.text.trim(),
      speaker: `Speaker ${(index % 2) + 1}` // Simple alternating speaker assignment
    })) || []

    // Save transcript to database
    const { error: transcriptError } = await supabaseClient
      .from('transcripts')
      .insert({
        recording_id: recordingId,
        text: transcriptionResult.text,
        segments: segments,
        speaker_count: 2
      })

    if (transcriptError) {
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

    return new Response(
      JSON.stringify({ 
        success: true,
        transcript: transcriptionResult.text,
        segments: segments,
        duration: transcriptionResult.duration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Transcription error:', error)
    
    // Update recording status to error
    if (req.url.includes('recordingId')) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      )
      
      const body = await req.json().catch(() => ({}))
      if (body.recordingId) {
        await supabaseClient
          .from('recordings')
          .update({ 
            status: 'error',
            error_message: error.message 
          })
          .eq('id', body.recordingId)
      }
    }

    return new Response(
      JSON.stringify({ error: error.message || 'Transcription failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})