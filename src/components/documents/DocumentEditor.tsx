import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Save, FileCheck2, Loader2, FileText, TableProperties } from 'lucide-react'
import { SpreadsheetEditor } from './SpreadsheetEditor'
import { RichTextEditor } from './RichTextEditor'

interface Template {
    id: string
    nome: string
    descricao: string | null
    conteudo_html: string
    tipo?: 'texto' | 'planilha'
}

interface DocumentEditorProps {
    empresaId: string
    initialTemplate?: Template | null
    documentoId?: string | null // Se estiver editando um rascunho existente
    onClose: () => void
    onSaved: () => void
}

export function DocumentEditor({ empresaId, initialTemplate, documentoId, onClose, onSaved }: DocumentEditorProps) {
    const [loading, setLoading] = useState(false)
    const [titulo, setTitulo] = useState(initialTemplate?.nome || 'Novo Documento')
    const [pasta, setPasta] = useState('Geral')
    const [tipo, setTipo] = useState<'texto' | 'planilha'>(initialTemplate?.tipo || 'texto')
    const [conteudo, setConteudo] = useState(initialTemplate?.conteudo_html || '')
    const [spreadsheetData, setSpreadsheetData] = useState<any[][]>([
        ['', '', '', '', ''],
        ['', '', '', '', ''],
        ['', '', '', '', ''],
        ['', '', '', '', ''],
        ['', '', '', '', ''],
    ])
    const isDraft = true // Documento sendo editado em tela cheia na pasta temp é sempre rascunho
    const [currentDocId, setCurrentDocId] = useState<string | null>(documentoId || null)

    useEffect(() => {
        if (documentoId) {
            loadDraft(documentoId)
        }
    }, [documentoId])

    const loadDraft = async (id: string) => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('documentos')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error

            if (data) {
                setTitulo(data.titulo)
                setPasta(data.pasta || 'Geral')
                setTipo(data.tipo || 'texto')

                // Em um cenário real, você buscaria o arquivo do storage aqui usando data.caminho_draft ou similiar.
                // Para manter simples sem alterar muito o schema, simulamos.
                if (data.tipo === 'planilha') {
                    // Try to parse se tiver vindo como JSON no banco (temporário)
                }
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleSaveDraft = async () => {
        if (!titulo.trim()) {
            alert('Dê um título ao documento antes de salvar o rascunho.')
            return
        }

        setLoading(true)
        try {
            // 1. Salvar o conteúdo SFDT/JSON no bucket "documentos-saas" pasta "temp"
            const tempFilename = `temp/${empresaId}/${currentDocId || Date.now()}.${tipo === 'texto' ? 'sfdt' : 'json'}`
            const payload = tipo === 'texto' ? conteudo : JSON.stringify(spreadsheetData)
            const blob = new Blob([payload], { type: 'application/json' })

            const { error: storageError } = await supabase.storage
                .from('documentos-saas')
                .upload(tempFilename, blob, { upsert: true })

            if (storageError) throw storageError

            // 2. Atualizar ou Criar registro na tabela documentos com status = 'rascunho'
            const docData = {
                titulo,
                pasta,
                empresa_id: empresaId,
                status: 'rascunho',
                data: new Date().toLocaleDateString('pt-BR'),
                tamanho: (blob.size / 1024).toFixed(1) + ' KB'
            }

            if (currentDocId) {
                const { error: dbError } = await supabase
                    .from('documentos')
                    .update(docData)
                    .eq('id', currentDocId)
                if (dbError) throw dbError
            } else {
                const { data: newDoc, error: dbError } = await supabase
                    .from('documentos')
                    .insert([docData])
                    .select()
                if (dbError) throw dbError
                if (newDoc) setCurrentDocId(newDoc[0].id)
            }

            alert('Rascunho salvo com sucesso!')
            onSaved()
        } catch (e: any) {
            console.error('Erro ao salvar rascunho:', e)
            alert('Falha ao salvar rascunho. Detalhe: ' + (e?.message || JSON.stringify(e)))
        } finally {
            setLoading(false)
        }
    }

    const handlePublish = async () => {
        if (!window.confirm('Ao publicar, este documento se tornará uma versão final (V1) no Armazém e sairá dos rascunhos. Confirmar?')) {
            return
        }

        setLoading(true)
        try {
            // 1. Salva o arquivo final na pasta "final"
            const docIdToUse = currentDocId || crypto.randomUUID()
            const ext = tipo === 'planilha' ? 'xlsx' : 'sfdt' // No futuro pode converter json para formato excel real
            const finalFilename = `final/${empresaId}/${docIdToUse}_v1.${ext}`

            const payload = tipo === 'texto' ? conteudo : JSON.stringify(spreadsheetData)
            const blob = new Blob([payload], { type: 'application/json' })

            const { error: storageError } = await supabase.storage
                .from('documentos-saas')
                .upload(finalFilename, blob, { upsert: true })

            if (storageError) throw storageError

            // 2. Atualiza a tabela documentos para finalizado
            const docData = {
                id: docIdToUse, // Força o ID se for novo
                titulo,
                pasta,
                empresa_id: empresaId,
                status: 'finalizado',
                versao_atual: 1,
                data: new Date().toLocaleDateString('pt-BR'),
                tamanho: (blob.size / 1024).toFixed(1) + ' KB'
            }

            const { error: dbError } = await supabase
                .from('documentos')
                .upsert([docData])

            if (dbError) throw dbError

            // 3. Cria o registro na tabela de Versões
            const { error: versionError } = await supabase
                .from('document_versions')
                .insert({
                    documento_id: docIdToUse,
                    numero_versao: 1,
                    caminho_storage: finalFilename,
                    comentario_alteracao: 'Versão Inicial Publicada'
                })

            if (versionError) throw versionError

            alert('Documento publicado com sucesso!')
            onSaved()
            onClose()

        } catch (e) {
            console.error('Erro ao publicar:', e)
            alert('Falha ao publicar documento.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden animate-in fade-in duration-300">
            {/* Topbar */}
            <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 shrink-0 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex flex-col">
                        <input
                            type="text"
                            value={titulo}
                            onChange={e => setTitulo(e.target.value)}
                            className="font-bold text-lg bg-transparent border-none focus:outline-none focus:ring-0 p-0 text-gray-900 dark:text-white placeholder:text-gray-300"
                            placeholder="Título do Documento..."
                        />
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            <span>{isDraft ? 'Rascunho não salvo' : 'Salvo na nuvem'}</span>
                            <span>•</span>
                            <select
                                value={pasta}
                                onChange={e => setPasta(e.target.value)}
                                className="bg-transparent border-none py-0 pl-0 pr-4 focus:ring-0 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                            >
                                <option value="Geral">Pasta: Geral</option>
                                <option value="Contratos">Pasta: Contratos</option>
                                <option value="RH">Pasta: RH</option>
                                <option value="Propostas">Pasta: Propostas</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 border-r border-gray-200 dark:border-gray-700 pr-4 mr-1">
                    <button
                        onClick={() => setTipo('texto')}
                        title="Documento de Texto"
                        className={`p-2 rounded-md flex items-center gap-1 transition-colors ${tipo === 'texto' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                        <FileText size={18} /> <span className="text-xs font-semibold hidden sm:inline">Docs</span>
                    </button>
                    <button
                        onClick={() => setTipo('planilha')}
                        title="Planilha"
                        className={`p-2 rounded-md flex items-center gap-1 transition-colors ${tipo === 'planilha' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                        <TableProperties size={18} /> <span className="text-xs font-semibold hidden sm:inline">Sheets</span>
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSaveDraft}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Salvar Rascunho
                    </button>
                    <button
                        onClick={handlePublish}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/30 flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <FileCheck2 size={16} />}
                        Finalizar & Publicar
                    </button>
                </div>
            </div>

            {/* Editor Main Canvas */}
            <div className={`flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-950 p-4 shrink-0 overflow-x-auto ${tipo === 'texto' ? 'md:p-8 flex justify-center' : ''}`}>
                <div className={`shadow-xl border border-gray-200 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-900 ${tipo === 'texto' ? 'w-full max-w-[21cm] min-h-[29.7cm]' : 'w-full h-full min-h-[500px]'}`}>
                    {tipo === 'texto' ? (
                        <RichTextEditor
                            content={conteudo}
                            onChange={setConteudo}
                            editable={true}
                        />
                    ) : (
                        <SpreadsheetEditor
                            data={spreadsheetData}
                            onChange={setSpreadsheetData}
                            editable={true}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
