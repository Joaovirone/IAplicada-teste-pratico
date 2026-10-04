import type { LucideIcon } from "lucide-react";

export function SectionPlaceholder({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:py-14">
      <header className="border-b border-border pb-8">
        <p className="mb-2 text-xs font-bold uppercase text-primary">SmartLar Hub</p>
        <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
      </header>
      <div className="flex min-h-80 flex-col items-center justify-center border-b border-border text-center">
        <span className="flex size-12 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-4 font-bold text-foreground">Área em preparação</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">Esta tela já está acessível pelo menu e receberá seus recursos na próxima etapa.</p>
      </div>
    </main>
  );
}
