# Arena Hills · Gestão de torneio

Plataforma para organizar torneios de duplas na Arena Hills: do cadastro das categorias até o pódio, com um painel ao vivo para exibir partidas e resultados em telão ou no celular dos atletas.

## Funcionalidades

**Painel ao vivo (público)**
- Partidas acontecendo agora, fase de grupos com classificação e chaveamento eliminatório
- Atualização automática periódica conforme o placar é lançado
- Pódio final de cada categoria

**Administração**
- Cadastro de categorias e duplas, com adição rápida
- Criação de grupos e **geração automática das partidas** da fase de grupos
- Lançamento de placar e encerramento da fase de grupos
- Geração do **chaveamento eliminatório** (quartas, semi e final) a partir da classificação
- Login de administrador com papéis (`user_roles`) no Supabase

## Stack

React 18 · Vite · TypeScript · Tailwind CSS · shadcn/ui · React Router · TanStack Query · Supabase (Postgres, Auth, RLS)

## Como rodar

```sh
cp .env.example .env   # preencha com URL, ID e chave pública do seu projeto Supabase
npm install
npm run dev
```

O esquema do banco está em `supabase/migrations`.

---

Desenvolvido por **Marcos Pantoja** · [29Tech](https://www.vintenove.com)
