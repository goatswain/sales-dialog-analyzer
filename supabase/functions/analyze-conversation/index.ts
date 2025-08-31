import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You are an expert sales coach and conversation analyst. The user will provide a clean transcript with timestamps and speaker labels. Answer user queries about the transcript with actionable, concise, and practical sales feedback. Always include, when relevant:

- A one-sentence summary.
- Key objections (if any).
- 3 practical improvement suggestions the seller can apply next time.
- Up to 5 timestamped references from the transcript to support the analysis.
- If the user asks for a follow-up message, provide 2 short, ready-to-send message templates.

Format your response as JSON with the following structure:
{
  "summary": "One sentence summary",
  "objections": ["objection 1", "objection 2"],
  "improvements": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "timestamps": [
    {"time": "00:01:15", "text": "relevant quote", "context": "brief context"},
    {"time": "00:03:22", "text": "another quote", "context": "context"}
  ],
  "followUpTemplates": ["template 1", "template 2"],
  "answer": "Direct answer to the user's question"
}`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { recordingId, question } = await req.json()
    
    if (!recordingId || !question) {
      return new Response(
        JSON.stringify({ error: 'Recording ID and question are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Get transcript data
    console.log('🔍 Looking for transcript with recording_id:', recordingId)
    const { data: transcript, error: fetchError } = await supabaseClient
      .from('transcripts')
      .select('text, segments')
      .eq('recording_id', recordingId)
      .single()
    
    console.log('📋 Transcript query result:', { data: transcript, error: fetchError })

    if (fetchError || !transcript) {
      return new Response(
        JSON.stringify({ error: 'Transcript not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Format transcript with timestamps for LLM
    const formattedTranscript = transcript.segments?.map((segment: any) => {
      const minutes = Math.floor(segment.start_time / 60)
      const seconds = Math.floor(segment.start_time % 60)
      const timestamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      return `${timestamp} - ${segment.speaker}: ${segment.text}`
    }).join('\n') || transcript.text

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: `Transcript:\n${formattedTranscript}\n\nQuestion: ${question}` 
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error('OpenAI API error:', errorText)
      throw new Error(`OpenAI API failed: ${openaiResponse.status}`)
    }

    const openaiResult = await openaiResponse.json()
    let analysis

    try {
      // Try to parse as JSON first
      analysis = JSON.parse(openaiResult.choices[0].message.content)
    } catch {
      // If not JSON, create structured response from plain text
      const content = openaiResult.choices[0].message.content
      analysis = {
        answer: content,
        summary: "",
        objections: [],
        improvements: [],
        timestamps: [],
        followUpTemplates: []
      }
    }

    // Optionally save the Q&A for future reference
    await supabaseClient
      .from('conversation_notes')
      .insert({
        recording_id: recordingId,
        question: question,
        answer: JSON.stringify(analysis),
        timestamps: analysis.timestamps || []
      })

    return new Response(
      JSON.stringify({ 
        success: true,
        analysis
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Analysis error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Analysis failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})