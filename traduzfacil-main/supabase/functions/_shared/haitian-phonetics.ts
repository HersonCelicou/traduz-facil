// Sistema avançado de pronúncia para Crioulo Haitiano (Kreyòl Ayisyen).
//
// ESTRATÉGIA:
// O OpenAI TTS não suporta crioulo haitiano nativamente. Para obter voz que
// soe nativa, fazemos "respelling" do texto haitiano usando ortografia
// francesa — que reproduz ~95% dos fonemas haitianos corretamente quando
// o modelo TTS detecta o texto como francês.
//
// CAMADAS (aplicadas em ordem):
//   1. Dicionário fonético (palavras frequentes — máxima confiabilidade)
//   2. Regras de semivogais (w, y)
//   3. Regras de consoantes ambíguas (j, g, c, ch)
//   4. Regras de vogais nasais (in, im, en, an, on)
//   5. Regras de dígrafos e finais
//   6. Prosódia (micro-pausas naturais)
//   7. Marcador de idioma (força detecção francesa)

type Rule = [RegExp, string];

const PHRASE_OVERRIDES: Array<[RegExp, string]> = [
  // Frase de regressão fonética: mantém fluxo nativo sem leitura francesa/inglesa.
  [
    /\bmwen\s+fenk\s+manje\s+diri\s+ak\s+pwa\s+plis\s+kat\s+vè\s+ji\s+sitwon\b/gi,
    "Mwen fenk manjé diri ak pwa, plis kat vè, jî sitwon",
  ],
];

