import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    const allEnvVars = Object.keys(Deno.env.toObject())
    
    return new Response(
      JSON.stringify({ 
        hasApiKey: !!apiKey,
        keyLength: apiKey?.length || 0,
        startsWithSk: apiKey?.startsWith('sk-') || false,
        availableEnvVars: allEnvVars.filter(key => key.includes('OPENAI') || key.includes('API')),
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})