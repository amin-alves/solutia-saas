import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
    MessageCircle, Send, Plus, Search, Users,
    Loader2, X, Check
} from 'lucide-react'

interface Conversa {
    id: string
    nome: string | null
    tipo: 'dm' | 'grupo'
    updated_at: string
    ultima_mensagem?: string
    participantes?: { perfil_id: string; nome: string }[]
}

interface Mensagem {
    id: string
    conversa_id: string
    enviada_por: string
    conteudo: string
    created_at: string
    perfil?: { nome: string } | null
}

interface Perfil {
    id: string
    nome: string
    cargo: string | null
    email?: string
}

export default function Chat() {
    const empresaId = typeof window !== 'undefined' ? (localStorage.getItem('solutia_empresa_id') || '') : ''
    const [userId, setUserId] = useState<string | null>(null)

    const [conversas, setConversas] = useState<Conversa[]>([])
    const [selectedConversa, setSelectedConversa] = useState<Conversa | null>(null)
    const [mensagens, setMensagens] = useState<Mensagem[]>([])
    const [newMsg, setNewMsg] = useState('')
    const [sending, setSending] = useState(false)
    const [loadingConversas, setLoadingConversas] = useState(true)
    const [loadingMsgs, setLoadingMsgs] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    // Nova conversa
    const [showNewChat, setShowNewChat] = useState(false)
    const [availableUsers, setAvailableUsers] = useState<Perfil[]>([])
    const [selectedUsers, setSelectedUsers] = useState<string[]>([])
    const [groupName, setGroupName] = useState('')

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // === Auth ===
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) setUserId(data.user.id)
        })
    }, [])

    // === Carregar conversas ===
    const fetchConversas = useCallback(async () => {
        if (!userId) return
        setLoadingConversas(true)

        try {
            // Buscar conversas onde o user é participante
            const { data: participacoes } = await supabase
                .from('conversa_participantes')
                .select('conversa_id')
                .eq('perfil_id', userId)

            if (!participacoes?.length) {
                setConversas([])
                setLoadingConversas(false)
                return
            }

            const conversaIds = participacoes.map(p => p.conversa_id)

            const { data: convs } = await supabase
                .from('conversas')
                .select('*')
                .in('id', conversaIds)
                .order('updated_at', { ascending: false })

            if (!convs) { setLoadingConversas(false); return }

            // Buscar participantes e última mensagem de cada conversa
            const enriched = await Promise.all(convs.map(async (c) => {
                const { data: parts } = await supabase
                    .from('conversa_participantes')
                    .select('perfil_id, perfis(nome)')
                    .eq('conversa_id', c.id)

                const { data: lastMsg } = await supabase
                    .from('mensagens')
                    .select('conteudo')
                    .eq('conversa_id', c.id)
                    .order('created_at', { ascending: false })
                    .limit(1)

                return {
                    ...c,
                    participantes: parts?.map((p: any) => ({
                        perfil_id: p.perfil_id,
                        nome: p.perfis?.nome || 'Usuário'
                    })) || [],
                    ultima_mensagem: lastMsg?.[0]?.conteudo || ''
                }
            }))

            setConversas(enriched)
        } catch (e) {
            console.error('Erro ao carregar conversas:', e)
        } finally {
            setLoadingConversas(false)
        }
    }, [userId])

    useEffect(() => { if (userId) fetchConversas() }, [userId, fetchConversas])

    // === Carregar mensagens ===
    const fetchMensagens = useCallback(async (conversaId: string) => {
        setLoadingMsgs(true)
        try {
            const { data } = await supabase
                .from('mensagens')
                .select('*, perfil:enviada_por(nome)')
                .eq('conversa_id', conversaId)
                .order('created_at', { ascending: true })
                .limit(100)

            setMensagens(data || [])
        } catch (e) {
            console.error('Erro ao carregar mensagens:', e)
        } finally {
            setLoadingMsgs(false)
        }
    }, [])

    useEffect(() => {
        if (selectedConversa) {
            fetchMensagens(selectedConversa.id)
            inputRef.current?.focus()
        }
    }, [selectedConversa, fetchMensagens])

    // === Realtime: escutar novas mensagens ===
    useEffect(() => {
        if (!selectedConversa) return

        const channel = supabase
            .channel(`chat-${selectedConversa.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'mensagens',
                    filter: `conversa_id=eq.${selectedConversa.id}`
                },
                async (payload) => {
                    // Buscar o perfil do remetente
                    const { data: perfil } = await supabase
                        .from('perfis')
                        .select('nome')
                        .eq('id', (payload.new as any).enviada_por)
                        .single()

                    const newMessage: Mensagem = {
                        ...(payload.new as any),
                        perfil
                    }

                    setMensagens(prev => {
                        // Evitar duplicatas
                        if (prev.some(m => m.id === newMessage.id)) return prev
                        return [...prev, newMessage]
                    })
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [selectedConversa?.id])

    // === Auto-scroll ===
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [mensagens])

    // === Enviar mensagem ===
    const handleSend = async () => {
        if (!newMsg.trim() || !selectedConversa || !userId || sending) return

        setSending(true)
        const msg = newMsg.trim()
        setNewMsg('')

        try {
            const { error } = await supabase.from('mensagens').insert({
                conversa_id: selectedConversa.id,
                enviada_por: userId,
                conteudo: msg
            })

            if (error) throw error

            // Atualizar updated_at da conversa
            await supabase
                .from('conversas')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', selectedConversa.id)

        } catch (e) {
            console.error('Erro ao enviar:', e)
            setNewMsg(msg)
        } finally {
            setSending(false)
        }
    }

    // === Nova conversa ===
    const fetchAvailableUsers = async () => {
        const { data } = await supabase
            .from('perfis')
            .select('id, nome, cargo')
            .eq('empresa_id', empresaId)
            .neq('id', userId || '')
            .order('nome')

        setAvailableUsers(data || [])
    }

    const handleCreateConversation = async () => {
        if (selectedUsers.length === 0) return

        const isDm = selectedUsers.length === 1
        const tipo = isDm ? 'dm' : 'grupo'

        try {
            // Verificar se já existe DM com esta pessoa
            if (isDm) {
                const targetId = selectedUsers[0]
                const existing = conversas.find(c =>
                    c.tipo === 'dm' &&
                    c.participantes?.some(p => p.perfil_id === targetId)
                )
                if (existing) {
                    setSelectedConversa(existing)
                    setShowNewChat(false)
                    setSelectedUsers([])
                    return
                }
            }

            // Criar conversa
            const { data: conv, error } = await supabase
                .from('conversas')
                .insert({
                    empresa_id: empresaId,
                    nome: isDm ? null : (groupName.trim() || 'Grupo'),
                    tipo
                })
                .select()
                .single()

            if (error) throw error

            // Adicionar participantes (incluindo o criador)
            const participantes = [...selectedUsers, userId!].map(perfil_id => ({
                conversa_id: conv.id,
                perfil_id
            }))

            await supabase.from('conversa_participantes').insert(participantes)

            // Refresh e selecionar
            await fetchConversas()
            setSelectedConversa(conv)
            setShowNewChat(false)
            setSelectedUsers([])
            setGroupName('')
        } catch (e) {
            console.error('Erro ao criar conversa:', e)
            alert('Erro ao criar conversa.')
        }
    }

    // === Helpers ===
    const getConversaDisplayName = (c: Conversa) => {
        if (c.tipo === 'grupo') return c.nome || 'Grupo'
        const other = c.participantes?.find(p => p.perfil_id !== userId)
        return other?.nome || 'Conversa'
    }

    const getTimeLabel = (dateStr: string) => {
        const d = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - d.getTime()
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

        if (diffDays === 0) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        if (diffDays === 1) return 'Ontem'
        if (diffDays < 7) return d.toLocaleDateString('pt-BR', { weekday: 'short' })
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    }

    const filteredConversas = conversas.filter(c => {
        if (!searchTerm) return true
        const name = getConversaDisplayName(c).toLowerCase()
        return name.includes(searchTerm.toLowerCase())
    })

    return (
        <div className="h-[calc(100vh-80px)] flex bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">

            {/* === PAINEL ESQUERDO: Lista de Conversas === */}
            <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0">
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <MessageCircle size={20} className="text-indigo-500" /> Chat
                        </h2>
                        <button
                            onClick={() => { setShowNewChat(true); fetchAvailableUsers() }}
                            className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
                            title="Nova conversa"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar conversa..."
                            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
                        />
                    </div>
                </div>

                {/* Lista */}
                <div className="flex-1 overflow-y-auto">
                    {loadingConversas ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 size={20} className="animate-spin text-indigo-500" />
                        </div>
                    ) : filteredConversas.length === 0 ? (
                        <div className="text-center py-12 px-4">
                            <MessageCircle size={32} className="text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-400">Nenhuma conversa ainda.</p>
                            <button
                                onClick={() => { setShowNewChat(true); fetchAvailableUsers() }}
                                className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                                Iniciar primeira conversa →
                            </button>
                        </div>
                    ) : (
                        filteredConversas.map(c => (
                            <div
                                key={c.id}
                                onClick={() => setSelectedConversa(c)}
                                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-50 dark:border-gray-800
                                    ${selectedConversa?.id === c.id
                                        ? 'bg-indigo-50 dark:bg-indigo-900/30'
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm
                                    ${c.tipo === 'grupo'
                                        ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400'
                                        : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400'
                                    }`}
                                >
                                    {c.tipo === 'grupo' ? <Users size={18} /> : getConversaDisplayName(c).charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                            {getConversaDisplayName(c)}
                                        </span>
                                        <span className="text-xs text-gray-400 shrink-0 ml-2">
                                            {getTimeLabel(c.updated_at)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate mt-0.5">
                                        {c.ultima_mensagem || 'Sem mensagens'}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* === PAINEL DIREITO: Mensagens === */}
            <div className="flex-1 flex flex-col">
                {selectedConversa ? (
                    <>
                        {/* Chat Header */}
                        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 shrink-0 bg-white dark:bg-gray-900">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm
                                ${selectedConversa.tipo === 'grupo'
                                    ? 'bg-purple-100 text-purple-600'
                                    : 'bg-indigo-100 text-indigo-600'
                                }`}
                            >
                                {selectedConversa.tipo === 'grupo'
                                    ? <Users size={16} />
                                    : getConversaDisplayName(selectedConversa).charAt(0).toUpperCase()
                                }
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                    {getConversaDisplayName(selectedConversa)}
                                </h3>
                                <p className="text-xs text-gray-400">
                                    {selectedConversa.tipo === 'grupo'
                                        ? `${selectedConversa.participantes?.length || 0} participantes`
                                        : 'Conversa direta'
                                    }
                                </p>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 bg-gray-50 dark:bg-gray-950">
                            {loadingMsgs ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 size={24} className="animate-spin text-indigo-500" />
                                </div>
                            ) : mensagens.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <MessageCircle size={40} className="text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm text-gray-400">Nenhuma mensagem ainda. Diga olá! 👋</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {mensagens.map((m, idx) => {
                                        const isMe = m.enviada_por === userId
                                        const showAvatar = idx === 0 || mensagens[idx - 1].enviada_por !== m.enviada_por

                                        return (
                                            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                                                    {showAvatar && !isMe && (
                                                        <span className="text-xs text-gray-500 font-medium ml-1 mb-0.5 block">
                                                            {(m as any).perfil?.nome || 'Usuário'}
                                                        </span>
                                                    )}
                                                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm
                                                        ${isMe
                                                            ? 'bg-indigo-600 text-white rounded-br-md'
                                                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md border border-gray-200 dark:border-gray-700'
                                                        }`}
                                                    >
                                                        {m.conteudo}
                                                    </div>
                                                    <span className={`text-[10px] text-gray-400 mt-0.5 block ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                                                        {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>

                        {/* Input */}
                        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
                            <div className="flex items-center gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={newMsg}
                                    onChange={e => setNewMsg(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                    placeholder="Digite uma mensagem..."
                                    className="flex-1 px-4 py-2.5 text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                    disabled={sending}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!newMsg.trim() || sending}
                                    className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors shadow-sm"
                                >
                                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <MessageCircle size={36} className="text-indigo-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">Selecione uma conversa</h3>
                            <p className="text-sm text-gray-400 mt-1">ou inicie uma nova pelo botão +</p>
                        </div>
                    </div>
                )}
            </div>

            {/* === MODAL: Nova Conversa === */}
            {showNewChat && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nova Conversa</h2>
                            <button onClick={() => { setShowNewChat(false); setSelectedUsers([]); setGroupName('') }}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4">
                            {selectedUsers.length > 1 && (
                                <div className="mb-3">
                                    <label className="text-xs font-medium text-gray-500 mb-1 block">Nome do Grupo</label>
                                    <input
                                        type="text"
                                        value={groupName}
                                        onChange={e => setGroupName(e.target.value)}
                                        placeholder="Ex: Equipe de Projetos"
                                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            )}

                            <label className="text-xs font-medium text-gray-500 mb-2 block">
                                Selecione os participantes ({selectedUsers.length} selecionados)
                            </label>

                            <div className="max-h-[300px] overflow-y-auto space-y-1">
                                {availableUsers.map(u => {
                                    const isSelected = selectedUsers.includes(u.id)
                                    return (
                                        <div
                                            key={u.id}
                                            onClick={() => {
                                                setSelectedUsers(prev =>
                                                    isSelected ? prev.filter(id => id !== u.id) : [...prev, u.id]
                                                )
                                            }}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors
                                                ${isSelected
                                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-1 ring-indigo-300'
                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-xs">
                                                {u.nome.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.nome}</p>
                                                {u.cargo && <p className="text-xs text-gray-500 truncate">{u.cargo}</p>}
                                            </div>
                                            {isSelected && <Check size={16} className="text-indigo-600 shrink-0" />}
                                        </div>
                                    )
                                })}

                                {availableUsers.length === 0 && (
                                    <p className="text-sm text-gray-400 text-center py-6">Nenhum outro usuário na empresa.</p>
                                )}
                            </div>
                        </div>

                        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                            <button
                                onClick={() => { setShowNewChat(false); setSelectedUsers([]); setGroupName('') }}
                                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateConversation}
                                disabled={selectedUsers.length === 0}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40 flex items-center gap-2"
                            >
                                <MessageCircle size={16} />
                                {selectedUsers.length > 1 ? 'Criar Grupo' : 'Iniciar Conversa'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
