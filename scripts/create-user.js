import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRole) {
    console.error("❌ ERRO: Faltam as variáveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no ambiente.")
    process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function createUser() {
    try {
        const email = process.argv[2]
        const password = process.argv[3]
        const nome = process.argv[4]
        const empresa_id = process.argv[5] || null

        if (!email || !password || !nome) {
            console.log("⚠️ Uso incorreto. Digite: node --env-file=.env.local scripts/create-user.js <email> <senha> <\"Nome Completo\"> [empresa_id_opcional]")
            process.exit(1)
        }

        console.log(`⏳ Checando usuário de e-mail: ${email}...`)

        let userId = null

        // 1. Tentar criar o usuário primeiro
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true
        })

        if (authError && authError.message.includes("already been registered")) {
            console.log("⚠️ Usuário já existe no Auth! Buscando ID existente para vincular o perfil...")

            // Procurar o usuário já existente para pegar o ID dele
            const { data: listUsersData, error: listError } = await supabaseAdmin.auth.admin.listUsers()
            if (listError) throw listError

            const existingUser = listUsersData.users.find(u => u.email === email)
            if (!existingUser) {
                throw new Error("Usuário existe mas não foi encontrado na listagem.")
            }
            userId = existingUser.id
            console.log(`✅ Usuário existente encontrado Auth ID: ${userId}`)
        } else if (authError) {
            throw authError
        } else {
            userId = authData.user.id
            console.log(`✅ Novo Usuário Auth criado! ID: ${userId}`)
        }

        console.log(`⏳ Vinculando ao perfil público na tabela 'perfis'...`)

        // 2. Insere (ou atualiza se já existir) na nossa tabela pública para aparecer no sistema
        const perfilData = {
            id: userId,
            nome: nome,
            role: "Usuário",
            status: "Ativo",
            empresa_id: empresa_id
        }

        const { error: dbError } = await supabaseAdmin
            .from('perfis')
            .upsert([perfilData]) // Usando upsert para atualizar se o ID já existir na tabela

        if (dbError) throw dbError

        console.log("✅ Usuário e Perfil vinculados com sucesso à empresa selecionada!")

    } catch (error) {
        console.error("❌ Ocorreu um erro no processo:", error.message)
    } finally {
        // Encerra forçadamente para evitar o travamento pendente 'UV_HANDLE_CLOSING' no Windows
        process.exit(0)
    }
}

createUser()
