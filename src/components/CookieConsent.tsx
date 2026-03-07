import { useState, useEffect } from 'react';
import { Shield, X, Info } from 'lucide-react';
import { initializeAnalytics } from '@/lib/analytics';

export function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        // Verifica se o usuário já respondeu ao consentimento de cookies
        const hasConsented = localStorage.getItem('solutia_cookie_consent');
        if (!hasConsented) {
            // Pequeno delay para não assustar o usuário assim que a tela carrega
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        } else if (hasConsented === 'accepted') {
            // Se já aceitou anteriormente, inicializa o rastreamento anônimo
            initializeAnalytics();
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('solutia_cookie_consent', 'accepted');
        setIsVisible(false);
        initializeAnalytics();
    };

    const handleDecline = () => {
        // Mesmo recusando cookies opcionais, o sistema usa cookies estrit
        localStorage.setItem('solutia_cookie_consent', 'declined');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6 pb-safe pointer-events-none">
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 flex flex-col md:flex-row gap-6 items-start md:items-center pointer-events-auto transform transition-all animate-in slide-in-from-bottom-10 fade-in duration-500">

                {/* Ícone e Texto Principal */}
                <div className="famente necessários (sessão Auth)lex-1 flex gap-4">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center shrink-0">
                        <Shield className="text-indigo-600 dark:text-indigo-400" size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                            Respeitamos sua Privacidade (LGPD)
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                            Utilizamos cookies apenas para garantir o funcionamento do sistema e entender, de forma genérica e anônima, como você utiliza a plataforma. Clicando em "Aceitar", você nos ajuda a melhorar nossos serviços.{' '}
                            <button
                                onClick={() => setShowDetails(!showDetails)}
                                className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline inline-flex items-center gap-1"
                            >
                                <Info size={14} /> Saiba mais
                            </button>
                        </p>

                        {/* Detalhes expansíveis */}
                        {showDetails && (
                            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-xs text-gray-700 dark:text-gray-300 space-y-3 border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
                                <div>
                                    <strong className="text-gray-900 dark:text-white block mb-1">Cookies Essenciais (Obrigatórios)</strong>
                                    Necessários para autenticação (Supabase) e manter sua conta segura. Não podem ser desativados.
                                </div>
                                <div>
                                    <strong className="text-gray-900 dark:text-white block mb-1">Geração de Logs e Experiência</strong>
                                    Coletamos tempos de carregamento, erros no painel e páginas mais visitadas para otimizar nossos servidores. Nenhum dado de identidade ou documento é lido.
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
                    <button
                        onClick={handleDecline}
                        className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700 md:border-transparent md:hover:border-gray-200"
                    >
                        Apenas Essenciais
                    </button>
                    <button
                        onClick={handleAccept}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                    >
                        Aceitar e Ajudar
                    </button>
                </div>

                {/* Botão Fechar X - Age como Decline passivo */}
                <button
                    onClick={handleDecline}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    aria-label="Ignorar e Recusar"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
}
