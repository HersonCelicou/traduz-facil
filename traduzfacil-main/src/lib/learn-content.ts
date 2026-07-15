// Conteúdo educativo real do Traduz Fácil.
// Foco principal: Crioulo Haitiano (ht) ↔ Português (pt), com apoio fr/en/es.
//
// Cada item tem traduções por idioma e uma pronúncia aproximada (pron) do
// crioulo haitiano para ajudar o falante de português a ler em voz alta.

export type LangKey = "pt" | "ht" | "fr" | "en" | "es";

export type VocabItem = {
  // chave de tradução por idioma
  pt: string;
  ht: string;
  fr?: string;
  en?: string;
  es?: string;
  // pronúncia aproximada do crioulo haitiano (para leitura do falante PT)
  pron?: string;
};

export type Lesson = {
  id: string;
  icon: string;
  title: string;     // título em português
  subtitle: string;  // breve descrição
  tip: string;       // explicação simples / dica cultural
  items: VocabItem[];
};

// ----------------------------------------------------------------------------
// LIÇÕES — categorias do cotidiano (saudações, família, comida, trabalho...)
// ----------------------------------------------------------------------------
export const LESSONS: Lesson[] = [
  {
    id: "saudacoes",
    icon: "👋",
    title: "Saudações e cortesia",
    subtitle: "Cumprimentos do dia a dia",
    tip: "Em crioulo haitiano, 'Bonjou' é usado de manhã e 'Bonswa' da tarde em diante. 'Souple' significa 'por favor'.",
    items: [
      { pt: "Bom dia", ht: "Bonjou", fr: "Bonjour", en: "Good morning", es: "Buenos días", pron: "bon-JOU" },
      { pt: "Boa tarde / Boa noite", ht: "Bonswa", fr: "Bonsoir", en: "Good evening", es: "Buenas tardes", pron: "bon-SWA" },
      { pt: "Como você está?", ht: "Kijan ou ye?", fr: "Comment ça va ?", en: "How are you?", es: "¿Cómo estás?", pron: "ki-JAN ou IÉ" },
      { pt: "Estou bem, obrigado", ht: "Mwen byen, mèsi", fr: "Je vais bien, merci", en: "I'm fine, thank you", es: "Estoy bien, gracias", pron: "mwen BIÉN, MÈ-si" },
      { pt: "Por favor", ht: "Souple", fr: "S'il vous plaît", en: "Please", es: "Por favor", pron: "SOU-plé" },
      { pt: "Obrigado(a)", ht: "Mèsi", fr: "Merci", en: "Thank you", es: "Gracias", pron: "MÈ-si" },
      { pt: "De nada", ht: "Pa gen pwoblèm", fr: "De rien", en: "You're welcome", es: "De nada", pron: "pa gen pwo-BLÈM" },
      { pt: "Com licença / Desculpe", ht: "Eskize m", fr: "Excusez-moi", en: "Excuse me", es: "Disculpe", pron: "es-ki-ZÉ m" },
      { pt: "Até logo", ht: "Na wè pita", fr: "À bientôt", en: "See you later", es: "Hasta luego", pron: "na WÈ pi-TA" },
      { pt: "Sim / Não", ht: "Wi / Non", fr: "Oui / Non", en: "Yes / No", es: "Sí / No", pron: "OUI / NON" },
    ],
  },
  {
    id: "familia",
    icon: "👨‍👩‍👧",
    title: "Família",
    subtitle: "Pessoas próximas",
    tip: "'Manman' é mãe e 'Papa' é pai. 'Pitit' significa filho(a) e 'timoun' é criança.",
    items: [
      { pt: "Mãe", ht: "Manman", fr: "Mère", en: "Mother", es: "Madre", pron: "man-MAN" },
      { pt: "Pai", ht: "Papa", fr: "Père", en: "Father", es: "Padre", pron: "pa-PA" },
      { pt: "Filho(a)", ht: "Pitit", fr: "Enfant", en: "Child", es: "Hijo(a)", pron: "pi-TIT" },
      { pt: "Irmão", ht: "Frè", fr: "Frère", en: "Brother", es: "Hermano", pron: "FRÈ" },
      { pt: "Irmã", ht: "Sè", fr: "Sœur", en: "Sister", es: "Hermana", pron: "SÈ" },
      { pt: "Esposo", ht: "Mari", fr: "Mari", en: "Husband", es: "Esposo", pron: "ma-RI" },
      { pt: "Esposa", ht: "Madanm", fr: "Femme", en: "Wife", es: "Esposa", pron: "ma-DANM" },
      { pt: "Amigo(a)", ht: "Zanmi", fr: "Ami(e)", en: "Friend", es: "Amigo(a)", pron: "zan-MI" },
      { pt: "Família", ht: "Fanmi", fr: "Famille", en: "Family", es: "Familia", pron: "fan-MI" },
      { pt: "Criança", ht: "Timoun", fr: "Enfant", en: "Kid", es: "Niño(a)", pron: "ti-MOUN" },
    ],
  },
  {
    id: "comida",
    icon: "🍽️",
    title: "Comida e bebida",
    subtitle: "Na mesa e no mercado",
    tip: "'Mwen grangou' significa 'estou com fome'. 'Dlo' é água e 'manje' é comida (ou comer).",
    items: [
      { pt: "Água", ht: "Dlo", fr: "Eau", en: "Water", es: "Agua", pron: "DLO" },
      { pt: "Comida / Comer", ht: "Manje", fr: "Nourriture / Manger", en: "Food / Eat", es: "Comida", pron: "man-JÉ" },
      { pt: "Pão", ht: "Pen", fr: "Pain", en: "Bread", es: "Pan", pron: "PEN" },
      { pt: "Arroz", ht: "Diri", fr: "Riz", en: "Rice", es: "Arroz", pron: "di-RI" },
      { pt: "Feijão", ht: "Pwa", fr: "Haricots", en: "Beans", es: "Frijoles", pron: "PWA" },
      { pt: "Café", ht: "Kafe", fr: "Café", en: "Coffee", es: "Café", pron: "ka-FÉ" },
      { pt: "Estou com fome", ht: "Mwen grangou", fr: "J'ai faim", en: "I'm hungry", es: "Tengo hambre", pron: "mwen gran-GOU" },
      { pt: "Estou com sede", ht: "Mwen swaf", fr: "J'ai soif", en: "I'm thirsty", es: "Tengo sed", pron: "mwen SWAF" },
      { pt: "Está gostoso", ht: "Li gou", fr: "C'est bon", en: "It's tasty", es: "Está rico", pron: "li GOU" },
      { pt: "Quanto custa?", ht: "Konbyen li koute?", fr: "Combien ça coûte ?", en: "How much is it?", es: "¿Cuánto cuesta?", pron: "kon-BIÉN li kou-TÉ" },
    ],
  },
  {
    id: "trabalho",
    icon: "💼",
    title: "Trabalho",
    subtitle: "No emprego e no dia a dia",
    tip: "'Travay' é trabalho (ou trabalhar). Muito útil para quem busca emprego no Brasil.",
    items: [
      { pt: "Trabalho / Trabalhar", ht: "Travay", fr: "Travail", en: "Work", es: "Trabajo", pron: "tra-VAI" },
      { pt: "Emprego", ht: "Djòb", fr: "Emploi", en: "Job", es: "Empleo", pron: "DJOB" },
      { pt: "Chefe", ht: "Patwon", fr: "Patron", en: "Boss", es: "Jefe", pron: "pa-TWON" },
      { pt: "Dinheiro", ht: "Lajan", fr: "Argent", en: "Money", es: "Dinero", pron: "la-JAN" },
      { pt: "Horário", ht: "Orè", fr: "Horaire", en: "Schedule", es: "Horario", pron: "o-RÈ" },
      { pt: "Estou procurando trabalho", ht: "M ap chèche travay", fr: "Je cherche du travail", en: "I'm looking for work", es: "Busco trabajo", pron: "m ap chè-CHÉ tra-VAI" },
      { pt: "Posso ajudar?", ht: "Èske m ka ede?", fr: "Puis-je aider ?", en: "Can I help?", es: "¿Puedo ayudar?", pron: "ès-ké m ka é-DÉ" },
      { pt: "Entendi", ht: "Mwen konprann", fr: "J'ai compris", en: "I understand", es: "Entendí", pron: "mwen kon-PRANN" },
      { pt: "Não entendi", ht: "Mwen pa konprann", fr: "Je n'ai pas compris", en: "I don't understand", es: "No entendí", pron: "mwen pa kon-PRANN" },
      { pt: "Carteira de trabalho", ht: "Kat travay", fr: "Carte de travail", en: "Work card", es: "Cartilla de trabajo", pron: "kat tra-VAI" },
    ],
  },
  {
    id: "viagem",
    icon: "🧳",
    title: "Viagem e cidade",
    subtitle: "Para se locomover",
    tip: "'Ki kote' significa 'onde'. Use para perguntar direções na cidade.",
    items: [
      { pt: "Onde fica...?", ht: "Ki kote ... ye?", fr: "Où est... ?", en: "Where is...?", es: "¿Dónde está...?", pron: "ki KO-té ... IÉ" },
      { pt: "Ônibus", ht: "Bis", fr: "Bus", en: "Bus", es: "Autobús", pron: "BIS" },
      { pt: "Rua", ht: "Lari", fr: "Rue", en: "Street", es: "Calle", pron: "la-RI" },
      { pt: "Hospital", ht: "Lopital", fr: "Hôpital", en: "Hospital", es: "Hospital", pron: "lo-pi-TAL" },
      { pt: "Banheiro", ht: "Twalèt", fr: "Toilettes", en: "Bathroom", es: "Baño", pron: "twa-LÈT" },
      { pt: "Estou perdido(a)", ht: "Mwen pèdi", fr: "Je suis perdu(e)", en: "I'm lost", es: "Estoy perdido(a)", pron: "mwen PÈ-di" },
      { pt: "À direita / À esquerda", ht: "Adwat / Agoch", fr: "À droite / À gauche", en: "Right / Left", es: "Derecha / Izquierda", pron: "a-DWAT / a-GOCH" },
      { pt: "Perto / Longe", ht: "Toupre / Lwen", fr: "Près / Loin", en: "Near / Far", es: "Cerca / Lejos", pron: "tou-PRÉ / LWEN" },
      { pt: "Me ajuda, por favor", ht: "Ede m souple", fr: "Aidez-moi s'il vous plaît", en: "Help me please", es: "Ayúdeme por favor", pron: "é-DÉ m SOU-plé" },
      { pt: "Quanto tempo leva?", ht: "Konbyen tan li pran?", fr: "Combien de temps ?", en: "How long does it take?", es: "¿Cuánto tarda?", pron: "kon-BIÉN tan li PRAN" },
    ],
  },
  {
    id: "numeros",
    icon: "🔢",
    title: "Números",
    subtitle: "De 1 a 10 e mais",
    tip: "Os números são essenciais para compras, horários e preços.",
    items: [
      { pt: "Um", ht: "En", fr: "Un", en: "One", es: "Uno", pron: "EN" },
      { pt: "Dois", ht: "De", fr: "Deux", en: "Two", es: "Dos", pron: "DÉ" },
      { pt: "Três", ht: "Twa", fr: "Trois", en: "Three", es: "Tres", pron: "TWA" },
      { pt: "Quatro", ht: "Kat", fr: "Quatre", en: "Four", es: "Cuatro", pron: "KAT" },
      { pt: "Cinco", ht: "Senk", fr: "Cinq", en: "Five", es: "Cinco", pron: "SENK" },
      { pt: "Seis", ht: "Sis", fr: "Six", en: "Six", es: "Seis", pron: "SIS" },
      { pt: "Sete", ht: "Sèt", fr: "Sept", en: "Seven", es: "Siete", pron: "SÈT" },
      { pt: "Oito", ht: "Uit", fr: "Huit", en: "Eight", es: "Ocho", pron: "OUIT" },
      { pt: "Nove", ht: "Nèf", fr: "Neuf", en: "Nine", es: "Nueve", pron: "NÈF" },
      { pt: "Dez", ht: "Dis", fr: "Dix", en: "Ten", es: "Diez", pron: "DIS" },
    ],
  },
  {
    id: "verbos",
    icon: "🏃",
    title: "Verbos úteis",
    subtitle: "Ações do dia a dia",
    tip: "No crioulo, o verbo não muda como em português. 'Mwen ale' = eu vou, 'ou ale' = você vai.",
    items: [
      { pt: "Ir", ht: "Ale", fr: "Aller", en: "To go", es: "Ir", pron: "a-LÉ" },
      { pt: "Vir", ht: "Vini", fr: "Venir", en: "To come", es: "Venir", pron: "vi-NI" },
      { pt: "Querer", ht: "Vle", fr: "Vouloir", en: "To want", es: "Querer", pron: "VLÉ" },
      { pt: "Poder", ht: "Kapab", fr: "Pouvoir", en: "Can", es: "Poder", pron: "ka-PAB" },
      { pt: "Falar", ht: "Pale", fr: "Parler", en: "To speak", es: "Hablar", pron: "pa-LÉ" },
      { pt: "Comer", ht: "Manje", fr: "Manger", en: "To eat", es: "Comer", pron: "man-JÉ" },
      { pt: "Beber", ht: "Bwè", fr: "Boire", en: "To drink", es: "Beber", pron: "BWÈ" },
      { pt: "Dormir", ht: "Dòmi", fr: "Dormir", en: "To sleep", es: "Dormir", pron: "DO-mi" },
      { pt: "Trabalhar", ht: "Travay", fr: "Travailler", en: "To work", es: "Trabajar", pron: "tra-VAI" },
      { pt: "Aprender", ht: "Aprann", fr: "Apprendre", en: "To learn", es: "Aprender", pron: "a-PRANN" },
    ],
  },
];

