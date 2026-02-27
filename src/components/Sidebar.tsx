import { Link, useNavigate, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"

export default function Sidebar() {
    const navigate = useNavigate()
    const location = useLocation()
    const pathname = location.pathname

    const [empresa, setEmpresa] = useState<string | null>(null)

    useEffect(() => {
        setEmpresa(localStorage.getItem("solutia_empresa_nome") || "Empresa")
    }, [])

    function logout() {
        localStorage.removeItem("solutia_auth")
        localStorage.removeItem("solutia_user")
        localStorage.removeItem("solutia_empresa_id")
        localStorage.removeItem("solutia_empresa_nome")
        navigate("/")
    }

    const linkClass = (path: string) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${pathname === path
            ? "bg-white text-indigo-900 shadow-md shadow-indigo-900/20 translate-x-1"
            : "text-indigo-100 hover:bg-indigo-800 hover:text-white"
        }`

    return (
        <div className="w-72 bg-gradient-to-b from-indigo-900 to-indigo-950 text-white min-h-screen p-6 flex flex-col justify-between border-r border-indigo-800/50 shadow-2xl">
            <div>
                <div className="mb-10 flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center">
                        <span className="text-indigo-900 font-black text-xl">S</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight leading-tight">Solutia SaaS</h2>
                        <p className="text-xs text-indigo-300 font-medium truncate max-w-[150px]">{empresa}</p>
                    </div>
                </div>

                <nav className="space-y-2">
                    <p className="px-4 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2 mt-4">Navegação Principal</p>
                    <Link to="/dashboard" className={linkClass("/dashboard")}>
                        <span className="text-lg opacity-80">📊</span>
                        Dashboard
                    </Link>
                    <Link to="/documentos" className={linkClass("/documentos")}>
                        <span className="text-lg opacity-80">📁</span>
                        Documentos
                    </Link>
                    <Link to="/usuarios" className={linkClass("/usuarios")}>
                        <span className="text-lg opacity-80">👥</span>
                        Usuários
                    </Link>
                </nav>
            </div>

            <div>
                <div className="bg-indigo-800/50 rounded-2xl p-4 mb-4 border border-indigo-700/50 text-center">
                    <p className="text-xs text-indigo-200 mb-2">Ambiente Privado</p>
                    <p className="text-sm font-semibold">{empresa}</p>
                </div>

                <button
                    onClick={logout}
                    className="flex justify-center items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-4 py-3 rounded-xl transition-all shadow-lg shadow-rose-500/20 w-full font-medium"
                >
                    Sair do Sistema
                </button>
            </div>
        </div>
    )
}
