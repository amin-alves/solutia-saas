import { useEffect, useState, useRef } from "react"
import { useNavigate, Outlet } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

export default function SistemaLayout() {
    const navigate = useNavigate()
    const [user, setUser] = useState<string | null>(null)
    const [empresa, setEmpresa] = useState<string | null>(null)
    const [empresaId, setEmpresaId] = useState<string | null>(null)
    const [logoUrl, setLogoUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [isUploading, setIsUploading] = useState(false)
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
                    .select("nome, empresa_id, empresas(nome, logo_url)")
                    .eq("id", session.user.id)
                    .single()



                if (!error && perfilData) {
                    const empresaRef = perfilData.empresas as unknown as { nome: string, logo_url?: string } | null;
                    const nomeEmpresaBanco = empresaRef?.nome || "Sem Empresa Vinculada";
                    const logoDb = empresaRef?.logo_url || null;

                    setUser(perfilData.nome || session.user.email)
                    setEmpresa(nomeEmpresaBanco)
                    if (logoDb) setLogoUrl(logoDb)
                    if (perfilData.empresa_id) setEmpresaId(perfilData.empresa_id)

                    // Salvar no localStorage temporariamente caso outras rotas antigas precisem
                    if (perfilData.empresa_id) {
                        localStorage.setItem("solutia_empresa_id", perfilData.empresa_id)
                    } else {
                        localStorage.removeItem("solutia_empresa_id")
                    }

                    if (empresaRef?.nome) {
                        localStorage.setItem("solutia_empresa_nome", nomeEmpresaBanco)
                        if (logoDb) {
                            localStorage.setItem("solutia_empresa_logo", logoDb)
                        } else {
                            localStorage.removeItem("solutia_empresa_logo")
                        }
                    } else {
                        localStorage.removeItem("solutia_empresa_nome")
                        localStorage.removeItem("solutia_empresa_logo")
                    }
                } else {
                    setUser(session.user.email ?? "Usuário")
                    setEmpresa("Empresa Desconhecida")
                    setLogoUrl(null)
                    localStorage.removeItem("solutia_empresa_id")
                    localStorage.removeItem("solutia_empresa_nome")
                    localStorage.removeItem("solutia_empresa_logo")
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

    if (loading) return null

    return (
        <div className="flex-1 flex flex-col min-h-screen bg-gray-100">

            <header className="bg-white shadow px-8 py-4 flex justify-between items-center">
                <div
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
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
                        <div className="h-8 w-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-700 font-bold">
                            {empresa ? empresa.charAt(0) : 'S'}
                        </div>
                    )}
                    <h1 className="text-lg font-semibold text-gray-700">
                        {empresa ? `Painel - ${empresa}` : "Sistema de Gestão"}
                    </h1>
                </div>

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
    )
}
