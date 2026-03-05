# Implementação de Roles (Perfis/Cargos) Dinâmicos por Empresa

Este documento descreve os passos técnicos necessários para migrar o sistema atual (onde os níveis de acesso "Membro", "Gestor" e "Admin" são fixos via código) para um modelo 100% customizável, onde cada empresa pode criar seus próprios papéis e gerenciar permissões refinadas.

## 1. Banco de Dados (PostgreSQL / Supabase)

### 1.1. Nova Tabela de Roles por Empresa (`empresa_roles`)
Criar tabela para estocar os cargos criados pelos clientes e definir o que eles podem fazer no sistema.

* **`id`**: `UUID Primary Key`
* **`empresa_id`**: `UUID References empresas(id) ON DELETE CASCADE`
* **`nome_cargo`**: `TEXT` (Ex: "Analista Financeiro", "Supervisor")
* **`permissoes`**: `JSONB` -> Armazenará as flags (capabilities) que indicam o que o papel pode ou não fazer. Ex: `{"pode_editar_processos": true, "pode_convidar_membros": false, "pode_ver_faturamento": true}`
* **`is_padrao`**: `BOOLEAN` -> Indica se é um papel padrão que não pode ser deletado (como o Admin raiz ("Owner") de uma empresa).
* **`created_at`**, **`updated_at`**

### 1.2. Refatorando Tabelas `perfis` e `convites`
* Hoje essas tabelas possuem uma coluna `role TEXT`.
* Precisaremos adicionar uma coluna `role_id UUID REFERENCES empresa_roles(id)` (ou descontinuar a texto) para amarrarmos o usuário ao cargo dinâmico exato que a empresa definiu.

### 1.3. Atualização das Regras de Segurança (RLS - Row Level Security) nas Tabelas
* As políticas RLS do Supabase que controlam inserções e deletes atualmente confiam que `role = 'Admin'` no perfil do usuário de forma chumbada.
* O sistema RLS passará a consultar uma Função Customizada (PostgreSQL Function) que verifica se a permissão X (ex: `pode_gerir_equipe`) dentro de `empresa_roles` onde o atual usuário (`auth.uid()`) se encontra.

---

## 2. Front-End (React / Next.js)

### 2.1. Tela "Gestão de Cargos/Permissões" (Nova)
* Uma aba dentro de `Configurações` da Empresa (`/configuracoes/cargos` ou junto do modal da Equipe).
* Um painel de CRUD (Cadastrar, Ler, Atualizar, Deletar), onde o dono do sistema cria, por exemplo, o "Cargo de Financeiro".
* Abaixo do nome, renderizar uma **Matriz de Permissões** (Grid de checkboxes divididos por módulo: Financeiro, Tarefas, Usuários, Documentos).

### 2.2. Modal de Convite Inteligente (`EquipeModal.tsx`)
* Modificar o arquivo `src/components/EquipeModal.tsx`.
* Retirar o `<select>` engessado:
```html
  <option value="Membro">Membro</option>
  <option value="Admin">Admin</option>
  <option value="Gestor">Gestor</option>
```
* Fazer um *fetch* assíncrono buscando todos os cargos criados em `empresa_roles` que pertencem a `empresa_id` logada.
* Exibi-los no `<select>` de envio de convites de novos usuários.

### 2.3. Controle Dinâmico de Exibição de UI
* Criar um _React Hook_ ou um Context (ex: `useUserPermissions()`) que é carregado junto ao Perfil do usuário logado.
* Esconder botões sensíveis do Dashboard e Sidebar (ex: "Excluir Arquivo", "Convidar") se a variável do cargo/permissão do usuário for falsa ou se não for Owner.

---

## 3. Back-End / Edge Functions
* A Edge Function `invite-user` (e quaisquer outras rotas de envio de dados sensível ou geração de faturas) não poderão mais confiar passivamente em `role="Admin"`.
* É recomendável que essas integrações usem _Supabase Admin Auth Claims_ (JWT Claims customizadas contendo as capacidades do usuário da sessão), ou que façam um _fetch_ em memória cache na tabela `empresa_roles` antes de dispararem uma ação perigosa ou de cobrança.
