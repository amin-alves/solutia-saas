/**
 * Módulo de Analytics Anônimo — Respeito total à LGPD.
 * NENHUM dado pessoal (Nome, Email, CPF, Documentos) é processado aqui.
 * 
 * Os dados são enviados para a tabela `system_analytics` no Supabase
 * somente se o usuário consentir via banner de cookies.
 */

import { supabase } from './supabase';

// ─────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────

/** Verifica em tempo real se o consentimento já foi dado */
const hasConsent = (): boolean => {
    return typeof window !== 'undefined' &&
        localStorage.getItem('solutia_cookie_consent') === 'accepted';
};

/**
 * Retorna um ID anônimo de sessão persistido no LocalStorage.
 * Não é vinculado ao ID real do usuário autenticado — serve apenas
 * para agrupar eventos da mesma sessão de uso.
 */
const getAnonymousSessionId = (): string => {
    if (typeof window === 'undefined') return '';
    let sessionId = localStorage.getItem('solutia_anon_session_id');
    if (!sessionId) {
        sessionId = `anon-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
        localStorage.setItem('solutia_anon_session_id', sessionId);
    }
    return sessionId;
};

// ─────────────────────────────────────────────────────────
// FUNÇÕES PÚBLICAS
// ─────────────────────────────────────────────────────────

/**
 * Inicializa o módulo de analytics. Deve ser chamado após o usuário aceitar os cookies.
 * Registra o evento de início de sessão no Supabase.
 */
export const initializeAnalytics = async () => {
    if (!hasConsent()) return;

    try {
        const payload = {
            anon_session: getAnonymousSessionId(),
            event: 'app_initialized',
            properties: {
                screen: `${window.screen.width}x${window.screen.height}`,
                language: navigator.language,
                referrer: document.referrer || 'direto',
                userAgent: navigator.userAgent,
            },
            timestamp: new Date().toISOString(),
        };

        const { error } = await supabase.from('system_analytics').insert([payload]);
        if (error) console.warn('[Analytics] Falha ao registrar inicialização:', error.message);
    } catch (_) {
        // Silêncio absoluto para não impactar a UX
    }
};

/**
 * Registra um evento de interação do usuário.
 * @param eventName Identificador do evento (ex: 'view_dashboard', 'click_convidar')
 * @param properties Dados adicionais (não sensíveis) sobre o evento
 */
export const trackEvent = async (
    eventName: string,
    properties: Record<string, string | number | boolean> = {}
) => {
    if (!hasConsent()) return;

    try {
        const payload = {
            anon_session: getAnonymousSessionId(),
            event: eventName,
            properties,
            timestamp: new Date().toISOString(),
        };

        const { error } = await supabase.from('system_analytics').insert([payload]);
        if (error) console.warn(`[Analytics] Falha ao registrar evento "${eventName}":`, error.message);
    } catch (_) {
        // Silêncio
    }
};

/**
 * Registra erros de interface que quebram a experiência do usuário.
 * Útil para diagnóstico e priorização de correções no desenvolvimento.
 * @param error Mensagem do erro capturado
 * @param component Nome do componente/página onde ocorreu
 */
export const trackError = async (error: string, component: string) => {
    if (!hasConsent()) return;

    try {
        const payload = {
            anon_session: getAnonymousSessionId(),
            event: 'ui_error',
            error_message: error,
            component_failed: component,
            timestamp: new Date().toISOString(),
        };

        const { error: dbError } = await supabase.from('system_analytics').insert([payload]);
        if (dbError) console.warn('[Analytics] Falha ao registrar erro:', dbError.message);
    } catch (_) {
        // Silêncio
    }
};
