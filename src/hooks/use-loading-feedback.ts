import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { toast as toastFn } from "@/hooks/use-toast";

// ─── Mensagens progressivas de loading ────────────────────────────────────────

const MESSAGES = [
  "Carregando dados...",
  "Ainda carregando, aguarde...",
  "Sincronizando informações...",
  "Quase lá...",
  "Finalizando carregamento...",
];

/**
 * Emite uma notificação toast a cada `interval` ms enquanto `loading` for true.
 * Após 10s exibe aviso de conexão lenta. Limpa automaticamente ao terminar.
 */
export function useLoadingFeedback(loading: boolean, interval = 5000) {
  const { toast } = useToast();
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const warnTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countRef   = useRef(0);
  const dismissRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!loading) {
      if (timerRef.current)  { clearInterval(timerRef.current);  timerRef.current  = null; }
      if (warnTimer.current) { clearTimeout(warnTimer.current);  warnTimer.current = null; }
      dismissRef.current?.();
      dismissRef.current = null;
      countRef.current   = 0;
      return;
    }

    // Aviso especial após 10s: conexão lenta
    warnTimer.current = setTimeout(() => {
      const { dismiss } = toast({
        title: "⚠️ Verificando conexão...",
        description: "A resposta está demorando. Verifique sua conexão com a internet.",
        variant: "destructive",
        duration: 8000,
      });
      dismissRef.current = dismiss;
    }, 10_000);

    // Notificações progressivas a cada `interval` ms
    timerRef.current = setInterval(() => {
      const msg = MESSAGES[countRef.current % MESSAGES.length];
      countRef.current += 1;
      const { dismiss } = toast({
        title: "⏳ " + msg,
        description: "O sistema está processando sua solicitação.",
        duration: interval - 200,
      });
      dismissRef.current = dismiss;
    }, interval);

    return () => {
      if (timerRef.current)  { clearInterval(timerRef.current);  timerRef.current  = null; }
      if (warnTimer.current) { clearTimeout(warnTimer.current);  warnTimer.current = null; }
    };
  }, [loading, interval, toast]);
}

// ─── Classificação de erros ───────────────────────────────────────────────────

export type ErrorType = "network" | "timeout" | "data";

export interface ClassifiedError {
  type: ErrorType;
  title: string;
  description: string;
}

/**
 * Classifica um erro desconhecido em uma das categorias:
 * - "network"  → sem internet ou falha de fetch
 * - "timeout"  → requisição demorou demais
 * - "data"     → erro retornado pelo servidor
 */
export function classifyError(error: unknown): ClassifiedError {
  // Sem internet
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return {
      type: "network",
      title: "⚠️ Sem conexão com a internet",
      description: "Verifique sua rede Wi-Fi ou dados móveis e tente novamente.",
    };
  }

  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (
    msg.includes("networkerror") ||
    msg.includes("failed to fetch") ||
    msg.includes("network request failed") ||
    msg.includes("fetch")
  ) {
    return {
      type: "network",
      title: "⚠️ Sem conexão com a internet",
      description: "Verifique sua rede Wi-Fi ou dados móveis e tente novamente.",
    };
  }

  if (msg.includes("timeout") || msg.includes("timed out") || msg.includes("aborted")) {
    return {
      type: "timeout",
      title: "⏱️ Conexão muito lenta",
      description: "A resposta demorou mais do que o esperado. Verifique sua internet.",
    };
  }

  // Erros de código HTTP (Supabase retorna .code ou .status em alguns casos)
  const anyErr = error as any;
  const code = Number(anyErr?.code ?? anyErr?.status ?? 0);
  if (code >= 500) {
    return {
      type: "data",
      title: "❌ Problema ao carregar dados",
      description: "O servidor retornou um erro. Tente recarregar a página.",
    };
  }

  return {
    type: "data",
    title: "❌ Erro inesperado",
    description: "Não foi possível carregar as informações. Tente novamente.",
  };
}

/**
 * Classifica e exibe um toast de erro imediatamente (sem hook — pode ser chamado
 * de qualquer função async, inclusive fora de componentes React).
 */
export function notifyError(error: unknown): ClassifiedError {
  const classified = classifyError(error);
  toastFn({
    title: classified.title,
    description: classified.description,
    variant: "destructive",
    duration: 7000,
  });
  return classified;
}
