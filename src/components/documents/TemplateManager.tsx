import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

import { Plus, Edit2, Trash2, Save, X, FileText } from 'lucide-react'

interface Template {
    id: string
    nome: string
    descricao: string | null
    conteudo_html: string
    empresa_id: string
}

interface TemplateManagerProps {
    empresaId: string
    onSelectTemplate?: (template: Template) => void
}

export function TemplateManager({ empresaId, onSelectTemplate }: TemplateManagerProps) {
    const [templates, setTemplates] = useState<Template[]>([])
    const [loading, setLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [currentTemplate, setCurrentTemplate] = useState<Partial<Template> | null>(null)

    useEffect(() => {
        fetchTemplates()
    }, [empresaId])

    const fetchTemplates = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('document_templates')
                .select('*')
                .eq('empresa_id', empresaId)
                .order('criado_em', { ascending: false })

            if (error) throw error
            setTemplates(data || [])
        } catch (error) {
            console.error('Erro ao buscar templates:', error)
            alert('Não foi possível carregar os templates.')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!currentTemplate?.nome || !currentTemplate?.conteudo_html) {
            alert('O nome e o conteúdo do template são obrigatórios.')
            return
        }

        try {
            if (currentTemplate.id) {
                // Atualizar existente
                const { error } = await supabase
                    .from('document_templates')
                    .update({
                        nome: currentTemplate.nome,
                        descricao: currentTemplate.descricao,
                        conteudo_html: currentTemplate.conteudo_html,
                        atualizado_em: new Date().toISOString()
                    })
                    .eq('id', currentTemplate.id)

                if (error) throw error
            } else {
                // Criar novo
                const { error } = await supabase
                    .from('document_templates')
                    .insert({
                        nome: currentTemplate.nome,
                        descricao: currentTemplate.descricao,
                        conteudo_html: currentTemplate.conteudo_html,
                        empresa_id: empresaId
                    })

                if (error) throw error
            }

            setIsEditing(false)
            setCurrentTemplate(null)
            fetchTemplates()
        } catch (error) {
            console.error('Erro ao salvar template:', error)
            alert('Erro ao salvar o template.')
        }
    }

    const handleDelete = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir este template? Todos os documentos gerados a partir dele não serão afetados, mas o modelo não estará mais disponível.')) {
            return
        }

        try {
            const { error } = await supabase
                .from('document_templates')
                .delete()
                .eq('id', id)

            if (error) throw error
            fetchTemplates()
        } catch (error) {
            console.error('Erro ao excluir template:', error)
            alert('Erro ao excluir template.')
        }
    }

    if (isEditing) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold dark:text-white">
                        {currentTemplate?.id ? 'Editar Template' : 'Novo Template'}
                    </h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <X size={18} /> Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            <Save size={18} /> Salvar Template
                        </button>
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Nome do Template *
                        </label>
                        <input
                            type="text"
                            value={currentTemplate?.nome || ''}
                            onChange={(e) => setCurrentTemplate(prev => ({ ...prev, nome: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Ex: Contrato de Prestação de Serviços"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Descrição (Opcional)
                        </label>
                        <input
                            type="text"
                            value={currentTemplate?.descricao || ''}
                            onChange={(e) => setCurrentTemplate(prev => ({ ...prev, descricao: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Breve descrição do uso deste template"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Conteúdo do Modelo (HTML) *
                    </label>
                    <textarea
                        value={currentTemplate?.conteudo_html || ''}
                        onChange={(e) => setCurrentTemplate(prev => ({ ...prev, conteudo_html: e.target.value }))}
                        rows={12}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                        placeholder="Cole o conteúdo HTML do template aqui..."
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-lg font-semibold dark:text-white flex items-center gap-2">
                    <FileText className="text-blue-500" /> Modelos (Templates)
                </h2>
                <button
                    onClick={() => {
                        setCurrentTemplate({ nome: '', descricao: '', conteudo_html: '' })
                        setIsEditing(true)
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                    <Plus size={16} /> Novo Modelo
                </button>
            </div>

            <div className="p-4">
                {loading ? (
                    <div className="text-center py-8 text-gray-500">Carregando templates...</div>
                ) : templates.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500 dark:text-gray-400 mb-4">Nenhum template cadastrado ainda.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.map(template => (
                            <div key={template.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 transition-colors flex flex-col h-full">
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">{template.nome}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 min-h-[40px]">
                                    {template.descricao || 'Sem descrição'}
                                </p>

                                <div className="mt-auto flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-700">
                                    {onSelectTemplate && (
                                        <button
                                            onClick={() => onSelectTemplate(template)}
                                            className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline"
                                        >
                                            Usar Modelo
                                        </button>
                                    )}
                                    <div className="flex gap-2 ml-auto">
                                        <button
                                            onClick={() => {
                                                setCurrentTemplate(template)
                                                setIsEditing(true)
                                            }}
                                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-md transition-colors"
                                            title="Editar"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(template.id)}
                                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 rounded-md transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
