export const fmtBRL = (v: number) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const fmtPct = (v: number) => `${(Number(v) || 0).toFixed(2)}%`;

export const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Pendente",     cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  active:    { label: "Ativa",        cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  overdue:   { label: "Inadimplente", cls: "bg-orange-500/15 text-orange-600 border-orange-500/30" },
  suspended: { label: "Suspensa",     cls: "bg-red-500/15 text-red-600 border-red-500/30" },
  churned:   { label: "Cancelada",    cls: "bg-muted text-muted-foreground border-border" },
};

export const ADHESION_LABEL: Record<string, { label: string; cls: string }> = {
  pending: { label: "Aguardando", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  paid:    { label: "Paga",       cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  waived:  { label: "Isenta",     cls: "bg-muted text-muted-foreground border-border" },
};
