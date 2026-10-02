import { AlertCircle, Box, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

export const money = (cents: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(cents / 100);
export const formatAxisMoney = (cents: number) => {
  if (!Number.isFinite(cents) || cents === 0) return "$0";
  const pesos = cents / 100;
  if (pesos >= 1_000_000)
    return `$${(pesos / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (pesos >= 1_000) return `$${Math.round(pesos / 1_000)}k`;
  return `$${Math.round(pesos)}`;
};
export const day = (value: string | Date) => {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, dayNum] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(
      new Date(year, month - 1, dayNum)
    );
  }
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(
    new Date(value)
  );
};
export const datetime = (value: string | Date) =>
  new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="header-action">{action}</div>}
    </div>
  );
}

export function LoadingPanel({ rows = 4 }: { rows?: number }) {
  return (
    <div className="loading-panel" aria-label="Cargando información">
      <div className="skeleton-title" />
      {Array.from({ length: rows }).map((_, index) => (
        <div className="skeleton-row" key={index} />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Box size={28} />
      </span>
      <h3>{title}</h3>
      <p>{detail}</p>
      {action}
    </div>
  );
}

export function ErrorPanel({
  message,
  retry,
  title,
}: {
  message: string;
  retry?: () => void;
  title?: string;
}) {
  return (
    <div className="error-panel">
      <AlertCircle size={20} />
      <div>
        <b>{title ?? "No se pudo cargar esta información"}</b>
        <p>{message}</p>
      </div>
      {retry && (
        <button className="text-button" onClick={retry}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function SubmitButton({
  pending,
  children,
  className = "button-primary",
}: {
  pending?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button className={className} type="submit" disabled={pending}>
      {pending && <LoaderCircle className="spin" size={16} />}
      {children}
    </button>
  );
}

export function StockBadge({
  quantity,
  threshold,
}: {
  quantity: number;
  threshold: number;
}) {
  const critical = quantity === 0;
  const low = quantity > 0 && quantity <= threshold;
  return (
    <span
      className={`stock-badge ${critical ? "stock-critical" : low ? "stock-low" : "stock-good"}`}
    >
      {critical ? "Sin stock" : low ? "Stock bajo" : "Disponible"}
    </span>
  );
}

export function Field({
  label,
  error,
  hint,
  children,
  className = "",
  htmlFor,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <label className={`field ${className}`.trim()} htmlFor={htmlFor}>
      <span>{label}</span>
      {children}
      {hint && <small className="field-hint">{hint}</small>}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

