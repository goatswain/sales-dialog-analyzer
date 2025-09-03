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
    console.log('Upload request received')
    
    // Get JWT from header
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('No valid authorization header')
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create supabase client for user operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { authorization: authHeader },
        },
      }
    )

    // Get user info - this validates the JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.log('User validation failed:', userError?.message)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated:', user.id)

    // Get form data
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File
    
    if (!audioFile) {
      console.log('No audio file in request')
      return new Response(
        JSON.stringify({ error: 'No audio file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Audio file details:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type
    })

    // Create service role client for storage operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Generate filename
    const timestamp = Date.now()
    const filename = `${user.id}/${timestamp}-${audioFile.name}`
    
    console.log('Uploading to storage:', filename)
    
    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('audio-recordings')
      .upload(filename, audioFile)

    if (uploadError) {
      console.error('Storage upload failed:', uploadError)
      return new Response(
        JSON.stringify({ error: 'Upload failed: ' + uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('File uploaded successfully')

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('audio-recordings')
      .getPublicUrl(filename)

    console.log('Public URL:', publicUrl)

    // Create recording record
    const { data: recording, error: dbError } = await supabaseAdmin
      .from('recordings')
      .insert({
        title: audioFile.name.split('.')[0],
        audio_url: publicUrl,
        audio_filename: filename,
        file_size_bytes: audioFile.size,
        status: 'uploaded',
        user_id: user.id
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database insert failed:', dbError)
      return new Response(
        JSON.stringify({ error: 'Database error: ' + dbError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Recording created:', recording.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        recording,
        message: 'Audio uploaded successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Server error: ' + error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})