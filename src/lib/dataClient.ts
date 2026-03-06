/**
 * Centralized API layer for all Supabase operations.
 * Provides: performance notifications, retry with backoff,
 * AbortController timeout, error classification, request tracing.
 */
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// ─── Request ID ────────────────────────────────────────────────────────────────

export function newRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

// ─── Error classification ─────────────────────────────────────────────────────

export type ErrorCategory = "network" | "timeout" | "rls" | "server" | "session" | "unknown";

export interface ClassifiedError {
  category: ErrorCategory;
  userMessage: string;
  devMessage: string;
  statusCode?: number;
  retryable: boolean;
}

export function classifyError(error: unknown, context?: string): ClassifiedError {
  const ctx = context ?? "unknown_operation";

  // Offline
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return {
      category: "network",
      userMessage: "Parece que sua conexão oscilou. Vamos tentar novamente automaticamente. Se continuar, verifique o Wi-Fi/4G.",
      devMessage: `NETWORK: navigator.onLine=false. operation=${ctx}`,
      retryable: true,
    };
  }

  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const anyErr = error as any;
  const statusCode = Number(anyErr?.status ?? anyErr?.code ?? 0);

  // Fetch/network errors
  if (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("aborted") ||
    msg.includes("abort")
  ) {
    return {
      category: msg.includes("aborted") || msg.includes("abort") ? "timeout" : "network",
      userMessage: msg.includes("aborted") || msg.includes("abort")
        ? "A operação demorou mais do que o esperado. Vamos tentar reconectar."
        : "Parece que sua conexão oscilou. Vamos tentar novamente automaticamente. Se continuar, verifique o Wi-Fi/4G.",
      devMessage: `${msg.includes("aborted") ? "TIMEOUT" : "NETWORK"}: ${msg}. operation=${ctx}`,
      retryable: true,
    };
  }

  // RLS / permission denied
  if (statusCode === 403 || msg.includes("permission denied") || msg.includes("new row violates row-level security")) {
    return {
      category: "rls",
      userMessage: "Sua conta não tem permissão para executar esta ação. Se isso estiver errado, fale com o organizador.",
      devMessage: `RLS_DENY: operation=${ctx} statusCode=403 message="${anyErr?.message}" details="${anyErr?.details}"`,
      statusCode: 403,
      retryable: false,
    };
  }

  // Session expired (401)
  if (statusCode === 401 || msg.includes("jwt expired") || msg.includes("invalid jwt")) {
    return {
      category: "session",
      userMessage: "Sua sessão expirou. Por favor, faça login novamente.",
      devMessage: `SESSION_EXPIRED: operation=${ctx} statusCode=401 message="${anyErr?.message}"`,
      statusCode: 401,
      retryable: false,
    };
  }

  // Server errors 5xx
  if (statusCode >= 500) {
    return {
      category: "server",
      userMessage: "Ocorreu um problema no servidor. Tente novamente em instantes.",
      devMessage: `SERVER_ERROR: operation=${ctx} statusCode=${statusCode} message="${anyErr?.message}" details="${anyErr?.details}"`,
      statusCode,
      retryable: true,
    };
  }

  return {
    category: "unknown",
    userMessage: "Não foi possível concluir a operação. Tente novamente.",
    devMessage: `UNKNOWN_ERROR: operation=${ctx} message="${msg}" statusCode=${statusCode}`,
    retryable: true,
  };
}

// ─── Performance notification wrapper ─────────────────────────────────────────

const SLOW_THRESHOLD_MS = 5_000;
const DEFAULT_TIMEOUT_MS = 15_000;

export interface OperationContext {
  operation: string;       // e.g. "fetchMatches"
  table?: string;          // e.g. "matches"
  extra?: Record<string, unknown>; // categoryId, phase, etc.
}

/**
 * Wraps any async fn with:
 * - 5s slow-load notification
 * - 15s hard timeout via AbortController
 * - automatic retry with exponential backoff
 * - error classification + user/dev toast
 * - requestId tracing
 */
