# Solutia Docs

Sistema de gestão documental inteligente para empresas, com autenticação Supabase, gestão de documentos, tramitação e analytics.

## Stack

| Tecnologia | Uso |
|---|---|
| Next.js 16 (App Router) | Framework web |
| React 18 + TypeScript | UI e tipagem |
| Tailwind CSS v4 | Estilização |
| Supabase | Auth, banco e storage |
| Lucide React | Ícones |

## Pré-requisitos

- Node.js 18+
- npm

## Instalação

```bash
git clone https://github.com/amin-alves/solutia-saas.git
cd solutia-saas
npm install
```

## Variáveis de ambiente

Crie o arquivo `.env.local` na raiz:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
```

## Scripts

```bash
npm run dev    # desenvolvimento
npm run build  # build de produção
npm run start  # iniciar build de produção
npm run typecheck # valida tipagem TypeScript
npm run check  # typecheck + build
```

Aplicação local: [http://localhost:3000](http://localhost:3000)

## Estrutura principal

```text
src/
├── app/                     # Rotas Next.js (App Router)
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Login (/)
│   ├── update-password/     # /update-password
│   └── (sistema)/           # Rotas privadas com layout compartilhado
│       ├── dashboard/
│       ├── documentos/
│       └── analytics/
├── components/              # Componentes reutilizáveis
├── contexts/                # Contextos globais (preferências do usuário)
├── layouts/                 # Layout funcional do sistema
├── lib/                     # Clientes e utilitários (Supabase)
├── views/                   # Telas reutilizadas pelas rotas app/
└── index.css                # Tailwind + estilos globais
```

## Organização profissional (fase pré-receita)

Atualmente o projeto adota o modelo **Frontend + BFF no mesmo app Next.js**:

- **Frontend**: componentes React em `src/components` e telas em `src/views`
- **Backend-for-Frontend**: middleware e runtime server no próprio Next.js (`middleware.ts`)
- **Infra de dados**: scripts e schemas Supabase em `supabase/` e arquivos SQL versionados

Esse formato é o recomendado para pré-receita: menos custo operacional e velocidade maior de entrega.

Quando houver escala (time maior, alto volume, requisitos de compliance), aí sim vale separar em repositórios/pacotes dedicados para `frontend`, `backend` e `infra`.

## Funcionalidades

- Autenticação com Supabase
- Gestão de documentos (árvore, upload, preview, assinatura)
- Dashboard com painéis configuráveis
- Tema por usuário (modo claro/escuro, cor principal, modo compacto)
- Persistência de estado da árvore (pastas expandidas por tela)
- Analytics interno para superadmin

## Deploy

O projeto está preparado para deploy em plataformas compatíveis com Next.js (ex: Vercel).

## Licença

Proprietary — Solutia Core © 2026
