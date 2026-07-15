import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Volume2, X, Check, ChevronLeft, ChevronRight, Sparkles, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

export type CorrectionWord = {
  word: string;
  ok: boolean;
  original?: string | null;
  suggestion?: string | null;
  reason?: string | null;
};

type Props = {
  attempt: string;
  lang: string; // Locale
  langLabel: string;
  langFlag: string;
  reference?: string;
  onClose: () => void;
};

import { speakWithElevenLabs } from "@/lib/tts";

function speak(txt: string, locale: string) {
  void speakWithElevenLabs(txt, locale);
}

export function CorrectionScreen({
  attempt,
  lang,
  langLabel,
  langFlag,
  reference,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [corrected, setCorrected] = useState("");
  const [words, setWords] = useState<CorrectionWord[]>([]);
  const [focusIdx, setFocusIdx] = useState(0);

  const wrongIdxs = useMemo(
    () => words.map((w, i) => (!w.ok ? i : -1)).filter((i) => i >= 0),
    [words],
  );

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("correct", {
        body: { attempt, lang, reference },
      });
      if (error) throw error;
      const w: CorrectionWord[] = (data as any)?.words ?? [];
      setWords(w);
      setCorrected((data as any)?.corrected ?? attempt);
      const firstWrong = w.findIndex((x) => !x.ok);
      setFocusIdx(firstWrong >= 0 ? firstWrong : 0);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Não consegui analisar agora.");
      toast.error("Erro ao analisar a frase.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, lang, reference]);

  const goPrev = () => {
    if (!wrongIdxs.length) return;
    const cur = wrongIdxs.indexOf(focusIdx);
    const next = cur <= 0 ? wrongIdxs[wrongIdxs.length - 1] : wrongIdxs[cur - 1];
    setFocusIdx(next);
  };
  const goNext = () => {
    if (!wrongIdxs.length) return;
    const cur = wrongIdxs.indexOf(focusIdx);
    const next = cur < 0 || cur >= wrongIdxs.length - 1 ? wrongIdxs[0] : wrongIdxs[cur + 1];
    setFocusIdx(next);
  };

  const focused = words[focusIdx];
  const allCorrect = words.length > 0 && wrongIdxs.length === 0;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
      {/* Header */}
      <header className="shrink-0 px-4 py-3 bg-gradient-tropical text-primary-foreground shadow-soft flex items-center justify-between">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-white/15"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="h-4 w-4" />
          Correção {langFlag} {langLabel}
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="p-2 -mr-2 rounded-full hover:bg-white/15 disabled:opacity-50"
          aria-label="Reanalisar"
        >
          <RefreshCcw className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-32">
        {/* Tentativa do aluno */}
        <div className="rounded-2xl bg-secondary/60 border border-border p-3 mb-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Você disse
          </div>
          <p className="text-sm italic text-foreground/80">{attempt}</p>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm">Analisando palavra por palavra…</p>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl bg-destructive/10 border border-destructive/30 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && words.length > 0 && (
          <>
            {/* Frase corrigida com destaque */}
            <div className="rounded-2xl bg-card border border-border shadow-card p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Forma correta
                </div>
                <button
                  onClick={() => speak(corrected, lang)}
                  className="p-1.5 rounded-md hover:bg-secondary text-primary"
                  aria-label="Ouvir frase"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>
              <p className="text-lg leading-relaxed flex flex-wrap gap-x-1.5 gap-y-1">
                {words.map((w, i) => {
                  const isFocus = i === focusIdx;
                  const wrong = !w.ok;
                  return (
                    <button
                      key={i}
                      onClick={() => setFocusIdx(i)}
                      className={`px-1.5 py-0.5 rounded-md transition ${
                        wrong
                          ? isFocus
                            ? "bg-destructive text-destructive-foreground shadow-glow scale-110"
                            : "bg-destructive/20 text-destructive underline decoration-wavy decoration-destructive/70 underline-offset-4"
                          : isFocus
                            ? "bg-primary/20 text-primary"
                            : "text-foreground hover:bg-secondary"
                      }`}
                    >
                      {w.word}
                    </button>
                  );
                })}
              </p>
            </div>

            {/* Card da palavra em foco */}
            {focused && (
              <div
                className={`rounded-2xl p-4 border shadow-card ${
                  focused.ok
                    ? "bg-primary/5 border-primary/30"
                    : "bg-destructive/5 border-destructive/30"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {focused.ok ? "Tudo certo" : "Atenção a esta palavra"}
                  </span>
                  <div className="flex items-center gap-1">
                    {wrongIdxs.length > 1 && (
                      <>
                        <button onClick={goPrev} className="p-1.5 rounded-md hover:bg-secondary">
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button onClick={goNext} className="p-1.5 rounded-md hover:bg-secondary">
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-2">
                  <button
                    onClick={() => speak(focused.word, lang)}
                    className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-glow active:scale-95"
                    aria-label="Ouvir palavra"
                  >
                    <Volume2 className="h-5 w-5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-2xl font-bold tracking-tight ${
                        focused.ok ? "text-primary" : "text-destructive"
                      }`}
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {focused.word}
                    </div>
                    {focused.original && focused.original !== focused.word && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        você disse:{" "}
                        <span className="line-through italic">{focused.original}</span>
                      </div>
                    )}
                  </div>
                  {focused.ok ? (
                    <Check className="h-6 w-6 text-primary" />
                  ) : (
                    <X className="h-6 w-6 text-destructive" />
                  )}
                </div>

                {focused.suggestion && (
                  <p className="text-sm text-foreground/90 mt-2">
                    💡 <span className="font-medium">{focused.suggestion}</span>
                  </p>
                )}
                {focused.reason && (
                  <p className="text-xs text-muted-foreground mt-1">{focused.reason}</p>
                )}
              </div>
            )}

            {allCorrect && (
              <div className="mt-4 rounded-2xl bg-primary/10 border border-primary/30 p-4 text-center">
                <div className="text-3xl mb-1">🎉</div>
                <p className="text-sm font-semibold text-primary">
                  Perfeito! Pronúncia e escrita corretas.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer com nav rápida entre erros */}
      {!loading && wrongIdxs.length > 0 && (
        <div className="shrink-0 absolute bottom-0 left-0 right-0 px-4 py-3 bg-card/95 backdrop-blur border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {wrongIdxs.indexOf(focusIdx) >= 0
              ? `${wrongIdxs.indexOf(focusIdx) + 1} de ${wrongIdxs.length} erros`
              : `${wrongIdxs.length} ${wrongIdxs.length === 1 ? "erro" : "erros"}`}
          </span>
          <div className="flex gap-2">
            <button
              onClick={goPrev}
              className="px-3 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>
            <button
              onClick={goNext}
              className="px-3 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1"
            >
              Próximo <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
