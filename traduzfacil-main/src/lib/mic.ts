// Helpers de microfone com tratamento de erro amigável e verificação de permissão.

export type MicError =
  | "denied"
  | "notfound"
  | "inuse"
  | "insecure"
  | "unsupported"
  | "unknown";

export function micErrorMessage(kind: MicError): string {
  switch (kind) {
    case "denied":
      return "Microfone bloqueado. Toque no cadeado do navegador e permita o microfone para este site.";
    case "notfound":
      return "Nenhum microfone encontrado neste dispositivo.";
    case "inuse":
      return "O microfone está sendo usado por outro app. Feche-o e tente de novo.";
    case "insecure":
      return "O microfone só funciona em HTTPS. Abra o app pelo link seguro.";
    case "unsupported":
      return "Este navegador não suporta gravação de áudio. Tente o Chrome ou Safari.";
    default:
      return "Não consegui acessar o microfone. Tente novamente.";
  }
}

export function classifyMicError(e: unknown): MicError {
  const err = e as { name?: string; message?: string } | null;
  const name = err?.name ?? "";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "notfound";
  if (name === "NotReadableError" || name === "AbortError") return "inuse";
  if (typeof window !== "undefined" && !window.isSecureContext) return "insecure";
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia)
    return "unsupported";
  return "unknown";
}

/**
 * Verifica se a permissão de microfone está negada ANTES de tentar getUserMedia.
 * Retorna `null` se for "granted" ou "prompt" (pode prosseguir), ou "denied".
 * Em navegadores sem Permissions API, retorna `null`.
 */
export async function checkMicPermission(): Promise<"denied" | null> {
  try {
    if (typeof navigator === "undefined" || !("permissions" in navigator)) return null;
    const status = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });
    if (status?.state === "denied") return "denied";
    return null;
  } catch {
    return null;
  }
}

/**
 * Pede acesso ao microfone DIRETAMENTE do gesto do usuário (sem await antes).
 * Use o resultado para criar MediaRecorder.
 */
export async function requestMicStream(): Promise<MediaStream> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    const e = new Error("unsupported");
    (e as Error & { name: string }).name = "NotSupportedError";
    throw e;
  }
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
}
