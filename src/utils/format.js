export function formatCurrency(value) {
  const n = Number(value) || 0;
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(iso) {
  if (!iso) return "";
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}
