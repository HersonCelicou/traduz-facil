import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

type Status = "validating" | "ready" | "error";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>("validating");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout>;

    const markReady = () => {
      if (!active) return;
      clearTimeout(timeout);
      setStatus("ready");
    };

    const markError = (msg: string) => {
      if (!active) return;
      clearTimeout(timeout);
      setErrorMsg(msg);
      setStatus("error");
    };

    // Escuta o evento de recuperação de senha disparado pelo Supabase.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        markReady();
      }
    });

    const validateLink = async () => {
      try {
        const url = new URL(window.location.href);
        const hashParams = new URLSearchParams(
          url.hash.startsWith("#") ? url.hash.slice(1) : url.hash,
        );
        const query = url.searchParams;

        // 1) Erro explícito vindo no link (expirado, já usado, etc.)
        const errDesc =
          hashParams.get("error_description") || query.get("error_description");
        if (errDesc) {
          markError(decodeURIComponent(errDesc));
          return;
        }

        // 2) Fluxo PKCE: ?code=...
        const code = query.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) return markError(error.message);
          markReady();
          return;
        }

        // 3) Fluxo token_hash: ?token_hash=...&type=recovery
        const tokenHash = query.get("token_hash") || hashParams.get("token_hash");
        const type = query.get("type") || hashParams.get("type");
        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as "recovery",
          });
          if (error) return markError(error.message);
          markReady();
          return;
        }

        // 4) Fluxo implícito: #access_token=...&refresh_token=...
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) return markError(error.message);
          markReady();
          return;
        }

        // 5) Sessão já estabelecida (ex.: detectSessionInUrl já processou).
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          markReady();
          return;
        }

        // Nada encontrado — deixa o timeout decidir, caso o evento ainda chegue.
      } catch (e: any) {
        markError(e?.message ?? "Link inválido.");
      }
    };

    validateLink();

    // Fallback: não deixa o usuário preso em "Validando..." indefinidamente.
    timeout = setTimeout(() => {
      if (active && status === "validating") {
        markError(
          "Não foi possível validar o link de recuperação. Ele pode ter expirado ou já ter sido usado.",
        );
      }
    }, 10000);

    return () => {
      active = false;
      clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha atualizada! Você já pode entrar.");
      await supabase.auth.signOut();
      navigate({ to: "/login" });
    } catch (err: any) {
      toast.error(err?.message ?? "Não foi possível atualizar a senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Logo />
          <h1 className="text-xl font-semibold">Criar nova senha</h1>
          <p className="text-sm text-muted-foreground text-center">
            {status === "validating" && "Validando o link de recuperação..."}
            {status === "ready" && "Digite sua nova senha de acesso."}
            {status === "error" && (errorMsg || "Link inválido ou expirado.")}
          </p>
        </div>

        {status === "validating" && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {status === "error" && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => navigate({ to: "/login" })}
          >
            Voltar para o login
          </Button>
        )}

        {status === "ready" && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirmar senha</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                disabled={loading}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Salvar nova senha"
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
