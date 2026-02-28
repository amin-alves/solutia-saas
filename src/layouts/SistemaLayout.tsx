import { useEffect, useState } from "react"
import { useNavigate, Outlet } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import Sidebar from "../components/Sidebar"

export default function SistemaLayout() {
    const navigate = useNavigate()
    const [user, setUser] = useState<string | null>(null)
    const [empresa, setEmpresa] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let isMounted = true

        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                if (isMounted) navigate("/")
                return
            }

            if (isMounted) {
                // Busca o perfil e a empresa vinculada do usuário usando auth
                const { data: perfilData, error } = await supabase
                    .from("perfis")
                    .select("nome, empresa_id, empresas(nome)")
                    .eq("id", session.user.id)
                    .single()

                console.log("[DEBUG] Fetch Perfil User:", session.user.id, "->", perfilData, "Erro:", error)

                if (!error && perfilData) {
                    const empresaRef = perfilData.empresas as unknown as { nome: string } | null;
                    const nomeEmpresaBanco = empresaRef?.nome || "Sem Empresa Vinculada";

                    setUser(perfilData.nome || session.user.email)
                    setEmpresa(nomeEmpresaBanco)

                    // Salvar no localStorage temporariamente caso outras rotas antigas precisem
                    if (perfilData.empresa_id) {
                        localStorage.setItem("solutia_empresa_id", perfilData.empresa_id)
                    } else {
                        localStorage.removeItem("solutia_empresa_id")
                    }

                    if (empresaRef?.nome) {
                        localStorage.setItem("solutia_empresa_nome", nomeEmpresaBanco)
                    } else {
                        localStorage.removeItem("solutia_empresa_nome")
                    }
                } else {
                    setUser(session.user.email ?? "Usuário")
                    setEmpresa("Empresa Desconhecida")
                    localStorage.removeItem("solutia_empresa_id")
                    localStorage.removeItem("solutia_empresa_nome")
                }

                setLoading(false)
            }
        }

        checkSession()

        // Listener para deslogar imediatamente caso a sessão expire
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session && isMounted) {
                navigate("/")
            }
        })

        return () => {
            isMounted = false
            subscription.unsubscribe()
        }
    }, [navigate])

    async function logout() {
        await supabase.auth.signOut()
        localStorage.removeItem("solutia_auth")
        localStorage.removeItem("solutia_user")
        localStorage.removeItem("solutia_empresa_id")
        localStorage.removeItem("solutia_empresa_nome")
        navigate("/")
    }

    if (loading) return null

    return (
        <div className="flex">
            <Sidebar />

            <div className="flex-1 flex flex-col min-h-screen bg-gray-100">

                <header className="bg-white shadow px-8 py-4 flex justify-between items-center">
                    <h1 className="text-lg font-semibold text-gray-700">
                        {empresa ? `Painel - ${empresa}` : "Sistema de Gestão"}
                    </h1>

                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-800">
                                {user}
                            </p>
                            <p className="text-xs text-gray-500">
                                Usuário logado
                            </p>
                        </div>

                        <button
                            onClick={logout}
                            className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-600 transition"
                        >
                            Sair
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-8">
                    <Outlet />
                </main>

            </div>
        </div>
    )
}