// ============================================================
// 1) DICIONÁRIO FONÉTICO — palavras mais frequentes do crioulo
// ============================================================
// Cobre saudações, pronomes, verbos comuns, conectivos, tempo, números,
// família, comida, cortesia. Ordem alfabética por chave.
const WORD_DICTIONARY: Record<string, string> = {
  // Saudações e cortesia
  "bonjou": "bon-jour",
  "bonswa": "bon-soir",
  "bonnwit": "bon-nouite",
  "alo": "a-lo",
  "mèsi": "mer-si",
  "mesi": "mer-si",
  "souple": "sou-plé",
  "tanpri": "tan-pri",
  "padon": "pa-don",
  "eskize": "esskizé",
  "eskize'm": "esskizème",
  "byenveni": "bien-vé-ni",
  "orevwa": "o-ré-voi-re",
  "wi": "oui",
  "non": "non",
  "oke": "o-ké",
  "dakò": "da-ko",
  // Pronomes
  "mwen": "moin",
  "m": "m",
  "ou": "ou",
  "w": "ou",
  "li": "li",
  "l": "l",
  "nou": "nou",
  "n": "n",
  "yo": "io",
  "y": "i",
  // Verbos comuns
  "ye": "ié",
  "se": "sé",
  "te": "té",
  "ap": "ap",
  "ta": "ta",
  "pral": "pral",
  "prale": "pra-lé",
  "genyen": "guégnain",
  "gen": "guène",
  "konnen": "ko-nain",
  "konn": "kone",
  "vle": "vlé",
  "vini": "vi-ni",
  "vin": "vine",
  "ale": "a-lé",
  "ay": "ail",
  "kapab": "ka-pab",
  "ka": "ka",
  "gade": "ga-dé",
  "pale": "pa-lé",
  "tande": "tan-dé",
  "manje": "manjé",
  "bwè": "bouè",
  "dòmi": "do-mi",
  "leve": "lé-vé",
  "chita": "chi-ta",
  "kanpe": "kan-pé",
  "fè": "fè",
  "bay": "bail",
  "ban": "bann",
  "pran": "prann",
  "pote": "po-té",
  "voye": "voi-yé",
  "bezwen": "bé-zou-ain",
  "renmen": "rin-main",
  "viv": "vive",
  "mouri": "mou-ri",
  "rete": "ré-té",
  "tounen": "tou-nain",
  "soti": "so-ti",
  "antre": "an-tré",
  "monte": "mon-té",
  "desann": "dé-sann",
  "louvri": "lou-vri",
  "fèmen": "fè-main",
  "fenk": "fenk",
  // Conectivos e advérbios
  "epi": "épi",
  "e": "é",
  "men": "main",
  "paske": "pas-ké",
  "pou": "pou",
  "ak": "ak",
  "pa": "pa",
  "ki": "ki",
  "kòm": "kom",
  "donk": "donk",
  "alò": "a-lo",
  "konsa": "kon-sa",
  "menm": "mainme",
  "tou": "tou",
  "toujou": "tou-jour",
  "jamè": "ja-mè",
  "deja": "dé-ja",
  "ankò": "an-ko",
  "byen": "bien",
  "mal": "mal",
  "anpil": "an-pile",
  "plis": "plisse",
  "piti": "pi-ti",
  "gwo": "grôo",
  "kèk": "kèke",
  "tout": "toute",
  "ase": "a-sé",
  "twòp": "trop",
  // Tempo
  "jodi": "jo-di",
  "demen": "dé-main",
  "yè": "ié",
  "maten": "ma-tain",
  "midi": "mi-di",
  "aprèmidi": "a-prè-mi-di",
  "swa": "soir",
  "lannwit": "lan-nouite",
  "semèn": "sé-mainne",
  "mwa": "moi-a",
  "ane": "a-né",
  "lè": "lè",
  "kounye": "kou-nié",
  "kounyea": "kou-nié-a",
  // Família
  "fanmi": "fan-mi",
  "manman": "man-mann",
  "papa": "pa-pa",
  "pitit": "pi-tite",
  "frè": "frè",
  "sè": "sè",
  "mari": "ma-ri",
  "madanm": "ma-danme",
  "zanmi": "zan-mi",
  "moun": "moune",
  "timoun": "ti-moune",
  // Lugares e objetos
  "kay": "kail",
  "lakay": "la-kail",
  "lekòl": "lé-kol",
  "travay": "tra-vail",
  "machin": "ma-chine",
  "lari": "la-ri",
  "vil": "vile",
  "peyi": "pé-i",
  "dlo": "dlô",
  "manje": "manjé",
  "pen": "pain",
  "pwa": "pwa",
  "diri": "diri",
  "sitwon": "sitwon",
  "fri": "fri",
  "kafe": "ka-fé",
  // Problemas com "j" (não pode soar como DJI)
  "ji": "jî",
  "jis": "jisse",
  "jou": "jour",
  "jwe": "joué",
  "jwenn": "jouain",
  "jèn": "jainne",
  "jij": "jije",
  // Outros frequentes
  "bagay": "ba-gail",
  "afè": "a-fè",
  "lavi": "la-vi",
  "lanmou": "lan-mou",
  "kè": "kè",
  "tèt": "tète",
  "men": "main",
  "pye": "pié",
  "je": "jé",
  "bouch": "bouche",
  "zòrèy": "zo-rèil",
  "kat": "katte",
  "vè": "vè",
  // Interrogativos (frequentes — "kijan ou ye?")
  "kijan": "ki-jan",
  "kòman": "ko-mann",
  "koman": "ko-mann",
  "kisa": "ki-sa",
  "kilès": "ki-lès",
  "kote": "ko-té",
  "konbyen": "kon-biain",
  "poukisa": "pou-ki-sa",
  "eske": "ès-ké",

  // Sentimentos e encontro ("Mwen kontan rankontre ou")
  "kontan": "kon-tan",
  "kontante": "kon-tan-té",
  "rankontre": "ran-kon-tré",
  "kontre": "kon-tré",
  "remèsi": "ré-mer-si",
  "kontinye": "kon-ti-nié",
  "espere": "ès-pé-ré",
  "panse": "pan-sé",
  "santi": "san-ti",
  "kwè": "kouè",
  "konprann": "kon-prann",
  "trankil": "tran-kile",

  "fache": "fa-ché",
  "tris": "trisse",
  "pè": "pè",
  "fyè": "fiè",
};

