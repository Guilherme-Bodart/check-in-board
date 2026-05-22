import { UsersRound } from "lucide-react";

export function OwnersPage() {
  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft text-primary">
            <UsersRound aria-hidden className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Proprietários
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-text-primary">
              Clientes e imóveis próprios
            </h2>
          </div>
        </div>
        <p className="mt-5 max-w-3xl text-sm leading-6 text-text-secondary">
          Esta área vai separar proprietários próprios e clientes terceiros. Um
          proprietário poderá ter vários apartamentos, permitindo relatórios por imóvel
          e por cliente.
        </p>
      </section>

      <section className="rounded-2xl border border-dashed border-border bg-surface/70 p-8 text-center">
        <h3 className="text-lg font-semibold text-text-primary">
          Backend de proprietários pendente
        </h3>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
          A tela já existe para a navegação principal, mas os dados reais devem vir dos
          futuros endpoints GET /owners, POST /owners, PUT /owners/ownerId e DELETE
          /owners/ownerId.
        </p>
      </section>
    </div>
  );
}
