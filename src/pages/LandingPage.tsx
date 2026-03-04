import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff, Lock, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function LandingPage() {
    const navigate = useNavigate()
    const [email, setEmail] = useState("")
    const [senha, setSenha] = useState("")
    const [erro, setErro] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    // Detecta login via Magic Link (callback do Supabase via URL hash)
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                localStorage.setItem("solutia_auth", "true")
                localStorage.setItem("solutia_user", session.user.email || "")
                navigate("/dashboard", { replace: true })
            }
        })

        return () => subscription.unsubscribe()
    }, [navigate])

    // Limpa estados residuais ao montar a página de login para evitar vazamentos de cache
    useState(() => {
        localStorage.removeItem("solutia_user")
        localStorage.removeItem("solutia_empresa_id")
        localStorage.removeItem("solutia_empresa_nome")
    })

    async function handleLogin(e: React.MouseEvent<HTMLButtonElement> | React.FormEvent) {
        e.preventDefault()
        setErro("")
        setIsLoading(true)

        try {
            const cleanEmail = email.trim().toLowerCase()

            const { data, error } = await supabase.auth.signInWithPassword({
                email: cleanEmail,
                password: senha,
            })

            if (error) {
                setErro("E-mail ou senha incorretos.")
                setIsLoading(false)
                return
            }

            if (data?.session) {
                // AUTH VIA SUPABASE OK
                localStorage.setItem("solutia_auth", "true")
                localStorage.setItem("solutia_user", cleanEmail)

                // Buscar Perfil do Banco
                const { data: perfilData } = await supabase
                    .from("perfis")
                    .select("nome, empresa_id, empresas(nome)")
                    .eq("id", data.session.user.id)
                    .single()

                if (perfilData) {
                    if (perfilData.empresa_id) localStorage.setItem("solutia_empresa_id", perfilData.empresa_id)

                    const empresaRef = perfilData.empresas as unknown as { nome: string } | null;
                    if (empresaRef?.nome) localStorage.setItem("solutia_empresa_nome", empresaRef.nome)
                }

                navigate("/dashboard", { replace: true })
            }
        } catch (error) {
            console.error("Erro no login:", error)
            setErro("Ocorreu um erro inesperado ao conectar ao servidor.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-blue-950 font-sans flex flex-col justify-center items-center relative overflow-hidden selection:bg-yellow-400 selection:text-blue-950 pb-16">

            {/* Gradientes decorativos sutis no fundo azul */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-900 to-blue-950 z-0"></div>
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600 blur-[150px] opacity-20 z-0"></div>

            {/* Logo Wrapper */}
            <div className="mb-6 text-center z-10 flex flex-col items-center">
                <div className="relative w-24 h-8 mb-2 flex items-center justify-center">
                    {/* Elementos decorativos minimalistas referenciando as cores */}
                    <div className="absolute top-1 left-0 w-12 h-2.5 bg-blue-400 rounded-full rotate-[-15deg] opacity-90"></div>
                    <div className="absolute top-1 right-0 w-12 h-2.5 bg-yellow-400 rounded-full rotate-[15deg] opacity-90"></div>
                </div>
                <h1 className="text-4xl md:text-[2.75rem] font-black text-white tracking-widest leading-none mt-2 drop-shadow-sm">
                    SOLUTIA
                </h1>
                <p className="text-[0.7rem] font-bold text-yellow-400 tracking-[0.4em] uppercase mt-2">
                    DOCS
                </p>
            </div>

            <main className="w-full max-w-[400px] px-5 z-10 flex flex-col items-center">

                {/* Login Card Branco e Simples */}
                <div className="bg-white px-8 py-10 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.2)] w-full relative">
                    <form className="space-y-5" onSubmit={(e) => handleLogin(e)}>
                        {erro && (
                            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded text-sm text-center font-medium animate-in fade-in duration-200">
                                {erro}
                            </div>
                        )}

                        <div>
                            <input
                                type="email"
                                placeholder="E-mail"
                                className="w-full px-4 py-[14px] bg-slate-50 border border-slate-200 rounded focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors text-slate-800 placeholder-slate-400 text-[15px] shadow-sm"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                                required
                            />
                        </div>

                        <div>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Senha"
                                    className="w-full px-4 py-[14px] bg-slate-50 border border-slate-200 rounded focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors text-slate-800 placeholder-slate-400 text-[15px] shadow-sm pr-12"
                                    value={senha}
                                    onChange={(e) => setSenha(e.target.value)}
                                    disabled={isLoading}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff strokeWidth={1.5} size={18} /> : <Eye strokeWidth={1.5} size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-3 pb-1">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-blue-600 disabled:bg-blue-400 text-white font-medium py-[12px] rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-[15.5px] shadow-md shadow-blue-600/20 active:scale-[0.98]"
                            >
                                {isLoading ? <Loader2 size={16} strokeWidth={2.5} className="animate-spin" /> : <Lock size={16} strokeWidth={2.5} />}
                                {isLoading ? 'ENTRANDO...' : 'ENTRAR'}
                            </button>
                        </div>

                        <div className="text-center mt-6">
                            <a href="#" className="text-[13.5px] text-slate-500 hover:text-blue-600 font-medium transition-colors">
                                Esqueceu sua senha?
                            </a>
                        </div>
                    </form>
                </div>
            </main>

            {/* Footer */}
            <div className="absolute bottom-8 flex items-center justify-center z-10 w-full">
                <div className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
                    <div className="w-4 h-4 bg-yellow-400 transform rotate-45 rounded-[2px] shadow-[0_0_10px_rgba(250,204,21,0.5)]"></div>
                    <span className="text-sm font-medium text-white tracking-wide">
                        Solutia Core 2026&copy;
                    </span>
                </div>
            </div>
        </div>
    )
}