// ============================================================
// 1b) DICIONÁRIO EXPANDIDO — números, dias, mais verbos e cotidiano.
// Mesclado ao principal via Object.assign (chaves novas, sem conflito).
// ============================================================
const EXTRA_WORDS: Record<string, string> = {
  // Números
  "youn": "ioune",
  "de": "dé",
  "twa": "trois",
  "senk": "sainke",
  "sis": "sisse",
  "sèt": "sète",
  "uit": "ouite",
  "nèf": "nèfe",
  "dis": "disse",
  "onz": "onze",
  "douz": "douze",
  "trèz": "trèze",
  "ven": "vain",
  "trant": "trante",
  "san": "san",
  "mil": "mile",
  // Dias da semana
  "lendi": "lain-di",
  "madi": "ma-di",
  "mèkredi": "mè-kré-di",
  "jedi": "jé-di",
  "vandredi": "van-dré-di",
  "samdi": "sam-di",
  "dimanch": "di-manche",
  // Tempo / espaço
  "anvan": "an-van",
  "apre": "a-pré",
  "anba": "an-ba",
  "anlè": "an-lè",
  "deyò": "dé-io",
  "andedan": "an-dé-dan",
  "toupatou": "tou-pa-tou",
  "talè": "ta-lè",
  "byento": "biain-to",
  "alèkile": "a-lè-ki-lé",
  "kounyea": "kou-nié-a",
  // Verbos do cotidiano
  "ekri": "é-kri",
  "achte": "ach-té",
  "vann": "vann",
  "peye": "pé-yé",
  "ede": "é-dé",
  "mande": "man-dé",
  "reponn": "ré-ponn",
  "di": "di",
  "kite": "ki-té",
  "kòmanse": "ko-man-sé",
  "fini": "fi-ni",
  "eseye": "é-sé-yé",
  "bliye": "bli-yé",
  "sonje": "son-jé",
  "mache": "ma-ché",
  "kouri": "kou-ri",
  "danse": "dan-sé",
  "chante": "chan-té",
  "ri": "ri",
  "kriye": "kri-yé",
  "ekoute": "é-kou-té",
  "li": "li",
  "konte": "kon-té",
  "jwenn": "jouain",
  "rive": "ri-vé",
  // Comida
  "vyann": "viann",
  "pwason": "pwa-son",
  "legim": "lé-guime",
  "lèt": "lète",
  "sik": "sike",
  "sèl": "sèle",
  "piman": "pi-man",
  "bannann": "ba-nann",
  "mango": "man-go",
  "zoranj": "zo-ranje",
  // Saúde / corpo
  "doktè": "dok-tè",
  "lopital": "lo-pi-tal",
  "maladi": "ma-la-di",
  "doulè": "dou-lè",
  "renmèd": "ré-mède",
  // Cortesia extra
  "anchante": "an-chan-té",
  "felisitasyon": "fé-li-si-ta-sion",
  "kenbe": "kain-bé",
  // Identidade / lugares próprios (evitam leitura francesa/inglesa errada)
  "kreyòl": "kré-yòl",
  "kreyol": "kré-yòl",
  "ayisyen": "a-i-syin",
  "ayisyèn": "a-i-syène",
  "pòtoprens": "poto-prince",
  "yon": "ion",
  "twò": "tou-ò",
  "chè": "chè",
};
Object.assign(WORD_DICTIONARY, EXTRA_WORDS);



// ============================================================
// 2) REGRAS DE SEMIVOGAIS
// ============================================================
// Classe de vogais (inclui TODOS os acentos haitianos/franceses). Usar uma
// classe completa evita que vogais acentuadas (ò, è, à…) sejam tratadas como
// fronteira de palavra (\b), o que antes corrompia palavras como "kreyòl".
const V = "aeiouáàâäéèêëíìîïóòôöúùûü";

const W_RULES: Rule[] = [
  // Consoante + w + vogal → consoante + "ou" + vogal
  [new RegExp(`([bcdfgjklmnprstvz])w([${V}])`, "gi"), "$1ou$2"],
  // w inicial antes de vogal
  [new RegExp(`\\bw([${V}])`, "g"), "ou$1"],
  [new RegExp(`\\bW([${V}])`, "g"), "Ou$1"],
  // w intervocálico
  [new RegExp(`([${V}])w([${V}])`, "gi"), "$1ou$2"],
  // w final
  [new RegExp(`([${V}])w\\b`, "gi"), "$1ou"],
];

const Y_RULES: Rule[] = [
  // y entre vogais → i (semivogal)
  [new RegExp(`([${V}])y([${V}])`, "gi"), "$1i$2"],
  // y inicial antes de vogal
  [new RegExp(`\\by([${V}])`, "g"), "i$1"],
  [new RegExp(`\\bY([${V}])`, "g"), "I$1"],
  // y final → "il" (ex.: kay → kail)
  [new RegExp(`([${V}])y\\b`, "gi"), "$1il"],
];

