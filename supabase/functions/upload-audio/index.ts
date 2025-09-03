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
    // Get the JWT token - it's already validated by the edge function
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with the user's JWT
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { authorization: authHeader } } }
    )

    // Get user (JWT is already validated by edge function)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process file upload
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File
    
    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: 'No audio file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `audio-${timestamp}-${audioFile.name}`
    
    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio-recordings')
      .upload(filename, audioFile, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: 'Upload failed: ' + uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('audio-recordings')
      .getPublicUrl(filename)

    // Create recording record
    const { data: recording, error: dbError } = await supabase
      .from('recordings')
      .insert({
        title: audioFile.name.replace(/\.[^/.]+$/, ''),
        audio_url: publicUrl,
        audio_filename: filename,
        file_size_bytes: audioFile.size,
        status: 'uploaded',
        user_id: user.id
      })
      .select()
      .single()

    if (dbError) {
      return new Response(
        JSON.stringify({ error: 'Database error: ' + dbError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        recording,
        message: 'Audio uploaded successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Server error: ' + error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})