// ----------------------------------------------------------------------------
// FLASHCARDS — baralhos por categoria (reaproveitam o vocabulário das lições)
// ----------------------------------------------------------------------------
export type Deck = {
  id: string;
  icon: string;
  title: string;
  items: VocabItem[];
};

export const DECKS: Deck[] = LESSONS.map((l) => ({
  id: l.id,
  icon: l.icon,
  title: l.title,
  items: l.items,
}));

// Idiomas disponíveis para estudo (o oposto do nativo do usuário).
export const STUDY_LANGS: { key: LangKey; label: string; flag: string; locale: string }[] = [
  { key: "ht", label: "Crioulo Haitiano", flag: "🇭🇹", locale: "ht-HT" },
  { key: "pt", label: "Português", flag: "🇧🇷", locale: "pt-BR" },
  { key: "fr", label: "Francês", flag: "🇫🇷", locale: "fr-FR" },
  { key: "en", label: "Inglês", flag: "🇺🇸", locale: "en-US" },
  { key: "es", label: "Espanhol", flag: "🇪🇸", locale: "es-ES" },
];

export function localeOf(key: LangKey): string {
  return STUDY_LANGS.find((l) => l.key === key)?.locale ?? "pt-BR";
}

export function nativeKeyFromLocale(locale: string): LangKey {
  if (locale.startsWith("ht")) return "ht";
  if (locale.startsWith("fr")) return "fr";
  if (locale.startsWith("en")) return "en";
  if (locale.startsWith("es")) return "es";
  return "pt";
}

// ----------------------------------------------------------------------------
// DICA DINÂMICA — gera a explicação pedagógica no idioma da INTERFACE, falando
// sobre o idioma ESTUDADO. Os placeholders são:
//   {lang}  -> nome do idioma estudado (já localizado pela interface)
//   {wN}    -> palavra/expressão nº N no idioma estudado (do vocabulário)
//   {mN}    -> tradução nº N no idioma nativo do usuário
// Assim a interface e o idioma estudado ficam totalmente separados.
// ----------------------------------------------------------------------------
export function interpolateTip(
  template: string,
  items: VocabItem[],
  studyKey: LangKey,
  nativeKey: LangKey,
  langName: string,
): string {
  return template
    .replace(/\{lang\}/g, langName)
    .replace(/\{w(\d+)\}/g, (_, i) => (items[Number(i)]?.[studyKey] as string) ?? "")
    .replace(/\{m(\d+)\}/g, (_, i) => (items[Number(i)]?.[nativeKey] as string) ?? "");
}
