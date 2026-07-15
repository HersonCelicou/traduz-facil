import { useMemo, useState, useEffect } from "react";
import { Volume2, RotateCcw, Check, X, ArrowLeft } from "lucide-react";
import { speakWithElevenLabs, prefetchTTS } from "@/lib/tts";
import {
  DECKS,
  STUDY_LANGS,
  localeOf,
  nativeKeyFromLocale,
  type Deck,
  type LangKey,
  type VocabItem,
} from "@/lib/learn-content";
import { masterCard, isCardMastered, recordActivity } from "@/lib/progress";
import { useI18n, UI_LANGUAGES } from "@/lib/i18n";

type Locale = string;

// Nome nativo do idioma (localizado) para os botões de seleção.
function nativeLabel(key: LangKey, fallback: string): string {
  return UI_LANGUAGES.find((u) => u.code === key)?.native ?? fallback;
}

export function FlashcardsView({
  userLang,
  onBack,
}: {
  userLang: Locale;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const nativeKey = nativeKeyFromLocale(userLang);
  // Idioma de estudo padrão: se nativo é PT, estuda crioulo; senão, português.
  const [studyKey, setStudyKey] = useState<LangKey>(nativeKey === "pt" ? "ht" : "pt");
  const [deck, setDeck] = useState<Deck | null>(null);

  if (!deck) {
    return (
      <div className="h-full overflow-y-auto px-4 pt-4 pb-8 space-y-4">
        <Header title={t("fc.title")} subtitle={t("fc.subtitle")} onBack={onBack} />
        <LangSelector nativeKey={nativeKey} studyKey={studyKey} onChange={setStudyKey} />
        <div className="grid grid-cols-2 gap-3">
          {DECKS.map((d) => {
            const total = d.items.length;
            const done = d.items.filter((it) => isCardMastered(d.id, it.pt)).length;
            return (
              <button
                key={d.id}
                onClick={() => setDeck(d)}
                className="rounded-2xl bg-card border border-border shadow-card p-4 text-left active:scale-[0.98] transition hover:border-primary/40"
              >
                <div className="text-3xl mb-2">{d.icon}</div>
                <p className="text-sm font-bold text-foreground leading-tight">{t("lesson." + d.id + ".title")}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {t("fc.mastered", { done, total })}
                </p>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden mt-2">
                  <div
                    className="h-full bg-gradient-tropical rounded-full"
                    style={{ width: `${total ? (done / total) * 100 : 0}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <DeckRunner
      deck={deck}
      studyKey={studyKey}
      nativeKey={nativeKey}
      onBack={() => setDeck(null)}
    />
  );
}

function DeckRunner({
  deck,
  studyKey,
  nativeKey,
  onBack,
}: {
  deck: Deck;
  studyKey: LangKey;
  nativeKey: LangKey;
  onBack: () => void;
}) {
  const { t } = useI18n();
  // Ordena: cartões ainda não dominados primeiro (repetição inteligente).
  const ordered = useMemo(() => {
    const cards = deck.items.filter((it) => it[studyKey]);
    return [...cards].sort((a, b) => {
      const ma = isCardMastered(deck.id, a.pt) ? 1 : 0;
      const mb = isCardMastered(deck.id, b.pt) ? 1 : 0;
      return ma - mb;
    });
  }, [deck, studyKey]);

  const [queue, setQueue] = useState<VocabItem[]>(ordered);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);
  const studyLocale = localeOf(studyKey);

  const card = queue[pos];

  useEffect(() => {
    if (card?.[studyKey]) void prefetchTTS(card[studyKey] as string, studyLocale);
  }, [card, studyKey, studyLocale]);

  const speak = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (card?.[studyKey]) void speakWithElevenLabs(card[studyKey] as string, studyLocale);
  };

  const advance = (known: boolean) => {
    masterCard(deck.id, card.pt, known);
    recordActivity(known ? 5 : 2);
    setFlipped(false);
    setDone((d) => d + 1);
    if (pos + 1 < queue.length) {
      setPos((p) => p + 1);
    } else {
      // Revisa os errados de novo se houver
      const notKnown = queue.filter((c) => !isCardMastered(deck.id, c.pt));
      if (!known && notKnown.length > 0) {
        setQueue(notKnown);
        setPos(0);
      } else {
        setPos(queue.length); // marca fim
      }
    }
  };

  const restart = () => {
    setQueue(ordered);
    setPos(0);
    setDone(0);
    setFlipped(false);
  };

  if (!card) {
    return (
      <div className="h-full overflow-y-auto px-4 pt-4 pb-8 space-y-4">
        <Header title={t("lesson." + deck.id + ".title")} subtitle={t("fc.deckDone")} onBack={onBack} />
        <div className="rounded-2xl bg-gradient-tropical text-primary-foreground p-6 text-center shadow-glow">
          <div className="text-5xl mb-2">🎉</div>
          <p className="font-bold text-lg">{t("fc.greatJob")}</p>
          <p className="text-sm opacity-90 mt-1">{t("fc.reviewed", { n: done })}</p>
        </div>
        <button
          onClick={restart}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground py-3 font-bold shadow-card active:scale-[0.99] transition"
        >
          <RotateCcw className="h-4 w-4" /> {t("fc.reviewAgain")}
        </button>
        <button
          onClick={onBack}
          className="w-full rounded-2xl bg-secondary text-secondary-foreground py-3 font-semibold active:scale-[0.99] transition"
        >
          {t("fc.chooseAnother")}
        </button>
      </div>
    );
  }

  const studyText = card[studyKey] as string;
  const studyFlag = STUDY_LANGS.find((l) => l.key === studyKey)?.flag;

  return (
    <div className="h-full overflow-y-auto px-4 pt-4 pb-8 space-y-4">
      <Header title={t("lesson." + deck.id + ".title")} subtitle={t("fc.card", { n: pos + 1, total: queue.length })} onBack={onBack} />

      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full bg-gradient-tropical rounded-full transition-all"
          style={{ width: `${((pos) / queue.length) * 100}%` }}
        />
      </div>

      {/* Cartão */}
      <button
        onClick={() => setFlipped((f) => !f)}
        className="w-full min-h-[220px] rounded-3xl border border-border shadow-card p-6 flex flex-col items-center justify-center text-center bg-card active:scale-[0.99] transition relative"
      >
        <span className="absolute top-3 right-4 text-2xl">{flipped ? "🔄" : studyFlag}</span>
        <span className="absolute top-3 left-4 text-[10px] uppercase font-bold text-muted-foreground tracking-wide">
          {flipped ? t("fc.translation") : t("fc.tapToFlip")}
        </span>
        {!flipped ? (
          <>
            <p className="text-3xl font-extrabold text-primary leading-tight">{studyText}</p>
            {card.pron && studyKey === "ht" && (
              <p className="text-sm text-muted-foreground italic mt-2">/{card.pron}/</p>
            )}
            <span
              onClick={speak}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-tropical text-primary-foreground px-4 py-2 text-sm font-semibold shadow-card active:scale-95 transition"
            >
              <Volume2 className="h-4 w-4" /> {t("practice.listen")}
            </span>
          </>
        ) : (
          <>
            <p className="text-2xl font-bold text-foreground leading-tight">{card[nativeKey]}</p>
            <p className="text-sm text-muted-foreground mt-2">{studyFlag} {studyText}</p>
          </>
        )}
      </button>

      {/* Ações */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => advance(false)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-destructive/10 text-destructive py-3 font-bold active:scale-[0.98] transition"
        >
          <X className="h-4 w-4" /> {t("fc.notYet")}
        </button>
        <button
          onClick={() => advance(true)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-primary/10 text-primary py-3 font-bold active:scale-[0.98] transition"
        >
          <Check className="h-4 w-4" /> {t("fc.knew")}
        </button>
      </div>
    </div>
  );
}

function LangSelector({
  nativeKey,
  studyKey,
  onChange,
}: {
  nativeKey: LangKey;
  studyKey: LangKey;
  onChange: (k: LangKey) => void;
}) {
  const { t } = useI18n();
  // Todos os idiomas disponíveis (paridade total entre idiomas).
  const opts = STUDY_LANGS;
  return (
    <div>
      <p className="text-[11px] uppercase font-semibold text-muted-foreground mb-2 px-1">
        {t("learn.iWantToLearn")}
      </p>
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
        {opts.map((l) => (
          <button
            key={l.key}
            onClick={() => onChange(l.key)}
            className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
              studyKey === l.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border"
            }`}
          >
            <span>{l.flag}</span>
            {nativeLabel(l.key, l.label)}
          </button>
        ))}
      </div>
    </div>
  );
}

function Header({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onBack}
        className="h-9 w-9 rounded-xl bg-secondary text-foreground flex items-center justify-center active:scale-95 transition"
        aria-label={t("common.back")}
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div>
        <h2 className="font-bold text-foreground text-lg leading-tight">{title}</h2>
        <p className="text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
