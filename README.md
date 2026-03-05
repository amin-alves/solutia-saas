# Solutia Docs

Sistema de gestão documental inteligente para empresas.

## 🛠️ Stack

| Tecnologia | Uso |
|-----------|-----|
| **Vite** + **React 18** | Framework frontend |
| **TypeScript** | Tipagem estática |
| **Tailwind CSS v4** | Estilização (com dark mode) |
| **Supabase** | Auth, banco de dados e storage |
| **Supabase Edge Functions** | Convites de usuários |
| **Vercel** | Deploy e hosting |
| **Lucide React** | Ícones |

## 🚀 Rodando Localmente

### Pré-requisitos

- Node.js 18+
- npm

### Instalação

```bash
# Clonar o repositório
git clone https://github.com/amin-alves/solutia-saas.git
cd solutia-saas

# Instalar dependências
npm install
```

### Configurar variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
```

### Rodar o servidor de desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:5173](http://localhost:5173) no navegador.

## 📁 Estrutura do Projeto

```
src/
├── components/       # Componentes reutilizáveis
│   ├── dashboard/    # ConfigModal, Chat, etc.
│   └── documents/    # DocumentTree, DocumentEditor
├── layouts/          # SistemaLayout (layout principal)
├── lib/              # supabase.ts (client)
├── pages/            # LandingPage, Dashboard
└── index.css         # Estilos base + dark mode

supabase/
└── functions/
    └── invite-user/  # Edge Function para convites
```

## 🔑 Funcionalidades

- **Autenticação** — Login com senha e Magic Link
- **Gestão Documental** — Upload, pastas, editor de documentos
- **Gestão de Equipe** — Convite de membros, roles (Admin, Gestor, Membro)
- **Tema Claro/Escuro** — Toggle nas configurações
- **Multi-empresa** — Cada empresa tem seus dados isolados via RLS

## 🌐 Deploy

O projeto é deployado automaticamente na **Vercel** via push para a branch `feature/dashboard`.

**Produção:** [https://solutia-saas.vercel.app](https://solutia-saas.vercel.app)

## 📄 Licença

Proprietary — Solutia Core © 2026
