import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    console.log(`Sending welcome email to: ${user.email}`);

    // Send welcome email using Resend
    const emailResponse = await resend.emails.send({
      from: "SwainAI <onboarding@resend.dev>",
      to: [user.email],
      subject: "Welcome to SwainAI Pro 🚀",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #F59E0B; font-size: 32px; margin: 0;">
              🚀 Welcome to SwainAI Pro!
            </h1>
          </div>
          
          <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h2 style="color: white; margin: 0 0 10px 0; font-size: 24px;">Congratulations!</h2>
            <p style="color: white; margin: 0; font-size: 18px; opacity: 0.95;">
              You've successfully upgraded to Pro
            </p>
          </div>

          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 20px;">🎯 What's included in your Pro membership:</h3>
            <ul style="color: #555; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li><strong>Unlimited recordings</strong> - No more daily limits</li>
              <li><strong>Advanced AI insights</strong> - Deeper conversation analysis</li>
              <li><strong>Enhanced coaching tools</strong> - Personalized recommendations</li>
              <li><strong>Priority processing</strong> - Faster transcription and analysis</li>
              <li><strong>Future premium features</strong> - First access to new capabilities</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #333; font-size: 18px; margin: 0 0 15px 0;">
              <strong>Ready to crush those objections? Let's get started!</strong>
            </p>
            <a href="${Deno.env.get("SUPABASE_URL")?.replace('https://', 'https://')}" 
               style="display: inline-block; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); 
                      color: white; text-decoration: none; padding: 15px 30px; 
                      border-radius: 8px; font-weight: bold; font-size: 16px;">
              Open SwainAI Dashboard
            </a>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0;">
              Need help? Reply to this email or contact us at 
              <a href="mailto:Swainaicontact@gmail.com" style="color: #F59E0B;">Swainaicontact@gmail.com</a>
            </p>
          </div>
        </div>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("Error in send-pro-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});