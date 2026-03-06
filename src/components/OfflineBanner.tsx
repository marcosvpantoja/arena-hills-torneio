/**
 * Global offline/reconnecting banner.
 * Monitors navigator.onLine and shows a non-blocking banner.
 */
import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setOnline(false);
      setShowReconnected(false);
    };

    const handleOnline = () => {
      setOnline(true);
      setShowReconnected(true);
      const t = setTimeout(() => setShowReconnected(false), 4000);
      return () => clearTimeout(t);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (online && !showReconnected) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 py-2 px-4 text-sm font-semibold transition-all duration-300 ${
        online
          ? "bg-green-600 text-white"
          : "bg-destructive text-destructive-foreground"
      }`}
    >
      {online ? (
        <>
          <Wifi className="w-4 h-4" />
          Conexão restabelecida — revalidando dados...
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          Sem conexão com a internet. Os dados exibidos podem estar desatualizados.
        </>
      )}
    </div>
  );
}
