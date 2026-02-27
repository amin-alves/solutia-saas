import { useState } from "react"
import { useNavigate } from "react-router-dom"

const users: Record<string, any> = {
    "amin1@teste.com": {
        senha: "123",
        empresa_id: "empresa_001",
        empresa_nome: "A.M.I. Engenharia",
    },
    "amin2@teste.com": {
        senha: "123",
        empresa_id: "empresa_002",
        empresa_nome: "Solutia Tech",
    }
}

export default function LandingPage() {
    const navigate = useNavigate()
    const [email, setEmail] = useState("")
    const [senha, setSenha] = useState("")
    const [erro, setErro] = useState("")

    function handleLogin(e: React.MouseEvent<HTMLButtonElement> | React.FormEvent) {
        e.preventDefault()
        setErro("")

        const cleanEmail = email.trim().toLowerCase()
        const user = users[cleanEmail]

        if (!user || user.senha !== senha) {
            setErro("E-mail ou senha incorretos.")
            return
        }

        // AUTH SIMULADO
        localStorage.setItem("solutia_auth", "true")
        localStorage.setItem("solutia_user", cleanEmail)
        localStorage.setItem("solutia_empresa_id", user.empresa_id)
        localStorage.setItem("solutia_empresa_nome", user.empresa_nome)

        navigate("/dashboard", { replace: true })
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
            <header className="px-8 py-6 flex justify-between items-center max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center">
                        <span className="text-white font-black text-xl">SOLUTIA SAAS</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col md:flex-row items-center justify-center max-w-7xl mx-auto w-full px-6 gap-12 lg:gap-24 my-10">
                {/* Texto e Chamada */}
                <div className="flex-1 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm mb-6">
                        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>

                    </div>
                    <h2 className="text-5xl lg:text-7xl font-black text-slate-900 mb-6 leading-[1.1] tracking-tight">
                        Gestão inteligente para <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">sua empresa</span>
                    </h2>
                    <p className="text-lg text-slate-600 mb-10 max-w-xl mx-auto md:mx-0 leading-relaxed font-medium">
                        Controle simplificado de empresas, documentos e usuários em uma plataforma moderna, intuitiva e totalmente isolada.
                    </p>
                </div>

                {/* Card de Login Integrado */}
                <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-2xl shadow-indigo-900/5 border border-slate-100 relative">
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-indigo-400 to-cyan-400 rounded-full blur-2xl opacity-40 pointer-events-none"></div>
                    <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full blur-2xl opacity-30 pointer-events-none"></div>

                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Acesse sua conta</h3>
                        <p className="text-slate-500 text-sm mb-8 font-medium">Insira suas credenciais para gerenciar sua organização.</p>

                        <form className="space-y-5">
                            {erro && <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-sm text-center font-medium animate-in fade-in zoom-in duration-200">{erro}</div>}

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Email</label>
                                <input
                                    type="email"
                                    placeholder="voce@empresa.com"
                                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl shadow-sm outline-none transition-all font-medium text-slate-900"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Senha</label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl shadow-sm outline-none transition-all font-medium text-slate-900"
                                    value={senha}
                                    onChange={(e) => setSenha(e.target.value)}
                                    required
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleLogin}
                                className="w-full bg-slate-900 text-white font-semibold py-4 rounded-xl hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-600/30 transition-all active:scale-[0.98] mt-2"
                            >
                                Entrar no Painel
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-xs text-slate-400 font-medium tracking-wide">
                                AMBIENTE SEGURO COM ISOLAMENTO DE DADOS
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="text-center py-8 text-slate-400 text-sm font-medium border-t border-slate-200/60 bg-white/50 backdrop-blur-sm">
                &copy; {new Date().getFullYear()} Solutia SaaS. Todos os direitos reservados.
            </footer>
        </div>
    )
}
