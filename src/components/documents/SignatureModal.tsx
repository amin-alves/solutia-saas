import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { PDFDocument, rgb } from 'pdf-lib'
import { X, Pen, Type, Loader2, CheckCircle2 } from 'lucide-react'

interface SignatureModalProps {
    documentoId: string
    versaoId?: string
    titulo: string
    extensao: string | null
    empresaId: string
    caminhoStorage: string | null
    onClose: () => void
    onSigned: () => void
}

export function SignatureModal({ documentoId, versaoId, titulo, extensao, caminhoStorage, onClose, onSigned }: SignatureModalProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [mode, setMode] = useState<'draw' | 'type'>('draw')
    const [typedName, setTypedName] = useState('')
    const [isDrawing, setIsDrawing] = useState(false)
    const [signing, setSigning] = useState(false)
    const [signed, setSigned] = useState(false)
    const [status, setStatus] = useState('')

    useEffect(() => {
        if (mode === 'draw' && canvasRef.current) {
            const canvas = canvasRef.current
            const ctx = canvas.getContext('2d')!
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.strokeStyle = '#1e293b'
            ctx.lineWidth = 2
            ctx.lineCap = 'round'
        }
    }, [mode])

    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current!
        const rect = canvas.getBoundingClientRect()
        if ('touches' in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            }
        }
        return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true)
        const ctx = canvasRef.current!.getContext('2d')!
        const pos = getPos(e)
        ctx.beginPath()
        ctx.moveTo(pos.x, pos.y)
    }

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return
        const ctx = canvasRef.current!.getContext('2d')!
        const pos = getPos(e)
        ctx.lineTo(pos.x, pos.y)
        ctx.stroke()
    }

    const stopDraw = () => setIsDrawing(false)

    const clearCanvas = () => {
        const canvas = canvasRef.current!
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    // === Gerar imagem da assinatura digitada em canvas ===
    const generateTypedSignatureImage = (): string => {
        const canvas = document.createElement('canvas')
        canvas.width = 440
        canvas.height = 120
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = '#1e293b'
        ctx.font = 'italic 42px "Georgia", "Times New Roman", serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(typedName, canvas.width / 2, canvas.height / 2)
        return canvas.toDataURL('image/png')
    }

    // === Embedar assinatura no PDF ===
    const embedSignatureOnPdf = async (signatureImageBase64: string): Promise<Uint8Array | null> => {
        if (!caminhoStorage || extensao?.toLowerCase() !== 'pdf') return null

        try {
            setStatus('Baixando documento...')
            const { data: fileData, error } = await supabase.storage
                .from('documentos_corporativos')
                .download(caminhoStorage)

            if (error || !fileData) return null

            setStatus('Inserindo assinatura no PDF...')
            const pdfBytes = await fileData.arrayBuffer()
            const pdfDoc = await PDFDocument.load(pdfBytes)

            // Converter base64 para bytes
            const base64Data = signatureImageBase64.replace(/^data:image\/png;base64,/, '')
            const sigBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
            const sigImage = await pdfDoc.embedPng(sigBytes)

            // Pegar última página
            const pages = pdfDoc.getPages()
            const lastPage = pages[pages.length - 1]
            const { width: pageWidth } = lastPage.getSize()

            // Dimensões da assinatura
            const sigWidth = 200
            const sigHeight = (sigImage.height / sigImage.width) * sigWidth

            // Posição: canto inferior direito com margem
            const x = pageWidth - sigWidth - 60
            const y = 50

            // Fundo branco semitransparente atrás da assinatura
            lastPage.drawRectangle({
                x: x - 10,
                y: y - 10,
                width: sigWidth + 20,
                height: sigHeight + 50,
                color: rgb(1, 1, 1),
                opacity: 0.9,
                borderColor: rgb(0.8, 0.8, 0.8),
                borderWidth: 1,
            })

            // Desenhar assinatura
            lastPage.drawImage(sigImage, {
                x,
                y: y + 25,
                width: sigWidth,
                height: sigHeight,
            })

            // Linha de assinatura
            lastPage.drawLine({
                start: { x, y: y + 22 },
                end: { x: x + sigWidth, y: y + 22 },
                thickness: 0.5,
                color: rgb(0.5, 0.5, 0.5),
            })

            // Texto abaixo da linha
            const font = await pdfDoc.embedFont('Helvetica' as any)
            const now = new Date().toLocaleString('pt-BR')
            lastPage.drawText(`Assinado digitalmente em ${now}`, {
                x,
                y: y + 5,
                size: 7,
                font,
                color: rgb(0.4, 0.4, 0.4),
            })

            const modifiedPdf = await pdfDoc.save()
            return modifiedPdf
        } catch (e) {
            console.error('Erro ao embedar assinatura no PDF:', e)
            return null
        }
    }

    const computeHash = async (data?: ArrayBuffer): Promise<string> => {
        try {
            let buffer: ArrayBuffer

            if (data) {
                buffer = data
            } else if (caminhoStorage) {
                const { data: fileData, error } = await supabase.storage
                    .from('documentos_corporativos')
                    .download(caminhoStorage)
                if (error || !fileData) return 'hash-indisponivel'
                buffer = await fileData.arrayBuffer()
            } else {
                return 'sem-arquivo'
            }

            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
            const hashArray = Array.from(new Uint8Array(hashBuffer))
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
        } catch {
            return 'hash-indisponivel'
        }
    }

    const handleSign = async () => {
        // Validar
        if (mode === 'type' && !typedName.trim()) {
            alert('Digite seu nome para assinar.')
            return
        }

        if (mode === 'draw') {
            const canvas = canvasRef.current!
            const ctx = canvas.getContext('2d')!
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const isBlank = imgData.data.every((v, i) => i % 4 === 3 ? true : v === 255)
            if (isBlank) {
                alert('Desenhe sua assinatura antes de confirmar.')
                return
            }
        }

        setSigning(true)
        try {
            setStatus('Preparando assinatura...')
            const user = (await supabase.auth.getUser()).data.user

            // Buscar perfil do usuário
            let nomeAssinante = typedName.trim()
            let emailAssinante = user?.email || ''

            if (mode === 'draw' || !nomeAssinante) {
                const { data: perfil } = await supabase
                    .from('perfis')
                    .select('nome_completo')
                    .eq('id', user?.id)
                    .single()
                nomeAssinante = nomeAssinante || perfil?.nome_completo || 'Usuário'
            }

            // Capturar imagem da assinatura
            let assinaturaImagem: string
            if (mode === 'draw' && canvasRef.current) {
                assinaturaImagem = canvasRef.current.toDataURL('image/png')
            } else {
                assinaturaImagem = generateTypedSignatureImage()
            }

            // === Embedar assinatura no PDF (estilo DocuSign) ===
            let hashFinal: string
            const isPdf = extensao?.toLowerCase() === 'pdf'

            if (isPdf) {
                const signedPdfBytes = await embedSignatureOnPdf(assinaturaImagem)

                if (signedPdfBytes) {
                    setStatus('Salvando PDF assinado...')

                    // Upload do PDF assinado (sobrescreve o arquivo atual)
                    const { error: uploadError } = await supabase.storage
                        .from('documentos_corporativos')
                        .upload(caminhoStorage!, signedPdfBytes, {
                            upsert: true,
                            contentType: 'application/pdf'
                        })

                    if (uploadError) {
                        console.error('Erro ao salvar PDF assinado:', uploadError)
                    }

                    // Hash do PDF assinado
                    hashFinal = await computeHash(signedPdfBytes.buffer as ArrayBuffer)
                } else {
                    hashFinal = await computeHash()
                }
            } else {
                hashFinal = await computeHash()
            }

            setStatus('Registrando assinatura...')

            // Registrar assinatura no banco
            const { error } = await supabase.from('assinaturas').insert({
                documento_id: documentoId,
                versao_id: versaoId || null,
                assinante_id: user?.id || null,
                nome_assinante: nomeAssinante,
                email_assinante: emailAssinante,
                ip_address: null,
                hash_documento: hashFinal,
                assinatura_imagem: assinaturaImagem
            })

            if (error) throw error

            setSigned(true)
            setStatus('')
            setTimeout(() => {
                onSigned()
                onClose()
            }, 1500)
        } catch (err: any) {
            console.error('Erro ao assinar:', err)
            alert('Erro ao registrar assinatura: ' + err.message)
        } finally {
            setSigning(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Assinar Documento</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">{titulo}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                        <X size={20} />
                    </button>
                </div>

                {signed ? (
                    <div className="p-12 text-center">
                        <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
                        <p className="text-lg font-semibold text-green-700 dark:text-green-400">Documento Assinado!</p>
                        <p className="text-sm text-gray-500 mt-1">
                            {extensao?.toLowerCase() === 'pdf'
                                ? 'A assinatura foi inserida visualmente no PDF.'
                                : 'A assinatura foi registrada com sucesso.'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Mode Toggle */}
                        <div className="flex border-b border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setMode('draw')}
                                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${mode === 'draw' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                <Pen size={16} /> Desenhar
                            </button>
                            <button
                                onClick={() => setMode('type')}
                                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${mode === 'type' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                <Type size={16} /> Digitar Nome
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            {mode === 'draw' ? (
                                <div>
                                    <p className="text-sm text-gray-500 mb-3">Use o mouse ou toque para desenhar sua assinatura:</p>
                                    <div className="border-2 border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden bg-white">
                                        <canvas
                                            ref={canvasRef}
                                            width={440}
                                            height={160}
                                            className="w-full cursor-crosshair touch-none"
                                            onMouseDown={startDraw}
                                            onMouseMove={draw}
                                            onMouseUp={stopDraw}
                                            onMouseLeave={stopDraw}
                                            onTouchStart={startDraw}
                                            onTouchMove={draw}
                                            onTouchEnd={stopDraw}
                                        />
                                    </div>
                                    <button
                                        onClick={clearCanvas}
                                        className="mt-2 text-xs text-gray-500 hover:text-red-500 transition-colors"
                                    >
                                        Limpar assinatura
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm text-gray-500 mb-3">Digite seu nome completo para assinar:</p>
                                    <input
                                        type="text"
                                        value={typedName}
                                        onChange={(e) => setTypedName(e.target.value)}
                                        placeholder="Seu nome completo"
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white text-lg"
                                    />
                                    {typedName && (
                                        <div className="mt-4 p-4 border border-dashed border-gray-300 rounded-xl bg-gray-50 dark:bg-gray-900">
                                            <p className="text-xs text-gray-400 mb-1">Preview da assinatura:</p>
                                            <p className="text-2xl text-gray-800 dark:text-white italic" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                                                {typedName}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {extensao?.toLowerCase() === 'pdf' && (
                                <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                    <p className="text-xs text-indigo-700 dark:text-indigo-400">
                                        ✨ <strong>Assinatura visual</strong> — sua assinatura será inserida diretamente no PDF, como no DocuSign.
                                    </p>
                                </div>
                            )}

                            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                <p className="text-xs text-amber-700 dark:text-amber-400">
                                    ⚠️ Ao assinar, você declara ter lido e concordar com o conteúdo deste documento.
                                    A assinatura será registrada com hash SHA-256, data/hora e seus dados.
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <span className="text-xs text-gray-400">{status}</span>
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSign}
                                    disabled={signing}
                                    className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-colors shadow-md"
                                >
                                    {signing ? <Loader2 size={16} className="animate-spin" /> : <Pen size={16} />}
                                    Confirmar Assinatura
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
