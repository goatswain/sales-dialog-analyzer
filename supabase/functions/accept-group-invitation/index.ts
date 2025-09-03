import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const handler = async (req: Request): Promise<Response> => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response('Invalid invitation link', { status: 400 });
    }

    // Get invitation details
    const { data: invitation, error: inviteError } = await supabase
      .from('group_invitations')
      .select(`
        *,
        groups:group_id(name)
      `)
      .eq('token', token)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (inviteError || !invitation) {
      return new Response(`
        <html>
          <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
            <h2 style="color: #dc2626;">Invalid or Expired Invitation</h2>
            <p>This invitation link is invalid or has expired.</p>
            <a href="https://swainai.com" 
               style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              Go to SwainAI
            </a>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Redirect to auth page with invitation token
    const appUrl = 'https://swainai.com';
    const redirectUrl = `${appUrl}/auth?invite=${token}&group=${encodeURIComponent(invitation.groups.name)}`;
    
    return Response.redirect(redirectUrl, 302);

  } catch (error) {
    console.error('Error in accept-group-invitation:', error);
    return new Response(`
      <html>
        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
          <h2 style="color: #dc2626;">Error</h2>
          <p>An error occurred while processing your invitation.</p>
          <a href="https://swainai.com" 
             style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Go to SwainAI
          </a>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
};

serve(handler);