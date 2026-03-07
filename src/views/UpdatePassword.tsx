import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Lock, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function UpdatePassword() {
    const router = useRouter()
    const [novaSenha, setNovaSenha] = useState("")
    const [confirmarSenha, setConfirmarSenha] = useState("")
    const [erro, setErro] = useState("")
    const [sucesso, setSucesso] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        // Verifica se chegamos aqui através de um link de recuperação
        supabase.auth.onAuthStateChange(async (event) => {
            if (event == "PASSWORD_RECOVERY") {
                // O usuário pode definir uma nova senha.
            }
        });
    }, []);

    async function handleUpdatePassword(e: React.FormEvent) {
        e.preventDefault()
        setErro("")
        setSucesso("")

        if (novaSenha !== confirmarSenha) {
            setErro("As senhas não coincidem.")
            return
        }

        if (novaSenha.length < 6) {
            setErro("A senha deve ter pelo menos 6 caracteres.")
            return
        }

        setIsLoading(true)

        try {
            const { error } = await supabase.auth.updateUser({
                password: novaSenha
            })

            if (error) {
                setErro("Erro ao atualizar a senha: " + error.message)
            } else {
                localStorage.setItem("solutia_auth", "true")
                setSucesso("Senha atualizada com sucesso! Redirecionando...")
                setTimeout(() => {
                    router.replace("/dashboard")
                }, 2000)
            }
        } catch (error) {
            setErro("Erro inesperado ao atualizar a senha.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-blue-950 font-sans flex flex-col justify-center items-center relative overflow-hidden">
            {/* Gradientes decorativos */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-900 to-blue-950 z-0"></div>

            <div className="mb-6 text-center z-10 flex flex-col items-center">
                <h1 className="text-4xl md:text-[2.75rem] font-black text-white tracking-widest leading-none mt-2">
                    SOLUTIA
                </h1>
                <p className="text-[0.7rem] font-bold text-yellow-400 tracking-[0.4em] uppercase mt-2">
                    REDEFINIR SENHA
                </p>
            </div>

            <main className="w-full max-w-[400px] px-5 z-10">
                <div className="bg-white px-8 py-10 rounded-xl shadow-lg relative">
                    <form className="space-y-5" onSubmit={handleUpdatePassword}>
                        {erro && (
                            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded text-sm text-center font-medium">
                                {erro}
                            </div>
                        )}
                        {sucesso && (
                            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded text-sm text-center font-medium">
                                {sucesso}
                            </div>
                        )}

                        <p className="text-slate-500 text-sm text-center">
                            Digite sua nova senha abaixo.
                        </p>

                        <div>
                            <input
                                type="password"
                                placeholder="Nova Senha"
                                className="w-full px-4 py-[14px] bg-slate-50 border border-slate-200 rounded focus:border-blue-500 focus:bg-white focus:outline-none transition-colors text-slate-800 text-[15px]"
                                value={novaSenha}
                                onChange={(e) => setNovaSenha(e.target.value)}
                                disabled={isLoading || sucesso.length > 0}
                                required
                            />
                        </div>

                        <div>
                            <input
                                type="password"
                                placeholder="Confirmar Nova Senha"
                                className="w-full px-4 py-[14px] bg-slate-50 border border-slate-200 rounded focus:border-blue-500 focus:bg-white focus:outline-none transition-colors text-slate-800 text-[15px]"
                                value={confirmarSenha}
                                onChange={(e) => setConfirmarSenha(e.target.value)}
                                disabled={isLoading || sucesso.length > 0}
                                required
                            />
                        </div>

                        <div className="pt-3">
                            <button
                                type="submit"
                                disabled={isLoading || sucesso.length > 0}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-[12px] rounded transition-colors flex items-center justify-center gap-2 text-[15.5px]"
                            >
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                                {isLoading ? 'ATUALIZANDO...' : 'SALVAR NOVA SENHA'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    )
}
