export interface Usuario {
    id: number;
    nome: string;
    email: string;
    role: string;
    status: string;
    empresa_id: string; // Chave estrangeira
}

export interface Documento {
    id: number;
    titulo: string;
    pasta: string;
    tamanho: string;
    data: string;
    empresa_id: string; // Chave estrangeira
}

// SIMULANDO TABELAS DO BANCO DE DADOS

export const mockUsuarios: Usuario[] = [
    // Usuários da Empresa 1 (A.M.I. Engenharia)
    { id: 1, nome: "Amin Alves", email: "amin1@teste.com", role: "Administrador", status: "Ativo", empresa_id: "empresa_001" },
    { id: 2, nome: "Carlos Cliente", email: "carlos@ami.com", role: "Cliente", status: "Inativo", empresa_id: "empresa_001" },
    { id: 3, nome: "João Engenheiro", email: "joao@ami.com", role: "Engenharia", status: "Ativo", empresa_id: "empresa_001" },

    // Usuários da Empresa 2 (Solutia Tech)
    { id: 4, nome: "Amin Alves Tech", email: "amin2@teste.com", role: "CEO", status: "Ativo", empresa_id: "empresa_002" },
    { id: 5, nome: "Maria Desenvolvedora", email: "maria@solutia.com", role: "Desenvolvedor", status: "Ativo", empresa_id: "empresa_002" },
]

export const mockDocumentos: Documento[] = [
    // Documentos da Empresa 1
    { id: 1, titulo: "Contrato Saneamento 2024", pasta: "Contratos", tamanho: "2.3 MB", data: "10/02/2026", empresa_id: "empresa_001" },
    { id: 2, titulo: "Licença Ambiental", pasta: "Licenças", tamanho: "1.1 MB", data: "05/02/2026", empresa_id: "empresa_001" },
    { id: 3, titulo: "Plantas Baixas", pasta: "Engenharia", tamanho: "15 MB", data: "01/01/2026", empresa_id: "empresa_001" },

    // Documentos da Empresa 2
    { id: 4, titulo: "Termos de Uso Solutia SaaS", pasta: "Jurídico", tamanho: "450 KB", data: "20/02/2026", empresa_id: "empresa_002" },
    { id: 5, titulo: "Arquitetura do Banco de Dados", pasta: "Tecnologia", tamanho: "3 MB", data: "22/02/2026", empresa_id: "empresa_002" },
]

// FUNÇÕES DE BUSCA SEGURA (SIMULANDO ROW LEVEL SECURITY)
export const getUsuariosPorEmpresa = (empresaId: string | null) => {
    if (!empresaId) return []
    return mockUsuarios.filter(u => u.empresa_id === empresaId)
}

export const getDocumentosPorEmpresa = (empresaId: string | null) => {
    if (!empresaId) return []
    return mockDocumentos.filter(d => d.empresa_id === empresaId)
}
