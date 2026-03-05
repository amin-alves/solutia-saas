import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { X, Loader2, Send } from "lucide-react"

interface Usuario {
    id: string;
    nome: string;
    email: string;
    role: string;
    status: string;
    empresa_id: string;
    is_invite?: boolean;
}

interface EquipeModalProps {
    onClose: () => void;
}

export function EquipeModal({ onClose }: EquipeModalProps) {
    const [busca, setBusca] = useState("")
    const [usuarios, setUsuarios] = useState<Usuario[]>([])

    // Estados do Formulário de Convite
    const [isInviting, setIsInviting] = useState(false)
    const [inviteNome, setInviteNome] = useState("")
    const [inviteEmail, setInviteEmail] = useState("")
    const [inviteRole, setInviteRole] = useState("Membro")
    const [loadingInvite, setLoadingInvite] = useState(false)

    // Ao montar a página, carrega apenas os usuários da empresa logada
    useEffect(() => {
        async function fetchUsuarios() {
            const empresaId = localStorage.getItem("solutia_empresa_id")

            if (!empresaId) {
                setUsuarios([])
                return
            }

            // Busca os perfis que pertencem à mesma empresa do usuário logado
            const { data: perfisData, error: perfisError } = await supabase
                .from("perfis")
                .select("*")
                .eq("empresa_id", empresaId)

            // Busca os convites PENDENTES que pertencem à mesma empresa
            const { data: convitesData, error: convitesError } = await supabase
                .from("convites")
                .select("*")
                .eq("empresa_id", empresaId)
                .eq("status", "Pendente")

            if (!perfisError && !convitesError) {
                const membrosAuth = (perfisData || []) as Usuario[];

                // Filtra convites cujo email já existe em perfis (evita duplicatas)
                const emailsPerfis = new Set(membrosAuth.map(m => m.email?.toLowerCase()));
                const convitesFiltrados = (convitesData || []).filter(
                    c => !emailsPerfis.has(c.email?.toLowerCase())
                );

                const convitesAuth = convitesFiltrados.map(convite => ({
                    id: convite.id,
                    nome: convite.nome || '—',
                    email: convite.email,
                    role: convite.role,
                    status: convite.status || 'Pendente',
                    empresa_id: convite.empresa_id,
                    is_invite: true
                })) as Usuario[];

                setUsuarios([...membrosAuth, ...convitesAuth]);
            } else {
                console.error("Erro ao carregar:", perfisError || convitesError)
            }
        }

        fetchUsuarios()
    }, [])

    const usuariosFiltrados = usuarios.filter((usuario) =>
        usuario.nome?.toLowerCase().includes(busca.toLowerCase()) ||
        usuario.email?.toLowerCase().includes(busca.toLowerCase()) || ""
    )

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inviteEmail || !inviteNome) return

        setLoadingInvite(true)
        try {
            const empresaId = localStorage.getItem("solutia_empresa_id") || ""
            const session = await supabase.auth.getSession()
            const authUserId = session.data.session?.user.id || null;

            // Inserção real no Supabase na tabela de convites (onde você poderá linkar com um disparador de e-mail)
            const { data, error } = await supabase.from('convites').insert([{
                empresa_id: empresaId,
                email: inviteEmail,
                nome: inviteNome,
                role: inviteRole,
                status: 'Pendente',
                enviado_por: authUserId
            }]).select().single()

            if (error) {
                throw error
            }

            // Adiciona na UI imediatamente
            const newUser: Usuario = {
                id: data.id,
                nome: data.nome,
                email: data.email,
                role: data.role,
                status: data.status,
                empresa_id: data.empresa_id,
                is_invite: true
            }

            setUsuarios([newUser, ...usuarios])

            setIsInviting(false)
            setInviteNome("")
            setInviteEmail("")
            setInviteRole("Membro")

            // Disparo do convite via Edge Function (usa admin.inviteUserByEmail com Service Role Key)
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            const inviteResponse = await fetch(`${supabaseUrl}/functions/v1/invite-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${anonKey}`,
                },
                body: JSON.stringify({ email: inviteEmail }),
            });

            const inviteResult = await inviteResponse.json();

            if (!inviteResponse.ok || inviteResult.error) {
                console.error("Erro no envio do convite:", inviteResult.error)
                alert(`O convite foi salvo, mas houve erro ao disparar o e-mail: ${inviteResult.error}`)
            } else {
                alert(`Perfeito! O convite foi enviado para ${inviteEmail}.\nO usuário receberá um e-mail para acessar o sistema.`)
            }
        } catch (error: any) {
            console.error("Erro ao convidar:", error)
            alert("Erro ao enviar convite: " + error.message)
        } finally {
            setLoadingInvite(false)
        }
    }

    const handleReenviar = async (email: string) => {
        try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            const inviteResponse = await fetch(`${supabaseUrl}/functions/v1/invite-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${anonKey}`,
                },
                body: JSON.stringify({ email }),
            });

            const inviteResult = await inviteResponse.json();

            if (!inviteResponse.ok || inviteResult.error) {
                console.error("Erro ao reenviar convite:", inviteResult.error)
                alert(`Houve um erro ao reenviar o e-mail: ${inviteResult.error}`)
            } else {
                alert(`Sucesso! O convite foi reenviado para ${email}.`)
            }
        } catch (error: any) {
            console.error("Erro ao reenviar convite:", error)
            alert("Erro ao reenviar convite: " + error.message)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestão de Equipe</h2>
                        <p className="text-sm text-gray-500 mt-1">Controle os acessos e permissões dos membros da sua empresa.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div className="relative w-full max-w-md">
                            <input
                                type="text"
                                placeholder="Buscar por nome ou email..."
                                className="w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl shadow-sm outline-none transition-all text-sm"
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => setIsInviting(!isInviting)}
                            className={`${isInviting ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700' : 'bg-indigo-600 shadow-lg shadow-indigo-600/20 text-white hover:bg-indigo-700'} px-5 py-2.5 rounded-xl text-sm font-medium transition-all shrink-0`}
                        >
                            {isInviting ? 'Cancelar' : '+ Convidar Membro'}
                        </button>
                    </div>

                    {isInviting && (
                        <form onSubmit={handleInvite} className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/10 dark:to-gray-900 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl p-6 flex flex-col sm:flex-row gap-4 items-end shadow-inner transition-all animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="flex-1 w-full">
                                <label className="block text-[11px] font-bold text-indigo-700 dark:text-indigo-400 mb-1.5 uppercase tracking-wider">Nome do Membro</label>
                                <input
                                    type="text"
                                    required
                                    value={inviteNome}
                                    onChange={(e) => setInviteNome(e.target.value)}
                                    placeholder="João da Silva"
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-transparent focus:border-indigo-200 dark:focus:border-indigo-800 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-sm transition-all text-gray-900 dark:text-gray-100 placeholder-gray-400"
                                />
                            </div>
                            <div className="flex-1 w-full">
                                <label className="block text-[11px] font-bold text-indigo-700 dark:text-indigo-400 mb-1.5 uppercase tracking-wider">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="joao@empresa.com"
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-transparent focus:border-indigo-200 dark:focus:border-indigo-800 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-sm transition-all text-gray-900 dark:text-gray-100 placeholder-gray-400"
                                />
                            </div>
                            <div className="w-full sm:w-48">
                                <label className="block text-[11px] font-bold text-indigo-700 dark:text-indigo-400 mb-1.5 uppercase tracking-wider">Papel</label>
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-transparent focus:border-indigo-200 dark:focus:border-indigo-800 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-sm transition-all text-gray-900 dark:text-gray-100 cursor-pointer"
                                >
                                    <option value="Membro">Membro</option>
                                    <option value="Admin">Admin</option>
                                    <option value="Gestor">Gestor</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                disabled={loadingInvite}
                                className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                {loadingInvite ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                Enviar Convite
                            </button>
                        </form>
                    )}

                    <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                                    <tr>
                                        <th className="p-4 text-xs tracking-wider font-semibold text-gray-500 uppercase">Usuário</th>
                                        <th className="p-4 text-xs tracking-wider font-semibold text-gray-500 uppercase">Email</th>
                                        <th className="p-4 text-xs tracking-wider font-semibold text-gray-500 uppercase">Papel</th>
                                        <th className="p-4 text-xs tracking-wider font-semibold text-gray-500 uppercase">Status</th>
                                        <th className="p-4 text-xs tracking-wider font-semibold text-gray-500 uppercase text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50 bg-white dark:bg-gray-900">
                                    {usuariosFiltrados.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-gray-500 text-sm">
                                                Nenhum usuário encontrado.
                                            </td>
                                        </tr>
                                    ) : (
                                        usuariosFiltrados.map((usuario) => (
                                            <tr
                                                key={usuario.id}
                                                className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors group cursor-pointer"
                                            >
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold shrink-0">
                                                            {usuario.nome?.charAt(0) || '?'}
                                                        </div>
                                                        <span className="font-medium text-gray-900 dark:text-gray-100">{usuario.nome || 'Sem Nome'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{usuario.email || '—'}</td>
                                                <td className="p-4">
                                                    <span className="text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-md text-xs font-medium border border-gray-200 dark:border-gray-700">
                                                        {usuario.role || 'Membro'}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span
                                                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${usuario.status === "Ativo"
                                                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                            : usuario.status === "Pendente"
                                                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                                                : "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
                                                            }`}
                                                    >
                                                        {usuario.status || 'Ativo'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    {usuario.is_invite ? (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleReenviar(usuario.email);
                                                            }}
                                                            className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-medium text-sm gap-1 items-center flex justify-end ml-auto"
                                                            title="Reenviar Convite"
                                                        >
                                                            <Send size={14} /> Reenviar
                                                        </button>
                                                    ) : (
                                                        <button className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium text-sm">Editar</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