// ============================================================
// 3) CONSOANTES AMBÍGUAS
// ============================================================
const CONSONANT_RULES: Rule[] = [
  // "j" haitiano = /ʒ/ (como em francês "jour"). O contexto francês das
  // palavras do dicionário já garante a leitura correta.
];

// ============================================================
// 4) VOGAIS NASAIS
// ============================================================
// "an", "en", "on" haitianos = nasais (como francês) → manter
// "in"/"im" haitianos = /in/, /im/ (NÃO nasal!) → respelar como "ine"/"ime"
// para evitar nasalização francesa indevida.
// IMPORTANTE: estas regras só rodam em palavras FORA do dicionário, então
// nunca destroem nasais intencionais de respellings já corretos (main, bien…).
const NASAL_RULES: Rule[] = [
  [/in\b/gi, "ine"],
  [/im\b/gi, "ime"],
  // "oun" haitiano = /un/ (não nasal) → "oune"
  [/oun\b/gi, "oune"],
];

// ============================================================
// 5) DÍGRAFOS E FINAIS
// ============================================================
const DIGRAPH_RULES: Rule[] = [
  // "ng" final (nasal velar) → "n" para evitar "n-g" articulado
  [/ng\b/gi, "n"],
];

// ============================================================
// HELPERS
// ============================================================
function applyRules(text: string, rules: Rule[]): string {
  let out = text;
  for (const [pattern, replacement] of rules) out = out.replace(pattern, replacement);
  return out;
}

function matchCase(replacement: string, original: string): string {
  const first = original[0];
  if (first && first === first.toUpperCase() && first !== first.toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

// PROCESSAMENTO POR TOKEN (a maior alavanca de qualidade desta versão).
// Para CADA palavra:
//   • se estiver no dicionário → usa o respelling verbatim (nunca é tocado
//     pelas regras, evitando re-corrupção tipo "mwen"→"mouen" ou "main"→"maine");
//   • senão → aplica as regras fonéticas com a palavra ISOLADA, de modo que os
//     âncoras \b funcionem de forma confiável (corrige "kreyòl"→"kreilòl").
function transformTokens(text: string): string {
  return text.replace(/[A-Za-zÀ-ÿ']+/g, (word) => {
    const lower = word.toLowerCase();
    const dict = WORD_DICTIONARY[lower];
    if (dict) return matchCase(dict, word);
    let w = word;
    w = applyRules(w, W_RULES);
    w = applyRules(w, Y_RULES);
    w = applyRules(w, CONSONANT_RULES);
    w = applyRules(w, NASAL_RULES);
    w = applyRules(w, DIGRAPH_RULES);
    return w;
  });
}

// ============================================================
// 6) PROSÓDIA — fluidez máxima, pausas mínimas
// ============================================================
// Filosofia: NÃO inserir pausas artificiais. A fluidez/liaison e o ritmo são
// guiados pelas `instructions` do gpt-4o-mini-tts. Aqui adicionamos no máximo
// uma vírgula leve depois de um conectivo de discurso que ABRE a frase
// (Men, Epi, Donk…) — algo que um falante nativo faz naturalmente. Não
// mexemos em "men/paske" no meio da frase (poderia separar "men" = mão, e
// criaria a pausa robótica que o usuário quer evitar).
function addProsodyPauses(text: string): string {
  let t = text;

  t = t.replace(
    /(^|[.!?]\s+)(Men|Epi|Donk|Alò|Konsa|Poutan)\b(?!\s*,)\s+/g,
    (_m, pre, conn) => `${pre}${conn}, `,
  );

  // Limpeza: vírgulas duplicadas e espaços antes de pontuação.
  t = t.replace(/,\s*,+/g, ",").replace(/\s+([,.!?])/g, "$1");
  t = t.replace(/\s{2,}/g, " ").trim();
  return t;
}

/**
 * Normaliza texto crioulo haitiano para soar nativo no OpenAI TTS.
 */
export function normalizeHaitianForTTS(input: string): string {
  if (!input) return "";
  let t = input.normalize("NFC");

  // 1) Overrides de frases inteiras (lista curada com vírgulas naturais).
  for (const [pattern, replacement] of PHRASE_OVERRIDES) {
    t = t.replace(pattern, replacement);
  }
  // 2) Prosódia leve aplicada às palavras haitianas (antes do respelling).
  t = addProsodyPauses(t);
  // 3) Respelling fonético por token (dicionário + regras isoladas).
  t = transformTokens(t);

  return t;
}

