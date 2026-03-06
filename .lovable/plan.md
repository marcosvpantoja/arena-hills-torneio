

## Correção: Login Lento + Placar Trava ao Voltar de Outra Aba

### Problema 1: Login lento / precisa recarregar

**Causa raiz**: No `App.tsx`, as rotas de login e admin protegido usam `AuthProvider` SEPARADOS:

```text
<Route element={<AuthProvider><AdminAuthLayout /></AuthProvider>}>   <-- AuthProvider #1
  <Route path="/admin/login" />
</Route>

<Route element={<AuthProvider><ProtectedLayout /></AuthProvider>}>   <-- AuthProvider #2
  <Route path="/admin" />
</Route>
```

Quando o usuario faz login e navega para `/admin`, o AuthProvider #1 desmonta e o AuthProvider #2 monta do zero. O novo provider comeca com `loading=true` e precisa:
1. Assinar o `onAuthStateChange` (o evento SIGNED_IN ja pode ter sido emitido antes da assinatura)
2. Fazer uma query no banco para verificar `isAdmin`

Se o evento de auth ja passou, o provider fica esperando ate o timeout de 2 segundos. Resultado: spinner de loading por ate 2s, e em alguns casos o usuario precisa recarregar a pagina.

**Solucao**: Mover o `AuthProvider` para ACIMA de ambos os grupos de rotas, como wrapper unico. Assim, o estado de autenticacao persiste entre login e dashboard sem remontagem.

```text
<Route element={<AuthProvider />}>             <-- AuthProvider unico
  <Route element={<AdminAuthLayout />}>
    <Route path="/admin/login" />
  </Route>
  <Route element={<ProtectedLayout />}>
    <Route path="/admin" />
  </Route>
</Route>
```

O `AuthProvider` precisa renderizar `<Outlet />` para funcionar como layout route.

---

### Problema 2: Placar trava no loading ao voltar de outra aba

**Causa raiz**: Ao voltar de outra aba, `refetchOnWindowFocus: true` dispara um refetch que atualiza o cache do React Query. Isso causa um re-render, mas `localScores` e `savingScores` NAO sao resetados. 

O fluxo problematico:
1. Usuario sai da aba
2. O token de auth pode expirar e ser renovado automaticamente (token_revoked + refresh visto nos logs)
3. Usuario volta -- `refetchOnWindowFocus` dispara
4. O Realtime channel pode ter desconectado durante a inatividade
5. Usuario clica +/- -- o debounce dispara o update no banco
6. Se o token estava sendo renovado no momento exato do update, a request pode falhar silenciosamente (o Supabase client retorna erro no `res.error` mas o `savingScores` fica travado se o fluxo nao limpar corretamente)

Alem disso, `localScores` acumula entradas que nunca sao limpas -- mesmo apos o refetch trazer dados frescos do banco, os valores locais antigos continuam sendo exibidos.

**Solucao** (3 mudancas no `AdminMatches.tsx`):

1. **Limpar `localScores` quando dados frescos chegam**: Adicionar um `useEffect` que, quando `rawMatches` muda (indicando refetch), limpa as entradas de `localScores` que nao tem um debounce pendente. Isso garante que apos voltar de outra aba, os placares mostrados sao os do banco.

2. **Timeout de seguranca no `savingScores`**: Se `savingScores[matchId]` ficar `true` por mais de 5 segundos, forcar para `false` e fazer refetch. Isso impede o spinner eterno.

3. **Remover `safeOp` do `setStatus`**: A funcao `setStatus` (linha 365) ainda usa `safeOp` com `withPerf`, que tem o mesmo problema do toast de lentidao. Substituir por chamada direta ao Supabase, consistente com o que ja foi feito no `updateScore`.

---

### Arquivos Modificados

1. **`src/App.tsx`** -- Reestruturar rotas admin para usar um unico `AuthProvider`
2. **`src/contexts/AuthContext.tsx`** -- Adicionar `<Outlet />` no render para funcionar como layout route
3. **`src/pages/admin/AdminMatches.tsx`** -- Limpar localScores no refetch, timeout de seguranca no savingScores, remover safeOp do setStatus

### Risco
Baixo -- as mudancas sao defensivas e seguem padroes ja usados no projeto.

