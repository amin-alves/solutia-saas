# Compact UI & Theme Customization Plan

## Layout Enxuto (Compact Layout)
- Atualizar margens, paddings e gaps em todo o [Dashboard.tsx](file:///c:/projetos_dev/solutia-saas/src/pages/Dashboard.tsx) para reduzir o espaçamento formidavelmente. (Ex: `gap-4` -> `gap-2`, `p-4` -> `p-2`, `h-[calc...]` ajustes).
- Reduzir as espessuras do divider (`w-1.5` -> `w-1`, ou `h-1.5` -> `h-1`).

## Abas Superior e Inferior Menores (Smaller Header/Footer)
- Modificar [SistemaLayout.tsx](file:///c:/projetos_dev/solutia-saas/src/layouts/SistemaLayout.tsx):
  - Encolher a tag `<header>`: de `py-3` e `px-8` para `py-1.5` e `px-4`.
  - Encolher a tag `<footer>`: de `py-2` para `py-1` e diminuir a fonte (`text-xs`).
- Ajustar cálculo de altura do Workspace: Em [Dashboard.tsx](file:///c:/projetos_dev/solutia-saas/src/pages/Dashboard.tsx), de `h-[calc(100vh-7rem)]` para `h-[calc(100vh-4.5rem)]` ou idealmente trocar para CSS flex para não hardcodar valores.

## Paleta de 16 Cores (16-Color Palette)
- Criar um estado/contexto de tema para o [SistemaLayout.tsx](file:///c:/projetos_dev/solutia-saas/src/layouts/SistemaLayout.tsx) (ex: salvando a cor em `localStorage.getItem('theme_color')`).
- Adicionar um seletor de cores no Header (ex: `<div className="w-5 h-5 rounded-full bg-red-500 cursor-pointer" .../>`) com 16 cores estilo Windows/Microsoft (Azul padrão, Amarelo, Vermelho, Verde, Laranja, etc).
- Para injetar essas cores na interface, como o Tailwind gera classes on-demand, podemos injetar a cor customizada via CSS Variable (`--color-primary`) no nó `:root` central ou [html](file:///c:/projetos_dev/solutia-saas/index.html), então o Tailwind usaria `bg-primary` se configurado no `tailwind.config.js`. Outra alternativa rápida é usar as classes do Tailwind dinâmicas já inclusas (ex: `bg-blue-600`) se criarmos um mapa pequeno, mas no VITE precisamos ter um `safelist` no `tailwind.config.js`. A forma mais escalável de alterar a cor principal de uma aplicação Vite/Tailwind sem reinstância é adicionar uma variável CSS no `index.css`.

## Estilo Microsoft nas Pastas (Yellow Folders, Smaller text)
- Em [DocumentTree.tsx](file:///c:/projetos_dev/solutia-saas/src/components/documents/DocumentTree.tsx):
  - Reduzir tamanho de letra para `text-xs`.
  - Diminuir os paddings das linhas `<div style={{ paddingLeft: ... }}>` (`py-1.5` -> `py-1`).
  - Trocar `<Folder>` e `<FolderOpen>` para usarem `text-yellow-400` / `text-yellow-500` ao invés de `indigo`.
  - Remover `ring-2 ring-indigo-500` por tons de `blue-500` (padrão de seleção do Windows Explorer).
