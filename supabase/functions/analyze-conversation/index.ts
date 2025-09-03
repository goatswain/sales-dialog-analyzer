import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
}

// Rate limiting: Max 10 requests per user per minute
const rateLimiter = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (userId: string): boolean => {
  const now = Date.now();
  const userLimit = rateLimiter.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimiter.set(userId, { count: 1, resetTime: now + 60000 }); // 1 minute
    return true;
  }
  
  if (userLimit.count >= 10) {
    return false;
  }
  
  userLimit.count++;
  return true;
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
    // Get authorization header for rate limiting
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract user ID for rate limiting
    const jwt = authHeader.replace('Bearer ', '')
    let userId: string
    
    try {
      const payload = JSON.parse(atob(jwt.split('.')[1]))
      userId = payload.sub
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check rate limit
    if (!checkRateLimit(userId)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please wait before making more requests.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { recordingId, question } = await req.json()
    
    if (!recordingId || !question) {
      return new Response(
        JSON.stringify({ error: 'Recording ID and question are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Input validation
    if (typeof question !== 'string' || question.length > 1000) {
      return new Response(
        JSON.stringify({ error: 'Question must be a string with max 1000 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get transcript data and user_id
    console.log('🔍 Looking for transcript with recording_id:', recordingId)
    const { data: transcript, error: fetchError } = await supabaseClient
      .from('transcripts')
      .select('text, segments, user_id')
      .eq('recording_id', recordingId)
      .maybeSingle()
    
    console.log('📋 Transcript query result:', { data: transcript, error: fetchError })

    if (fetchError) {
      console.error('❌ Database error:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Database error: ' + fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!transcript) {
      console.log('⚠️ No transcript found for recording_id:', recordingId)
      return new Response(
        JSON.stringify({ error: 'Transcript not found for this recording' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Format transcript with timestamps and speaker labels for LLM
    const formattedTranscript = transcript.segments?.map((segment: any, index: number) => {
      const minutes = Math.floor(segment.start_time / 60)
      const seconds = Math.floor(segment.start_time % 60)
      const timestamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      const speaker = segment.speaker || `Speaker ${(index % 2) + 1}`
      return `${timestamp} - ${speaker}: ${segment.text}`
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
        user_id: transcript.user_id,
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