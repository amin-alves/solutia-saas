import { useEffect, useState, useRef } from "react"
import { useNavigate, Outlet, Link, useLocation } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Loader2, Settings, LayoutDashboard, Users } from "lucide-react"
import ConfigModal from "../components/dashboard/ConfigModal"
import { ChatWidget } from "../components/ChatWidget"

export default function SistemaLayout() {
    const navigate = useNavigate()
    const [user, setUser] = useState<string | null>(localStorage.getItem("solutia_user"))
    const [empresa, setEmpresa] = useState<string | null>(localStorage.getItem("solutia_empresa_nome"))
    const [empresaId, setEmpresaId] = useState<string | null>(localStorage.getItem("solutia_empresa_id"))
    const [empresaCnpj, setEmpresaCnpj] = useState<string | null>(localStorage.getItem("solutia_empresa_cnpj"))
    const [logoUrl, setLogoUrl] = useState<string | null>(localStorage.getItem("solutia_empresa_logo"))
    const [userCargo, setUserCargo] = useState<string | null>(localStorage.getItem("solutia_user_cargo"))
    const [userCpf, setUserCpf] = useState<string | null>(localStorage.getItem("solutia_user_cpf"))
    const [userRegistro, setUserRegistro] = useState<string | null>(localStorage.getItem("solutia_user_registro"))

    // UI States
    const [loading, setLoading] = useState(true)
    const [isUploading, setIsUploading] = useState(false)
    const [showConfigModal, setShowConfigModal] = useState(false)
    const [perfilId, setPerfilId] = useState<string | null>(null)
    const [userEmail, setUserEmail] = useState<string | null>(null)

    // Inline Edit States
    const [isEditingEmpresa, setIsEditingEmpresa] = useState(false)
    const [tempEmpresa, setTempEmpresa] = useState('')

    const [isEditingUser, setIsEditingUser] = useState(false)
    const [tempUser, setTempUser] = useState('')

    const [isEditingCargo, setIsEditingCargo] = useState(false)
    const [tempCargo, setTempCargo] = useState('')

    const fileInputRef = useRef<HTMLInputElement>(null)

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
                    .select("nome, cargo, cpf, registro_profissional, empresa_id, empresas(nome, logo_url, cnpj)")
                    .eq("id", session.user.id)
                    .single()

                if (!error && perfilData) {
                    const empresaRef = perfilData.empresas as unknown as { nome: string, logo_url?: string, cnpj?: string } | null;
                    const nomeEmpresaBanco = empresaRef?.nome || "Sem Empresa Vinculada";
                    const logoDb = empresaRef?.logo_url || null;
                    const cnpjDb = empresaRef?.cnpj || null;

                    setPerfilId(session.user.id)
                    setUserEmail(session.user.email ?? "");
                    setUser(perfilData.nome || session.user.email)
                    setEmpresa(nomeEmpresaBanco)
                    if (logoDb) setLogoUrl(logoDb)
                    if (cnpjDb) setEmpresaCnpj(cnpjDb)
                    if (perfilData.empresa_id) setEmpresaId(perfilData.empresa_id)

                    if (perfilData.cargo) setUserCargo(perfilData.cargo)
                    if (perfilData.cpf) setUserCpf(perfilData.cpf)
                    if (perfilData.registro_profissional) setUserRegistro(perfilData.registro_profissional)

                    // Salvar no localStorage temporariamente caso outras rotas antigas precisem
                    if (perfilData.empresa_id) {
                        localStorage.setItem("solutia_empresa_id", perfilData.empresa_id)
                    } else {
                        localStorage.removeItem("solutia_empresa_id")
                    }

                    if (empresaRef?.nome) {
                        localStorage.setItem("solutia_empresa_nome", nomeEmpresaBanco)
                        localStorage.setItem("solutia_empresa_cnpj", cnpjDb || "")
                        if (logoDb) {
                            localStorage.setItem("solutia_empresa_logo", logoDb)
                        } else {
                            localStorage.removeItem("solutia_empresa_logo")
                        }
                    } else {
                        localStorage.removeItem("solutia_empresa_nome")
                        localStorage.removeItem("solutia_empresa_logo")
                        localStorage.removeItem("solutia_empresa_cnpj")
                    }

                    localStorage.setItem("solutia_user_cargo", perfilData.cargo || "")
                    localStorage.setItem("solutia_user_cpf", perfilData.cpf || "")
                    localStorage.setItem("solutia_user_registro", perfilData.registro_profissional || "")

                } else {
                    setUser(session.user.email ?? "Usuário")
                    setEmpresa("Empresa Desconhecida")
                    setLogoUrl(null)
                    setEmpresaCnpj(null)
                    setUserCargo(null)
                    setUserCpf(null)
                    setUserRegistro(null)

                    localStorage.removeItem("solutia_empresa_id")
                    localStorage.removeItem("solutia_empresa_nome")
                    localStorage.removeItem("solutia_empresa_logo")
                    localStorage.removeItem("solutia_empresa_cnpj")
                    localStorage.removeItem("solutia_user_cargo")
                    localStorage.removeItem("solutia_user_cpf")
                    localStorage.removeItem("solutia_user_registro")
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
        localStorage.removeItem("solutia_empresa_logo")
        localStorage.removeItem("solutia_empresa_cnpj")
        localStorage.removeItem("solutia_user_cargo")
        localStorage.removeItem("solutia_user_cpf")
        localStorage.removeItem("solutia_user_registro")
        navigate("/")
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !empresaId) return;

        // Validar tipo do arquivo
        if (!file.type.match('image/(jpeg|jpg|png|svg\\+xml)')) {
            alert('Por favor, envie apenas imagens (PNG, JPG, SVG).');
            return;
        }

        // Validar tamanho (máx 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 5MB.');
            return;
        }

        setIsUploading(true);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${empresaId}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('logos_empresas')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('logos_empresas')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('empresas')
                .update({ logo_url: publicUrl })
                .eq('id', empresaId);

            if (updateError) throw updateError;

            setLogoUrl(publicUrl);
            localStorage.setItem("solutia_empresa_logo", publicUrl);
        } catch (err: any) {
            console.error('Erro ao fazer upload da logo:', err);
            alert('Ocorreu um erro ao enviar a imagem. Tente novamente.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleUpdateEmpresa = async () => {
        setIsEditingEmpresa(false);
        if (!tempEmpresa.trim() || tempEmpresa === empresa || !empresaId) return;

        try {
            const { error } = await supabase.from('empresas').update({ nome: tempEmpresa }).eq('id', empresaId);
            if (error) throw error;
            setEmpresa(tempEmpresa);
            localStorage.setItem("solutia_empresa_nome", tempEmpresa);
        } catch (err) {
            console.error(err);
            alert("Erro ao atualizar o nome da empresa.");
        }
    };

    const handleUpdateUser = async () => {
        setIsEditingUser(false);
        if (!tempUser.trim() || tempUser === user || !perfilId) return;

        try {
            const { error } = await supabase.from('perfis').update({ nome: tempUser }).eq('id', perfilId);
            if (error) throw error;
            setUser(tempUser);
            localStorage.setItem("solutia_user", tempUser); // atualiza na sessao tbm se necessario mas nos lemos do db prioritariamente
        } catch (err) {
            console.error(err);
            alert("Erro ao atualizar o nome do usuário.");
        }
    };

    const handleUpdateCargo = async () => {
        setIsEditingCargo(false);
        if (tempCargo === userCargo || !perfilId) return;

        try {
            const { error } = await supabase.from('perfis').update({ cargo: tempCargo }).eq('id', perfilId);
            if (error) throw error;
            setUserCargo(tempCargo);
            localStorage.setItem("solutia_user_cargo", tempCargo);
        } catch (err) {
            console.error(err);
            alert("Erro ao atualizar o cargo.");
        }
    };

    const handleConfigSuccess = (data: { cnpj: string; cpf: string; registro: string }) => {
        setEmpresaCnpj(data.cnpj);
        setUserCpf(data.cpf);
        setUserRegistro(data.registro);

        localStorage.setItem("solutia_empresa_cnpj", data.cnpj);
        localStorage.setItem("solutia_user_cpf", data.cpf);
        localStorage.setItem("solutia_user_registro", data.registro);

        setShowConfigModal(false);
    };

    if (loading) return null

    return (
        <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">

            {showConfigModal && empresaId && perfilId && (
                <ConfigModal
                    empresaId={empresaId}
                    perfilId={perfilId}
                    initialCnpj={empresaCnpj || ''}
                    initialCpf={userCpf || ''}
                    initialRegistro={userRegistro || ''}
                    onClose={() => setShowConfigModal(false)}
                    onSuccess={handleConfigSuccess}
                />
            )}

            <header className="bg-white shadow px-8 py-3 flex justify-between items-center shrink-0 sticky top-0 z-30">
                <div className="flex items-center gap-3">
                    <div
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        title="Clique para alterar a logo da empresa"
                        onClick={() => {
                            if (!isUploading && fileInputRef.current) {
                                fileInputRef.current.click()
                            }
                        }}
                    >
                        <input
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            accept="image/png, image/jpeg, image/svg+xml"
                            onChange={handleFileChange}
                        />

                        {isUploading ? (
                            <div className="h-8 w-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                            </div>
                        ) : logoUrl ? (
                            <img src={logoUrl} alt={`Logo ${empresa}`} className="h-8 w-auto object-contain" />
                        ) : (
                            <div className="h-8 w-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-700 font-bold shrink-0">
                                {empresa ? empresa.charAt(0) : 'S'}
                            </div>
                        )}
                    </div>

                    {/* Edição Inline do Nome da Empresa */}
                    <div className="flex flex-col justify-center">
                        {isEditingEmpresa ? (
                            <input
                                autoFocus
                                type="text"
                                value={tempEmpresa}
                                onChange={(e) => setTempEmpresa(e.target.value)}
                                onBlur={handleUpdateEmpresa}
                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateEmpresa()}
                                className="text-lg font-semibold text-gray-700 border-b-2 border-indigo-500 outline-none bg-indigo-50 px-1 py-0.5"
                            />
                        ) : (
                            <h1
                                className="text-lg font-semibold text-gray-700 cursor-text hover:bg-gray-50 px-1 py-0.5 rounded transition-colors title-edit-hover leading-tight"
                                title="Clique para editar o nome da empresa"
                                onClick={() => {
                                    setTempEmpresa(empresa || "");
                                    setIsEditingEmpresa(true);
                                }}
                            >
                                {empresa ? empresa : "Sistema de Gestão"}
                            </h1>
                        )}
                        {empresaCnpj && !isEditingEmpresa && (
                            <span className="text-xs text-slate-500 font-medium px-1 mt-0.5">
                                CNPJ: {empresaCnpj}
                            </span>
                        )}
                    </div>

                    {/* Navegação */}
                    <nav className="flex items-center gap-1 ml-6 border-l border-gray-200 pl-6">
                        <NavLink to="/dashboard" icon={<LayoutDashboard size={16} />} label="Dashboard" />
                        <NavLink to="/usuarios" icon={<Users size={16} />} label="Usuários" />
                    </nav>
                </div>

                <div className="flex items-center gap-5">
                    <div className="text-right flex flex-col justify-center">
                        {/* Edição Inline do Usuário */}
                        {isEditingUser ? (
                            <input
                                autoFocus
                                type="text"
                                value={tempUser}
                                onChange={(e) => setTempUser(e.target.value)}
                                onBlur={handleUpdateUser}
                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateUser()}
                                className="text-sm font-medium text-gray-800 border-b border-indigo-500 outline-none bg-indigo-50 px-1 text-right"
                            />
                        ) : (
                            <p
                                className="text-sm font-medium text-gray-800 cursor-text hover:bg-gray-50 px-1 rounded transition-colors title-edit-hover"
                                title="Clique para editar seu nome"
                                onClick={() => {
                                    setTempUser(user || "");
                                    setIsEditingUser(true);
                                }}
                            >
                                {user}
                            </p>
                        )}

                        {/* Edição Inline do Cargo */}
                        {isEditingCargo ? (
                            <input
                                autoFocus
                                type="text"
                                value={tempCargo}
                                onChange={(e) => setTempCargo(e.target.value)}
                                onBlur={handleUpdateCargo}
                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateCargo()}
                                placeholder="Seu cargo..."
                                className="text-xs text-indigo-600 border-b border-indigo-500 outline-none bg-indigo-50 px-1 text-right mt-0.5"
                            />
                        ) : (
                            <p
                                className="text-xs text-indigo-600 font-medium cursor-text hover:bg-indigo-50 px-1 rounded transition-colors title-edit-hover mt-0.5"
                                title="Clique para editar seu cargo"
                                onClick={() => {
                                    setTempCargo(userCargo || "");
                                    setIsEditingCargo(true);
                                }}
                            >
                                {userCargo || "Adicionar Cargo"}
                            </p>
                        )}

                        <p className="text-[10px] text-gray-400 mt-1 px-1">
                            {userEmail}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
                        <button
                            onClick={() => setShowConfigModal(true)}
                            title="Configurações (CNPJ, CPF, CREA)"
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                            <Settings className="w-5 h-5" />
                        </button>

                        <button
                            onClick={logout}
                            title="Sair do sistema"
                            className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-100 transition"
                        >
                            Sair
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-8">
                <Outlet />
            </main>

            {/* Footer fixo */}
            <footer className="bg-white border-t border-gray-200 px-8 py-2 flex items-center justify-between shrink-0 sticky bottom-0 z-30">
                <span className="text-xs text-gray-400">© {new Date().getFullYear()} Solutia — Sistema de Gestão</span>
                <span className="text-xs text-gray-400">v1.0.0</span>
            </footer>

            {/* Chat Widget Popup */}
            <ChatWidget />

        </div>
    )
}

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
    const location = useLocation()
    const isActive = location.pathname === to || location.pathname.startsWith(to + '/')

    return (
        <Link
            to={to}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
        >
            {icon}
            {label}
        </Link>
    )
}
