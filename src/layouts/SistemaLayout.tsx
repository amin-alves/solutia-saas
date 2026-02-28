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
                setUser(session.user.email ?? "Usuário")
                // Recuperamos o nome da empresa do localStorage enquanto não integramos as tabelas
                const nomeEmpresa = localStorage.getItem("solutia_empresa_nome")
                setEmpresa(nomeEmpresa || "Empresa Desconhecida")
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
