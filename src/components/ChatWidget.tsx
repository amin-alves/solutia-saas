import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
    MessageCircle, Send, Plus, Search, Users,
    Loader2, X, Check, ArrowLeft, Minus
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
}

export function ChatWidget() {
    const empresaId = localStorage.getItem('solutia_empresa_id') || ''
    const [userId, setUserId] = useState<string | null>(null)
    const [open, setOpen] = useState(false)
    const [minimized, setMinimized] = useState(false)

    const [conversas, setConversas] = useState<Conversa[]>([])
    const [selectedConversa, setSelectedConversa] = useState<Conversa | null>(null)
    const [mensagens, setMensagens] = useState<Mensagem[]>([])
    const [newMsg, setNewMsg] = useState('')
    const [sending, setSending] = useState(false)
    const [loadingConversas, setLoadingConversas] = useState(true)
    const [loadingMsgs, setLoadingMsgs] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [unread, setUnread] = useState(0)

    // Nova conversa
    const [showNewChat, setShowNewChat] = useState(false)
    const [availableUsers, setAvailableUsers] = useState<Perfil[]>([])
    const [selectedUsers, setSelectedUsers] = useState<string[]>([])
    const [groupName, setGroupName] = useState('')

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Auth
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) setUserId(data.user.id)
        })
    }, [])

    // Carregar conversas
    const fetchConversas = useCallback(async () => {
        if (!userId) return
        setLoadingConversas(true)
        try {
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

    // Carregar mensagens
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
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }, [selectedConversa, fetchMensagens])

    // Realtime
    useEffect(() => {
        if (!selectedConversa) return
        const channel = supabase
            .channel(`chat-${selectedConversa.id}`)
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'mensagens',
                filter: `conversa_id=eq.${selectedConversa.id}`
            }, async (payload) => {
                const { data: perfil } = await supabase
                    .from('perfis').select('nome')
                    .eq('id', (payload.new as any).enviada_por).single()

                const newMessage: Mensagem = { ...(payload.new as any), perfil }
                setMensagens(prev => prev.some(m => m.id === newMessage.id) ? prev : [...prev, newMessage])
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [selectedConversa?.id])

    // Unread badge — listen globally
    useEffect(() => {
        if (!userId || open) { setUnread(0); return }
        const channel = supabase
            .channel('chat-unread')
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'mensagens'
            }, (payload) => {
                if ((payload.new as any).enviada_por !== userId) {
                    setUnread(prev => prev + 1)
                }
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [userId, open])

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [mensagens])

    // Send
    const handleSend = async () => {
        if (!newMsg.trim() || !selectedConversa || !userId || sending) return
        setSending(true)
        const msg = newMsg.trim()
        setNewMsg('')
        try {
            await supabase.from('mensagens').insert({
                conversa_id: selectedConversa.id,
                enviada_por: userId,
                conteudo: msg
            })
            await supabase.from('conversas')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', selectedConversa.id)
        } catch (e) {
            console.error('Erro ao enviar:', e)
            setNewMsg(msg)
        } finally {
            setSending(false)
        }
    }

    // Nova conversa
    const fetchAvailableUsers = async () => {
        const { data } = await supabase
            .from('perfis').select('id, nome, cargo')
            .eq('empresa_id', empresaId).neq('id', userId || '').order('nome')
        setAvailableUsers(data || [])
    }

    const handleCreateConversation = async () => {
        if (selectedUsers.length === 0) return
        const isDm = selectedUsers.length === 1

        try {
            if (isDm) {
                const existing = conversas.find(c =>
                    c.tipo === 'dm' && c.participantes?.some(p => p.perfil_id === selectedUsers[0])
                )
                if (existing) {
                    setSelectedConversa(existing); setShowNewChat(false); setSelectedUsers([]); return
                }
            }

            const { data: conv, error } = await supabase
                .from('conversas')
                .insert({ empresa_id: empresaId, nome: isDm ? null : (groupName.trim() || 'Grupo'), tipo: isDm ? 'dm' : 'grupo' })
                .select().single()

            if (error) throw error
            await supabase.from('conversa_participantes').insert(
                [...selectedUsers, userId!].map(perfil_id => ({ conversa_id: conv.id, perfil_id }))
            )

            await fetchConversas()
            setSelectedConversa(conv)
            setShowNewChat(false)
            setSelectedUsers([])
            setGroupName('')
        } catch (e) {
            console.error('Erro ao criar conversa:', e)
        }
    }

    // Helpers
    const getDisplayName = (c: Conversa) => {
        if (c.tipo === 'grupo') return c.nome || 'Grupo'
        return c.participantes?.find(p => p.perfil_id !== userId)?.nome || 'Conversa'
    }

    const getTimeLabel = (dateStr: string) => {
        const d = new Date(dateStr)
        const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000)
        if (diffDays === 0) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        if (diffDays === 1) return 'Ontem'
        if (diffDays < 7) return d.toLocaleDateString('pt-BR', { weekday: 'short' })
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    }

    const filtered = conversas.filter(c =>
        !searchTerm || getDisplayName(c).toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <>
            {/* Floating Button */}
            {!open && (
                <button
                    onClick={() => { setOpen(true); setMinimized(false); setUnread(0) }}
                    className="fixed bottom-6 right-6 z-[90] w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                >
                    <MessageCircle size={24} />
                    {unread > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                            {unread > 9 ? '9+' : unread}
                        </span>
                    )}
                </button>
            )}

            {/* Chat Popup */}
            {open && (
                <div className={`fixed bottom-6 right-6 z-[90] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden transition-all duration-200
                    ${minimized ? 'w-80 h-12' : 'w-96 h-[520px]'}`}
                >
                    {/* Header */}
                    <div
                        className="flex items-center justify-between px-4 py-2.5 bg-indigo-600 text-white shrink-0 cursor-pointer select-none"
                        onClick={() => setMinimized(!minimized)}
                    >
                        <div className="flex items-center gap-2">
                            {selectedConversa && !minimized ? (
                                <button onClick={(e) => { e.stopPropagation(); setSelectedConversa(null) }}
                                    className="p-0.5 rounded hover:bg-white/20">
                                    <ArrowLeft size={16} />
                                </button>
                            ) : (
                                <MessageCircle size={18} />
                            )}
                            <span className="text-sm font-semibold truncate">
                                {selectedConversa && !minimized
                                    ? getDisplayName(selectedConversa)
                                    : 'Chat'
                                }
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); setMinimized(!minimized) }}
                                className="p-1 rounded hover:bg-white/20">
                                <Minus size={14} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setOpen(false); setSelectedConversa(null) }}
                                className="p-1 rounded hover:bg-white/20">
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    {!minimized && (
                        <>
                            {showNewChat ? (
                                /* === New Chat View === */
                                <div className="flex-1 flex flex-col overflow-hidden">
                                    <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Nova Conversa</span>
                                        <button onClick={() => { setShowNewChat(false); setSelectedUsers([]) }}
                                            className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
                                    </div>

                                    {selectedUsers.length > 1 && (
                                        <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                                            <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)}
                                                placeholder="Nome do grupo..." className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white" />
                                        </div>
                                    )}

                                    <div className="flex-1 overflow-y-auto px-2 py-1">
                                        {availableUsers.map(u => {
                                            const sel = selectedUsers.includes(u.id)
                                            return (
                                                <div key={u.id}
                                                    onClick={() => setSelectedUsers(prev => sel ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                                                    className={`flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer text-xs transition-colors
                                                    ${sel ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                                    <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-[10px]">
                                                        {u.nome.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-gray-900 dark:text-white truncate">{u.nome}</p>
                                                        {u.cargo && <p className="text-gray-400 truncate">{u.cargo}</p>}
                                                    </div>
                                                    {sel && <Check size={14} className="text-indigo-600 shrink-0" />}
                                                </div>
                                            )
                                        })}
                                        {availableUsers.length === 0 && (
                                            <p className="text-xs text-gray-400 text-center py-6">Nenhum usuário disponível.</p>
                                        )}
                                    </div>

                                    <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700">
                                        <button onClick={handleCreateConversation} disabled={selectedUsers.length === 0}
                                            className="w-full py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40 flex items-center justify-center gap-1">
                                            <MessageCircle size={12} />
                                            {selectedUsers.length > 1 ? 'Criar Grupo' : 'Iniciar Conversa'}
                                        </button>
                                    </div>
                                </div>
                            ) : selectedConversa ? (
                                /* === Messages View === */
                                <>
                                    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 bg-gray-50 dark:bg-gray-950">
                                        {loadingMsgs ? (
                                            <div className="flex items-center justify-center h-full">
                                                <Loader2 size={18} className="animate-spin text-indigo-500" />
                                            </div>
                                        ) : mensagens.length === 0 ? (
                                            <div className="flex items-center justify-center h-full">
                                                <p className="text-xs text-gray-400">Diga olá! 👋</p>
                                            </div>
                                        ) : (
                                            <>
                                                {mensagens.map((m, idx) => {
                                                    const isMe = m.enviada_por === userId
                                                    const showName = idx === 0 || mensagens[idx - 1].enviada_por !== m.enviada_por
                                                    return (
                                                        <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                            <div className="max-w-[80%]">
                                                                {showName && !isMe && (
                                                                    <span className="text-[10px] text-gray-500 font-medium ml-1 block">
                                                                        {(m as any).perfil?.nome || 'Usuário'}
                                                                    </span>
                                                                )}
                                                                <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed
                                                                    ${isMe
                                                                        ? 'bg-indigo-600 text-white rounded-br-sm'
                                                                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm border border-gray-200 dark:border-gray-700'
                                                                    }`}>
                                                                    {m.conteudo}
                                                                </div>
                                                                <span className={`text-[9px] text-gray-400 mt-0.5 block ${isMe ? 'text-right' : ''}`}>
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
                                    <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
                                        <div className="flex items-center gap-2">
                                            <input ref={inputRef} type="text" value={newMsg}
                                                onChange={e => setNewMsg(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                                placeholder="Mensagem..." disabled={sending}
                                                className="flex-1 px-3 py-2 text-xs bg-gray-100 dark:bg-gray-800 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                                            <button onClick={handleSend} disabled={!newMsg.trim() || sending}
                                                className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                                                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* === Conversation List View === */
                                <>
                                    <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                                placeholder="Buscar..." className="w-full pl-7 pr-2 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 border-0 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                                        </div>
                                        <button onClick={() => { setShowNewChat(true); fetchAvailableUsers() }}
                                            className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors" title="Nova conversa">
                                            <Plus size={14} />
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto">
                                        {loadingConversas ? (
                                            <div className="flex items-center justify-center py-8">
                                                <Loader2 size={16} className="animate-spin text-indigo-500" />
                                            </div>
                                        ) : filtered.length === 0 ? (
                                            <div className="text-center py-8 px-4">
                                                <MessageCircle size={24} className="text-gray-300 mx-auto mb-2" />
                                                <p className="text-xs text-gray-400">Nenhuma conversa.</p>
                                                <button onClick={() => { setShowNewChat(true); fetchAvailableUsers() }}
                                                    className="mt-2 text-xs text-indigo-600 font-medium">
                                                    Iniciar conversa →
                                                </button>
                                            </div>
                                        ) : (
                                            filtered.map(c => (
                                                <div key={c.id} onClick={() => setSelectedConversa(c)}
                                                    className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-50 dark:border-gray-800">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px]
                                                        ${c.tipo === 'grupo'
                                                            ? 'bg-purple-100 text-purple-600'
                                                            : 'bg-indigo-100 text-indigo-600'
                                                        }`}>
                                                        {c.tipo === 'grupo' ? <Users size={14} /> : getDisplayName(c).charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                                                                {getDisplayName(c)}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400 shrink-0 ml-1">
                                                                {getTimeLabel(c.updated_at)}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-gray-500 truncate mt-0.5">
                                                            {c.ultima_mensagem || 'Sem mensagens'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            )}
        </>
    )
}
