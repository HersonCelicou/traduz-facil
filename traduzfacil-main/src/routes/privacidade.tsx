import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck, Mail } from "lucide-react";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Traduz Fácil" },
      {
        name: "description",
        content:
          "Política de Privacidade do aplicativo Traduz Fácil: como coletamos, usamos e protegemos seus dados.",
      },
      { property: "og:title", content: "Política de Privacidade — Traduz Fácil" },
      {
        property: "og:description",
        content: "Saiba como o Traduz Fácil protege seus dados.",
      },
    ],
  }),
  component: PrivacyPolicy,
});

const SUPPORT_EMAIL = "traduzfacil.app@gmail.com";
const LAST_UPDATED = "3 de junho de 2026";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-card border border-border shadow-card p-4 space-y-2">
      <h2 className="font-bold text-sm text-foreground">{title}</h2>
      <div className="text-[13px] leading-relaxed text-foreground/80 space-y-2">
        {children}
      </div>
    </section>
  );
}

function PrivacyPolicy() {
  return (
    <div className="min-h-screen w-full bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <Link
          to="/"
          className="flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-muted transition"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-bold text-base text-foreground">
          Política de Privacidade
        </h1>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-4 pb-12 space-y-4">
        <div className="flex flex-col items-center text-center gap-2 py-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-card">
            <ShieldCheck className="h-7 w-7 text-primary-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">
            Última atualização: {LAST_UPDATED}
          </p>
        </div>

        <Section title="1. Introdução">
          <p>
            O <strong>Traduz Fácil</strong> valoriza e respeita a sua
            privacidade. Esta Política de Privacidade explica de forma clara
            quais dados coletamos, como os utilizamos e quais são os seus
            direitos ao utilizar o aplicativo.
          </p>
        </Section>

        <Section title="2. Dados que coletamos">
          <p>Coletamos apenas o necessário para o funcionamento do app:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>E-mail</strong>: utilizado para criar e autenticar a sua
              conta.
            </li>
            <li>
              <strong>Conteúdo de tradução</strong>: textos e áudios que você
              envia para tradução, transcrição ou correção.
            </li>
            <li>
              <strong>Dados de progresso</strong>: pontos, sequências e lições
              concluídas para acompanhar seu aprendizado.
            </li>
          </ul>
        </Section>

        <Section title="3. Como usamos os seus dados">
          <p>Utilizamos os dados exclusivamente para:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Autenticar e manter a sua conta.</li>
            <li>Gerar traduções, transcrições e áudio de voz.</li>
            <li>Salvar e exibir o seu progresso de aprendizado.</li>
            <li>Melhorar a qualidade e a experiência do aplicativo.</li>
          </ul>
        </Section>

        <Section title="4. Processamento por inteligência artificial">
          <p>
            O conteúdo enviado para tradução é processado por serviços de
            inteligência artificial para gerar a resposta. Esse conteúdo{" "}
            <strong>não é vendido nem compartilhado</strong> com terceiros para
            fins comerciais ou de publicidade.
          </p>
        </Section>

        <Section title="5. Armazenamento e segurança">
          <p>
            Parte do seu histórico de traduções é salvo localmente no seu
            aparelho e pode ser apagado a qualquer momento na aba Histórico.
            Os dados da sua conta são armazenados em ambiente seguro, com
            acesso restrito e protegido.
          </p>
        </Section>

        <Section title="6. Compartilhamento de dados">
          <p>
            Não compartilhamos os seus dados pessoais com terceiros, exceto
            quando estritamente necessário para o funcionamento do serviço
            (provedores de tecnologia que processam tradução e voz) ou quando
            exigido por lei.
          </p>
        </Section>

        <Section title="7. Os seus direitos">
          <p>Você pode, a qualquer momento:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Acessar e corrigir os seus dados.</li>
            <li>Apagar o histórico de traduções no próprio aplicativo.</li>
            <li>Solicitar a exclusão da sua conta e dos seus dados.</li>
          </ul>
        </Section>

        <Section title="8. Privacidade de crianças">
          <p>
            O Traduz Fácil não é direcionado a menores de 13 anos e não coleta
            intencionalmente dados de crianças. Caso identifiquemos esse tipo
            de dado, ele será removido.
          </p>
        </Section>

        <Section title="9. Alterações nesta política">
          <p>
            Esta Política de Privacidade pode ser atualizada periodicamente.
            Sempre que houver mudanças relevantes, a data de “última
            atualização” no topo desta página será revisada.
          </p>
        </Section>

        <Section title="10. Contato">
          <p>
            Em caso de dúvidas, solicitações ou para exercer os seus direitos,
            entre em contato com a nossa equipe de suporte:
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline break-all"
          >
            <Mail className="h-4 w-4 shrink-0" />
            {SUPPORT_EMAIL}
          </a>
        </Section>

        <p className="text-center text-xs text-muted-foreground pt-2">
          Traduz Fácil · {LAST_UPDATED}
        </p>
      </main>
    </div>
  );
}
