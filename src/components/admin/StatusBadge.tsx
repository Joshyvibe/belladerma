import { STATUS_LABELS } from "@/lib/format";

const TONE = {
  ok: "bg-mint text-green-deep", bad: "bg-red-50 text-danger", info: "bg-sky-50 text-sky-800", wait: "bg-gold-soft text-gold-ink",
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, tone: "info" as const };
  return <span className={`chip whitespace-nowrap ${TONE[s.tone]}`}>{s.label}</span>;
}
