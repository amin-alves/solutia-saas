# Organização pré-receita (Solutia Docs)

Este documento define como manter o projeto profissional **sem** separar backend dedicado ainda.

## Modelo atual

- **Frontend + BFF no Next.js**: UI e middleware no mesmo app
- **Dados/Auth**: Supabase
- **Infra leve**: scripts SQL versionados + scripts utilitários

## Regras de estrutura

1. `src/app`: rotas e entrypoints do App Router
2. `src/views`: telas de negócio reutilizadas pelas rotas
3. `src/components`: blocos visuais reutilizáveis
4. `src/lib`: clientes e utilitários de integração
5. `supabase/` + `*.sql`: evolução de schema e políticas
6. `scripts/`: automações operacionais (seed/admin)

## Regras de qualidade

- Antes de merge: `npm run check`
- Variáveis de ambiente sempre documentadas em `.env.example`
- Segredos reais nunca versionados
- Mudanças de auth/ACL devem vir com SQL/políticas versionadas

## Quando evoluir para separação frontend/backend/infra

Considere separar quando houver 2 ou mais sinais:

- equipe > 2 devs em paralelo com conflitos frequentes
- necessidade de escalar API independentemente do frontend
- SLAs/compliance exigindo isolamento de responsabilidades
- pipelines e deploys distintos por domínio (web/api/infra)

## Próxima etapa (quando chegar a hora)

- `apps/web` (Next.js)
- `apps/api` (serviço dedicado)
- `packages/shared` (tipos e contratos)
- `infra/` (IaC, ambientes, deploy)
