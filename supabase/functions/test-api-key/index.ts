import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 Testing API key access...')
    
    // Get all environment variables
    const allEnvVars = Object.keys(Deno.env.toObject())
    console.log('📝 All available env vars:', allEnvVars)
    
    // Check specific API key
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    console.log('🔑 API key check:', {
      exists: !!apiKey,
      length: apiKey?.length || 0,
      startsWithSk: apiKey?.startsWith('sk-') || false,
      firstTenChars: apiKey ? apiKey.substring(0, 10) : 'null'
    })
    
    return new Response(
      JSON.stringify({
        success: true,
        apiKeyExists: !!apiKey,
        apiKeyLength: apiKey?.length || 0,
        apiKeyValid: apiKey?.startsWith('sk-') || false,
        envVarsCount: allEnvVars.length,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('❌ Test error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})