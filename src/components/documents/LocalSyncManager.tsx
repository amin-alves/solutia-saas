import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { HardDriveDownload, FolderSync, Loader2, CheckCircle2 } from 'lucide-react'

export function LocalSyncManager({ empresaId }: { empresaId: string }) {
    const [isSyncing, setIsSyncing] = useState(false)
    const [progress, setProgress] = useState({ current: 0, total: 0, status: '' })
    const [lastSync, setLastSync] = useState<Date | null>(null)

    const handleStartSync = async () => {
        // Verificar suporte à File System Access API
        if (!('showDirectoryPicker' in window)) {
            alert('Seu navegador não suporta a gravação direta em pastas locais. Por favor, use um navegador baseado em Chromium (Chrome, Edge) no Windows para utilizar o Backup Local Automático.')
            return
        }

        try {
            // 1. Pedir permissão ao usuário para selecionar a pasta no PC
            setProgress({ current: 0, total: 0, status: 'Aguardando seleção de pasta...' })
            // @ts-ignore
            const dirHandle = await window.showDirectoryPicker({
                mode: 'readwrite'
            })

            setIsSyncing(true)
            setProgress({ current: 0, total: 0, status: 'Buscando árvore de documentos...' })

            // 2. Buscar todos os documentos finalizados do cliente
            const { data: documentos, error } = await supabase
                .from('documentos')
                .select('id, titulo, pasta, status, versao_atual')
                .eq('empresa_id', empresaId)
                .eq('status', 'finalizado')

            if (error) throw error

            if (!documentos || documentos.length === 0) {
                alert('Nenhum documento finalizado encontrado para backup.')
                setIsSyncing(false)
                return
            }

            setProgress({ current: 0, total: documentos.length, status: 'Iniciando downloads...' })

            // 3. Organizar e baixar
            let count = 0;
            for (const doc of documentos) {
                count++;
                setProgress(prev => ({ ...prev, current: count, status: `Sincronizando: ${doc.titulo}` }))

                try {
                    // Garantir que a subpasta existe (Pasta do Documento)
                    const folderName = doc.pasta || 'Geral'
                    // @ts-ignore
                    const subDirHandle = await dirHandle.getDirectoryHandle(folderName, { create: true })

                    // Baixar Arquivo do Supabase
                    const path = `final/${empresaId}/${doc.id}_v${doc.versao_atual || 1}.html`
                    const { data: blob, error: downloadError } = await supabase.storage.from('documentos-saas').download(path)

                    if (downloadError) throw downloadError

                    // Salvar Arquivo Locamente
                    const fileName = `${doc.titulo.replace(/[\\/:*?"<>|]/g, '_')}_v${doc.versao_atual || 1}.html`
                    // @ts-ignore
                    const fileHandle = await subDirHandle.getFileHandle(fileName, { create: true })
                    // @ts-ignore
                    const writable = await fileHandle.createWritable()
                    await writable.write(blob)
                    await writable.close()

                } catch (docErr) {
                    console.error(`Erro ao baixar [${doc.titulo}]:`, docErr)
                    // Continua o loop ignorando o erro deste arquivo específico
                }
            }

            setLastSync(new Date())
            setProgress({ current: documentos.length, total: documentos.length, status: 'Sincronização Concluída!' })

            setTimeout(() => {
                setIsSyncing(false)
            }, 3000)

        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('Seleção de pasta cancelada.')
            } else {
                console.error('Erro na sincronização:', error)
                alert('Ocorreu um erro durante a sincronização local.')
            }
            setIsSyncing(false)
        }
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-900/50 p-6 flex flex-col items-start gap-4 mb-6">
            <div className="flex items-center gap-4 w-full justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <HardDriveDownload className="text-indigo-600 dark:text-indigo-400" /> Backup Local (Sincronizar com o PC)
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
                        Faça o download de toda a sua árvore de documentos finalizados organizados por pastas diretamente para uma pasta segura no seu Computador, garantindo backup offline contínuo.
                    </p>
                </div>

                <button
                    onClick={handleStartSync}
                    disabled={isSyncing}
                    className="shrink-0 px-6 py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold rounded-xl border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-800/50 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <FolderSync className="w-5 h-5" />}
                    {isSyncing ? 'Sincronizando...' : 'Iniciar Sincronização Local'}
                </button>
            </div>

            {isSyncing && (
                <div className="w-full mt-2 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{progress.status}</span>
                        <span className="text-gray-500">{progress.current} de {progress.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div
                            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {!isSyncing && lastSync && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-md">
                    <CheckCircle2 size={16} /> Último backup realizado: {lastSync.toLocaleString('pt-BR')}
                </div>
            )}
        </div>
    )
}
