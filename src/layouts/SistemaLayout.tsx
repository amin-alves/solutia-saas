import { useEffect, useState } from "react"
import { useNavigate, Outlet } from "react-router-dom"
import Sidebar from "../components/Sidebar"

export default function SistemaLayout() {
    const navigate = useNavigate()
    const [user, setUser] = useState<string | null>(null)
    const [empresa, setEmpresa] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const auth = localStorage.getItem("solutia_auth")
        const email = localStorage.getItem("solutia_user")
        const nomeEmpresa = localStorage.getItem("solutia_empresa_nome")

        if (!auth) {
            navigate("/")
        } else {
            setUser(email)
            setEmpresa(nomeEmpresa || "Empresa Desconhecida")
        }

        setLoading(false)
    }, [navigate])

    function logout() {
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
