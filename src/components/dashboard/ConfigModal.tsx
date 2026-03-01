import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Save, Loader2, Building, User } from 'lucide-react';

interface ConfigModalProps {
    empresaId: string;
    perfilId: string;
    initialCnpj: string;
    initialCpf: string;
    initialRegistro: string;
    onClose: () => void;
    onSuccess: (data: { cnpj: string; cpf: string; registro: string }) => void;
}

export default function ConfigModal({
    empresaId,
    perfilId,
    initialCnpj,
    initialCpf,
    initialRegistro,
    onClose,
    onSuccess
}: ConfigModalProps) {
    const [cnpj, setCnpj] = useState(initialCnpj);
    const [cpf, setCpf] = useState(initialCpf);
    const [registro, setRegistro] = useState(initialRegistro);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Formatter simples apenas removendo letras se quiser, 
    // ou deixamos livre para o usuário digitar a máscara para não complicar agora

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);

        try {
            // Atualizar Empresa (CNPJ)
            const { error: errorEmpresa } = await supabase
                .from('empresas')
                .update({ cnpj })
                .eq('id', empresaId);

            if (errorEmpresa) throw errorEmpresa;

            // Atualizar Perfil (CPF e Registro)
            const { error: errorPerfil } = await supabase
                .from('perfis')
                .update({
                    cpf,
                    registro_profissional: registro
                })
                .eq('id', perfilId);

            if (errorPerfil) throw errorPerfil;

            // Sucesso!
            onSuccess({ cnpj, cpf, registro });

        } catch (err: any) {
            console.error('Erro ao salvar configurações:', err);
            setError(err.message || 'Erro ao salvar os dados. Verifique a conexão.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col relative animate-in fade-in zoom-in duration-200">

                {/* Cabeçalho */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Configurações Base</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Dados utilizados na emissão de documentos</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-2 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Corpo */}
                <div className="p-6 space-y-6">
                    {/* Sessão Empresa */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-indigo-700 font-semibold border-b border-gray-100 pb-2">
                            <Building className="w-5 h-5" />
                            <h3>Dados da Empresa</h3>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                            <input
                                type="text"
                                value={cnpj}
                                onChange={(e) => setCnpj(e.target.value)}
                                placeholder="Ex: 00.000.000/0001-00"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none"
                            />
                        </div>
                    </div>

                    {/* Sessão Usuário */}
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center gap-2 text-indigo-700 font-semibold border-b border-gray-100 pb-2">
                            <User className="w-5 h-5" />
                            <h3>Meus Dados Profissionais</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                                <input
                                    type="text"
                                    value={cpf}
                                    onChange={(e) => setCpf(e.target.value)}
                                    placeholder="Ex: 123.456.789-00"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">CREA / Matrícula</label>
                                <input
                                    type="text"
                                    value={registro}
                                    onChange={(e) => setRegistro(e.target.value)}
                                    placeholder="Ex: CREA 12345/MG"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
                            {error}
                        </div>
                    )}
                </div>

                {/* Rodapé e Ações */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 min-w-[120px] justify-center"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Gravar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
