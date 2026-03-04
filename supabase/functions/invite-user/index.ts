import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

        const adminClient = createClient(supabaseUrl, serviceRoleKey)
        const anonClient = createClient(supabaseUrl, anonKey)

        const reqData = await req.json()
        const email = reqData?.email

        if (!email) {
            throw new Error("E-mail não fornecido.")
        }

        // Verifica se o usuário já existe no auth.users
        const { data: existingUsers } = await adminClient.auth.admin.listUsers()
        const userExists = existingUsers?.users?.find(
            (u: any) => u.email?.toLowerCase() === email.toLowerCase()
        )

        if (userExists) {
            // Usuário já existe: envia magic link via OTP (isso ENVIA o e-mail)
            const { error: otpError } = await anonClient.auth.signInWithOtp({
                email: email,
                options: {
                    shouldCreateUser: false,
                    emailRedirectTo: `https://solutia-saas.vercel.app/`,
                },
            })

            if (otpError) {
                throw otpError
            }

            return new Response(JSON.stringify({
                success: true,
                message: 'Magic link enviado para usuário existente',
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        } else {
            // Usuário novo: cria via convite (cria no auth.users + envia e-mail)
            const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email)

            if (error) {
                throw error
            }

            return new Response(JSON.stringify({
                success: true,
                message: 'Convite enviado para novo usuário',
                user: data.user
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err?.message || 'Erro desconhecido' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
