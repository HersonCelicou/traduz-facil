## Objetivo

Transformar o Traduz Fácil em um app internacional, acessível e consistente, atendendo às 6 prioridades. Hoje a interface é 100% em português, fixa no código (`src/routes/index.tsx`, ~2090 linhas), sem tela de Configurações e sem captura por câmera.

---

## Prioridade 1 — Identidade visual e nome

- Auditar todas as telas (home, login, cadastro, recuperação, perfil, cabeçalho, rodapé, menus, metadados) garantindo o nome oficial **"Traduz Fácil"**.
- `Logo.tsx`: garantir que o nome não seja cortado em telas estreitas (ajustar `truncate`/quebra/escala em mobile 320px).
- Confirmar ausência de variações ("Traduz", "Traduza", "Traduza aí") em código e metadados.

## Prioridade 2 — Interface multilíngue automática

- Criar sistema de i18n próprio e leve (sem dependência externa): `src/lib/i18n.tsx`
  - `I18nProvider` + hook `useT()` com função `t("chave")`.
  - Dicionários para: Português, Crioulo Haitiano, Inglês, Espanhol, Francês.
  - **Detecção automática** via `navigator.language` na primeira abertura.
  - Persistência da escolha em `localStorage` (`tf.uiLang`).
- Envolver o app no `I18nProvider` (em `__root.tsx`).

## Prioridade 3 — Experiência internacional

- Substituir os textos fixos de UI por `t(...)`: navegação inferior, botões, títulos, mensagens (toasts), telas Início/Tradutor/Histórico/Sobre/Ajuda e componentes de treino.
- (Observação: o conteúdo *traduzido pelo usuário* continua usando os serviços de tradução existentes — isto é só a interface.)

## Prioridade 4 — Tradução por câmera

- Adicionar botão **"Tirar Foto"** ao lado do botão de imagem atual.
- Web/PWA: `input` com `capture="environment"` para abrir a câmera traseira.
- Reaproveitar o pipeline OCR + tradução já existente (`handleImagePick` → função `translate-image`).
- Exibir texto original + traduzido (fluxo já existente de imagem).

## Prioridade 5 — Acessibilidade (tamanho de fonte)

- Em Configurações: seletor de fonte **Pequena / Média / Grande / Extra Grande**.
- Implementado via escala de `font-size` na raiz (`data-font-scale` no `<html>` + variável CSS em `styles.css`), aplicando a todas as telas. Persistido em `localStorage`.

## Prioridade 6 — Tutorial multilíngue

- Manter o vídeo atual (não remover).
- Título, descrição e legenda do card de tutorial passam a seguir o idioma da interface (via `t(...)`).
- Garantir reprodução em Android/iPhone/Web (`playsInline`, `preload="metadata"` — já presente).

## Nova tela: Configurações

- Adicionar aba/acesso **Configurações** com:
  - **Idioma do Aplicativo** (5 idiomas, troca manual).
  - **Tamanho da Fonte** (4 opções).
- Acessível pela navegação principal.

---

## Detalhes técnicos

- **Arquivos novos:** `src/lib/i18n.tsx` (provider + dicionários + detecção), tela de Configurações (componente dentro de `index.tsx` ou `src/components/SettingsView.tsx`).
- **Arquivos editados:** `src/routes/index.tsx` (strings → `t()`, botão câmera, aba Configurações), `src/routes/__root.tsx` (provider + html lang dinâmico), `src/components/Logo.tsx`, `src/styles.css` (escala de fonte), e componentes de treino (`PracticeView`, `LessonsView`, `FlashcardsView`, `CorrectionScreen`).
- **Sem mudanças de banco de dados.**

## Recomendações para versões futuras

- Legendas embutidas/queimadas no vídeo por idioma (atualmente narração é fixa em Kreyòl).
- Câmera nativa via plugin Capacitor para captura mais robusta no app instalado.
- Tradução automática do conteúdo de aprendizado (lições) para todos os idiomas.

---

Devido ao volume (substituir centenas de strings em 5 idiomas), vou priorizar **cobertura total das áreas visíveis principais** (navegação, tradutor, configurações, ajuda, sobre, mensagens). Confirma que sigo com este plano?