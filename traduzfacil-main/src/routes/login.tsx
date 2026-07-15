import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Loader2, Mail, Lock, User as UserIcon, KeyRound } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

type Mode = "signin" | "signup" | "forgot";

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err?.message ?? "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
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
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: name.trim() || email.split("@")[0] },
        },
      });
      if (error) throw error;
      toast.success("Conta criada! Verifique seu e-mail para confirmar.");
      setMode("signin");
    } catch (err: any) {
      toast.error(err?.message ?? "Não foi possível criar a conta.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Digite seu e-mail.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Enviamos um link de recuperação para seu e-mail.");
      setMode("signin");
    } catch (err: any) {
      toast.error(err?.message ?? "Não foi possível enviar o e-mail.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
    } catch (err: any) {
      toast.error(err?.message ?? "Falha no login com Google.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Logo />
          <h1 className="text-2xl font-semibold text-center">
            {mode === "signin" && "Entrar no Traduz Fácil"}
            {mode === "signup" && "Criar sua conta"}
            {mode === "forgot" && "Recuperar senha"}
          </h1>
          <p className="text-sm text-muted-foreground text-center">
            {mode === "signin" && "Acesse sua conta para começar a traduzir."}
            {mode === "signup" && "É rápido e gratuito."}
            {mode === "forgot" && "Enviaremos um link para redefinir sua senha."}
          </p>
        </div>

        {mode !== "forgot" && (
          <>
            {/* Tabs Entrar / Criar conta */}
            <div className="grid grid-cols-2 rounded-lg bg-secondary p-1">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`h-9 rounded-md text-sm font-medium transition-colors ${
                  mode === "signin"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`h-9 rounded-md text-sm font-medium transition-colors ${
                  mode === "signup"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                Criar conta
              </button>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11"
              onClick={handleGoogle}
              disabled={loading}
            >
              Continuar com Google
            </Button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">ou com e-mail</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        {mode === "signin" && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="pl-9 h-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={6}
                  className="pl-9 h-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
            </Button>
            <button
              type="button"
              onClick={() => setMode("forgot")}
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 text-sm text-primary hover:underline"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Esqueci minha senha
            </button>
          </form>
        )}

        {mode === "signup" && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  required
                  className="pl-9 h-11"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-up">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email-up"
                  type="email"
                  autoComplete="email"
                  required
                  className="pl-9 h-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password-up">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password-up"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className="pl-9 h-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">Mínimo 6 caracteres.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirmar senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className="pl-9 h-11"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
            </Button>
          </form>
        )}

        {mode === "forgot" && (
          <form onSubmit={handleForgot} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email-forgot">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email-forgot"
                  type="email"
                  autoComplete="email"
                  required
                  className="pl-9 h-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link de recuperação"}
            </Button>
            <button
              type="button"
              onClick={() => setMode("signin")}
              disabled={loading}
              className="w-full text-sm text-muted-foreground hover:underline"
            >
              Voltar para o login
            </button>
          </form>
        )}

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/" className="underline">Voltar para o início</Link>
        </p>
      </div>
    </div>
  );
}
