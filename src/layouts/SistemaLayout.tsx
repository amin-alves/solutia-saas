import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Loader2, Settings, Users, BarChart2 } from "lucide-react"
import ConfigModal from "../components/dashboard/ConfigModal"
import { ChatWidget } from "../components/ChatWidget"
import { EquipeModal } from "../components/EquipeModal"
import { useUserPreferences } from "@/contexts/UserPreferencesContext"

const getStoredValue = (key: string) => (typeof window !== 'undefined' ? localStorage.getItem(key) : null)

export default function SistemaLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const { preferences, setThemeColor, setUserScope } = useUserPreferences()
    const [user, setUser] = useState<string | null>(() => getStoredValue("solutia_user"))
    const [empresa, setEmpresa] = useState<string | null>(() => getStoredValue("solutia_empresa_nome"))
    const [empresaId, setEmpresaId] = useState<string | null>(() => getStoredValue("solutia_empresa_id"))
    const [empresaCnpj, setEmpresaCnpj] = useState<string | null>(() => getStoredValue("solutia_empresa_cnpj"))
    const [logoUrl, setLogoUrl] = useState<string | null>(() => getStoredValue("solutia_empresa_logo"))
    const [userCargo, setUserCargo] = useState<string | null>(() => getStoredValue("solutia_user_cargo"))
    const [userCpf, setUserCpf] = useState<string | null>(() => getStoredValue("solutia_user_cpf"))
    const [userRegistro, setUserRegistro] = useState<string | null>(() => getStoredValue("solutia_user_registro"))

    // UI States
    const [loading, setLoading] = useState(true)
    const [isUploading, setIsUploading] = useState(false)
    const [showConfigModal, setShowConfigModal] = useState(false)
    const [showEquipeModal, setShowEquipeModal] = useState(false)
    const [perfilId, setPerfilId] = useState<string | null>(null)
    const [userEmail, setUserEmail] = useState<string | null>(null)

    // Inline Edit States
    const [isEditingEmpresa, setIsEditingEmpresa] = useState(false)
    const [tempEmpresa, setTempEmpresa] = useState('')

    const THEME_COLORS = [
        { name: 'indigo', code: '#4f46e5' }, { name: 'blue', code: '#2563eb' },
        { name: 'sky', code: '#0284c7' }, { name: 'cyan', code: '#0891b2' },
        { name: 'teal', code: '#0d9488' }, { name: 'emerald', code: '#059669' },
        { name: 'green', code: '#16a34a' }, { name: 'lime', code: '#65a30d' },
        { name: 'yellow', code: '#ca8a04' }, { name: 'amber', code: '#d97706' },
        { name: 'orange', code: '#ea580c' }, { name: 'red', code: '#dc2626' },
        { name: 'rose', code: '#e11d48' }, { name: 'pink', code: '#db2777' },
        { name: 'fuchsia', code: '#c026d3' }, { name: 'purple', code: '#9333ea' }
    ]
    const [showPalette, setShowPalette] = useState(false)

    const [isEditingUser, setIsEditingUser] = useState(false)
    const [tempUser, setTempUser] = useState('')

    const [isEditingCargo, setIsEditingCargo] = useState(false)
    const [tempCargo, setTempCargo] = useState('')

    const fileInputRef = useRef<HTMLInputElement>(null)
    const paletteRef = useRef<HTMLDivElement>(null)

    // Initialize theme on mount
    useEffect(() => {
        const savedTheme = localStorage.getItem('solutia_theme');
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        }
    }, []);

    useEffect(() => {
        // Set root CSS variable for primary color so other pages can consume it
        document.documentElement.style.setProperty('--primary-color', preferences.themeColor)
        // Also a faded version for backgrounds
        document.documentElement.style.setProperty('--primary-color-light', `${preferences.themeColor}20`)
    }, [preferences.themeColor])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (paletteRef.current && !paletteRef.current.contains(event.target as Node)) {
                setShowPalette(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        let isMounted = true

        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                if (isMounted) router.replace("/")
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

                    setUserScope(session.user.id)
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
                    setUserScope(session.user.id)
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
                router.replace("/")
            }
        })

        return () => {
            isMounted = false
            subscription.unsubscribe()
        }
    }, [router, setUserScope])

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
        router.replace("/")
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
        <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden transition-colors duration-300">

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

            {showEquipeModal && (
                <EquipeModal onClose={() => setShowEquipeModal(false)} />
            )}

            <header className={`bg-white dark:bg-gray-800 shadow dark:shadow-gray-900/50 px-4 ${preferences.compactMode ? 'py-1' : 'py-1.5'} flex justify-between items-center shrink-0 sticky top-0 z-30 transition-colors duration-300`}>
                <div className="flex items-center gap-2">
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
                            <div className="h-6 w-6 rounded flex items-center justify-center" style={{ backgroundColor: 'var(--primary-color-light)' }}>
                                <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--primary-color)' }} />
                            </div>
                        ) : logoUrl ? (
                            <img src={logoUrl} alt={`Logo ${empresa}`} className="h-6 w-auto object-contain" />
                        ) : (
                            <div className="h-6 w-6 rounded flex items-center justify-center font-bold shrink-0 text-sm" style={{ backgroundColor: 'var(--primary-color-light)', color: 'var(--primary-color)' }}>
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
                                className="text-lg font-semibold text-gray-700 dark:text-gray-200 border-b-2 border-indigo-500 outline-none bg-indigo-50 dark:bg-gray-700 px-1 py-0.5"
                            />
                        ) : (
                            <h1
                                className="text-lg font-semibold text-gray-700 dark:text-gray-200 cursor-text hover:bg-gray-50 dark:hover:bg-gray-700 px-1 py-0.5 rounded transition-colors title-edit-hover leading-tight"
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
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium px-1 mt-0.5">
                                CNPJ: {empresaCnpj}
                            </span>
                        )}
                    </div>


                </div>

                <div className="flex items-center gap-1.5">

                    {/* Theme Picker */}
                    <div className="relative" ref={paletteRef}>
                        <button
                            onClick={() => setShowPalette(!showPalette)}
                            className="w-5 h-5 rounded-full shadow-sm border border-gray-200 dark:border-gray-600 transition-transform hover:scale-110"
                            style={{ backgroundColor: preferences.themeColor }}
                            title="Alterar cor do layout"
                        />
                        {showPalette && (
                            <div className="absolute right-0 top-8 bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700 rounded-lg p-2 z-50 grid grid-cols-4 gap-1.5 w-32">
                                {THEME_COLORS.map(c => (
                                    <button
                                        key={c.name}
                                        onClick={() => {
                                            setThemeColor(c.code)
                                            setShowPalette(false)
                                        }}
                                        className={`w-5 h-5 rounded hover:scale-110 transition-transform ${preferences.themeColor === c.code ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                                        style={{ backgroundColor: c.code }}
                                        title={c.name}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

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
                                className="text-sm font-medium text-gray-800 dark:text-gray-200 border-b border-indigo-500 outline-none bg-indigo-50 dark:bg-gray-700 px-1 text-right"
                            />
                        ) : (
                            <p
                                className="text-sm font-medium text-gray-800 dark:text-gray-200 cursor-text hover:bg-gray-50 dark:hover:bg-gray-700 px-1 rounded transition-colors title-edit-hover"
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
                                className="text-xs text-indigo-600 dark:text-indigo-400 border-b border-indigo-500 outline-none bg-indigo-50 dark:bg-gray-700 px-1 text-right mt-0.5"
                            />
                        ) : (
                            <p
                                className="text-xs text-indigo-600 dark:text-indigo-400 font-medium cursor-text hover:bg-indigo-50 dark:hover:bg-gray-700 px-1 rounded transition-colors title-edit-hover mt-0.5"
                                title="Clique para editar seu cargo"
                                onClick={() => {
                                    setTempCargo(userCargo || "");
                                    setIsEditingCargo(true);
                                }}
                            >
                                {userCargo || "Adicionar Cargo"}
                            </p>
                        )}

                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 px-1">
                            {userEmail}
                        </p>
                    </div>

                    <div className="flex items-center gap-1.5 border-l border-gray-200 dark:border-gray-700 pl-3">
                        <button
                            onClick={() => setShowEquipeModal(true)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 mr-1 border"
                            style={{ backgroundColor: 'var(--primary-color-light)', color: 'var(--primary-color)', borderColor: 'var(--primary-color-light)' }}
                        >
                            <Users size={14} />
                            Gestão de Equipe
                        </button>

                        {/* Botão Analytics: exclusivo do superadmin da plataforma */}
                        {userEmail === 'amin.alves.jr@gmail.com' && (
                            <button
                                onClick={() => router.push('/analytics')}
                                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 mr-1 border border-violet-100 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                                title="Painel de Analytics (Interno — Superadmin)"
                            >
                                <BarChart2 size={14} />
                                Analytics
                            </button>
                        )}

                        <button
                            onClick={() => setShowConfigModal(true)}
                            title="Configurações (CNPJ, CPF, CREA)"
                            className="p-1.5 text-gray-400 dark:text-gray-500 rounded-lg transition-colors"
                            style={{ color: showConfigModal ? 'var(--primary-color)' : undefined, backgroundColor: showConfigModal ? 'var(--primary-color-light)' : undefined }}
                        >
                            <Settings className="w-4 h-4" />
                        </button>

                        <button
                            onClick={logout}
                            title="Sair do sistema"
                            className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2.5 py-1 rounded-lg text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition"
                        >
                            Sair
                        </button>
                    </div>

                </div>
            </header>

            <main className={`flex-1 overflow-y-auto ${preferences.compactMode ? 'p-2.5' : 'p-4'} transition-colors duration-300`}>
                {children}
            </main>

            {/* Footer fixo */}
            <footer className={`bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 ${preferences.compactMode ? 'py-0.5' : 'py-1'} flex items-center justify-between shrink-0 sticky bottom-0 z-30 transition-colors duration-300`}>
                <span className="text-xs text-gray-400 dark:text-gray-500"> {new Date().getFullYear()} Solutia — Sistema de Gestão</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">v1.0.0</span>
            </footer>

            {/* Chat Widget Popup */}
            <ChatWidget />

        </div>
    )
}