export async function withPerf<T>(
  ctx: OperationContext,
  fn: (signal: AbortSignal) => Promise<T>,
  options?: {
    retries?: number;
    timeoutMs?: number;
    slowMs?: number;
    onRetry?: (attempt: number, error: unknown) => void;
    signal?: AbortSignal; // parent signal to propagate cancellation
  }
): Promise<T> {
  const requestId = newRequestId();
  const retries = options?.retries ?? 2;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const slowMs = options?.slowMs ?? SLOW_THRESHOLD_MS;
  const ctxStr = `${ctx.operation}${ctx.table ? ` table=${ctx.table}` : ""}${ctx.extra ? " " + JSON.stringify(ctx.extra) : ""} requestId=${requestId}`;

  let slowToastDismiss: (() => void) | null = null;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    // External cancellation
    if (options?.signal?.aborted) {
      throw new DOMException("Cancelled by caller", "AbortError");
    }

    const abortCtrl = new AbortController();
    // Propagate parent cancellation
    const parentListener = () => abortCtrl.abort();
    options?.signal?.addEventListener("abort", parentListener);

    // Hard timeout
    const timeoutId = setTimeout(() => abortCtrl.abort(), timeoutMs);

    // Slow-load notification (only on first attempt)
    let slowTimerId: ReturnType<typeof setTimeout> | null = null;
    if (attempt === 0) {
      slowTimerId = setTimeout(() => {
        const { dismiss } = toast({
          title: "Carregamento mais lento que o normal",
          description: "Estamos carregando as informações. Isso pode acontecer por instabilidade na internet ou pico no servidor. Você não perdeu nada — é só aguardar mais um pouco.",
          duration: 30_000,
        });
        slowToastDismiss = dismiss;
        if (import.meta.env.DEV) {
          console.warn(`[SLOW_LOAD >5s] ${ctxStr}`);
        }
      }, slowMs);
    }

    try {
      const result = await fn(abortCtrl.signal);
      // Success — dismiss slow toast if it fired
      slowToastDismiss?.();
      slowToastDismiss = null;
      return result;
    } catch (err: unknown) {
      lastError = err;
      const classified = classifyError(err, ctxStr);

      if (import.meta.env.DEV) {
        console.error(`[${classified.category.toUpperCase()}] ${classified.devMessage}`);
      }

      // Don't retry non-retryable errors
      if (!classified.retryable || attempt === retries) {
        slowToastDismiss?.();
        slowToastDismiss = null;
        throw err;
      }

      // Retry with backoff
      options?.onRetry?.(attempt + 1, err);
      const delay = Math.min(1000 * 2 ** attempt, 8000);
      await new Promise(res => setTimeout(res, delay));
    } finally {
      clearTimeout(timeoutId);
      if (slowTimerId !== null) clearTimeout(slowTimerId);
      options?.signal?.removeEventListener("abort", parentListener);
    }
  }

  throw lastError;
}

/**
 * Runs fn and shows a toast error (with retry action) if it throws.
 * Does NOT throw — returns null on error.
 */
export async function safeOp<T>(
  ctx: OperationContext,
  fn: (signal: AbortSignal) => Promise<T>,
  options?: Parameters<typeof withPerf>[2] & { onError?: (classified: ClassifiedError) => void }
): Promise<T | null> {
  const requestId = newRequestId();
  try {
    return await withPerf(ctx, fn, options);
  } catch (err) {
    const classified = classifyError(err, ctx.operation);
    if (import.meta.env.DEV) {
      console.error(`[ERROR] ${classified.devMessage} requestId=${requestId}`);
    }
    options?.onError?.(classified);
    // Show error toast — retry is offered via a separate mechanism in the UI
    toast({
      title: getErrorTitle(classified.category, ctx.operation),
      description: classified.userMessage,
      variant: "destructive",
      duration: 10_000,
    });
    return null;
  }
}

// ─── Error code mapping ───────────────────────────────────────────────────────

/**
 * Maps Supabase/Postgres error codes to safe, user-friendly messages.
 * Prevents leaking schema details, constraint names, or internal DB info.
 */
export function mapDbError(error: unknown): string {
  const anyErr = error as any;
  const code = String(anyErr?.code ?? "");
  const msg = String(anyErr?.message ?? "").toLowerCase();

  // Unique constraint violation
  if (code === "23505") return "Este item já existe. Verifique se não há duplicatas.";
  // Foreign key violation
  if (code === "23503") return "Não é possível remover este item pois ele está sendo usado em outro lugar.";
  // Not-null constraint
  if (code === "23502") return "Um campo obrigatório não foi preenchido.";
  // Check constraint
  if (code === "23514") return "Os dados informados não são válidos.";
  // Group max teams trigger
  if (msg.includes("maximum of 4 teams")) return "O grupo já atingiu o máximo de 4 duplas.";
  // RLS
  if (code === "42501" || msg.includes("row-level security")) return "Você não tem permissão para esta operação.";

  // Fallback — never expose raw DB message to UI
  return "Não foi possível concluir a operação. Tente novamente.";
}

function getErrorTitle(category: ErrorCategory, operation: string): string {
  const opLabel: Record<string, string> = {
    fetchMatches: "Falha ao carregar partidas",
    fetchCategories: "Falha ao carregar categorias",
    fetchTeams: "Falha ao carregar duplas",
    fetchGroups: "Falha ao carregar grupos",
    upsertScore: "Falha ao atualizar placar",
    setMatchStatus: "Falha ao alterar status da partida",
    finalizeTournament: "Falha ao finalizar torneio",
  };
  if (opLabel[operation]) return opLabel[operation];
  if (category === "network") return "Conexão instável detectada";
  if (category === "timeout") return "A operação demorou demais";
  if (category === "rls") return "Permissão insuficiente";
  if (category === "server") return "Problema no servidor";
  if (category === "session") return "Sessão expirada";
  return "Erro inesperado";
}

// ─── Supabase helpers with error unwrapping ───────────────────────────────────

/** Unwraps a Supabase response and throws on error. */
export function unwrap<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw res.error;
  if (res.data === null) throw new Error("No data returned");
  return res.data;
}

/** Same as unwrap but returns [] instead of throwing on null data. */
export function unwrapList<T>(res: { data: T[] | null; error: unknown }): T[] {
  if (res.error) throw res.error;
  return res.data ?? [];
}

// ─── Re-export supabase for convenience ──────────────────────────────────────
export { supabase };
