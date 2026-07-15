import iconUrl from "@/assets/logo-traduz-facil.png";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: { box: "h-8 w-8", text: "text-base" },
    md: { box: "h-10 w-10", text: "text-lg" },
    lg: { box: "h-14 w-14", text: "text-2xl" },
  } as const;
  const s = sizes[size];
  return (
    <div className="flex items-center gap-2.5">
      <img
        src={iconUrl}
        alt="Traduz Fácil"
        className={`${s.box} rounded-2xl object-contain`}
      />
      <div className="flex flex-col leading-tight">
        <span className={`${s.text} font-bold tracking-tight`}>Traduz Fácil</span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Conectando culturas e oportunidades
        </span>
      </div>
    </div>
  );
}
