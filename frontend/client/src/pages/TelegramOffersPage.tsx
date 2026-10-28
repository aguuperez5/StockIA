import {
  AlertTriangle,
  Archive,
  ArrowUpDown,
  Calendar,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Flame,
  Gift,
  Link2,
  MessageCircle,
  Package,
  Percent,
  Phone,
  Plus,
  RotateCcw,
  Save,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Tag,
  Trash2,
  TrendingDown,
  UserCheck,
  Users,
  Wand2,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  EmptyState,
  ErrorPanel,
  LoadingPanel,
  PageHeader,
} from "@/components/StockUI";
import {
  TELEGRAM_STATUSES,
  customerService,
  telegramService,
  type Customer,
  type TelegramOffer,
  type TelegramOfferInput,
} from "@/services/backlog";
import { productService, type Product } from "@/services/products";

const STATUS_META: Record<
  string,
  {
    tone: string;
    label: string;
    hint: string;
    accent: string;
    stepIndex: number;
  }
> = {
  Borrador: {
    tone: "status-draft",
    label: "Borrador",
    hint: "Oferta en diseño. Podés editar productos, descuentos y vigencia.",
    accent: "draft",
    stepIndex: 0,
  },
  "Lista para enviar": {
    tone: "status-ready",
    label: "Activa para enviar",
    hint: "Oferta validada y lista para compartir por WhatsApp mediante links wa.me.",
    accent: "ready",
    stepIndex: 1,
  },
  Enviada: {
    tone: "status-sent",
    label: "Compartida",
    hint: "Oferta ya compartida por WhatsApp. Podés seguir generando links wa.me o duplicarla.",
    accent: "sent",
    stepIndex: 2,
  },
  Archivada: {
    tone: "status-archived",
    label: "Archivada",
    hint: "Guardada como referencia histórica. Podés reabrirla como borrador o duplicarla.",
    accent: "archived",
    stepIndex: 3,
  },
  Cancelada: {
    tone: "status-cancelled",
    label: "Cancelada",
    hint: "Oferta descartada. Podés reabrirla como borrador o eliminarla.",
    accent: "cancelled",
    stepIndex: 3,
  },
};

const MESSAGE_TEMPLATES = [
  {
    id: "flash",
    label: "Oferta relámpago",
    icon: Zap,
    title: "Oferta Relámpago",
    discount: 15,
    message:
      "¡Hola *{{nombre}}*!\nAprovechá esta *oferta relámpago* con *{{descuento}}*:\n\n{{productos}}\n\n{{vigencia}}\n_Respondé a este mensaje y te separamos el pedido._",
  },
  {
    id: "combo",
    label: "Combo ahorro",
    icon: Gift,
    title: "Combo Ahorro Mayorista",
    discount: 20,
    message:
      "¡Hola *{{nombre}}*!\nArmamos este *combo ahorro* con *{{descuento}}* para tu reposición:\n\n{{productos}}\n\n{{vigencia}}\n_Indicá las cantidades deseadas para prepararlo._",
  },
  {
    id: "liquidacion",
    label: "Liquidación",
    icon: Flame,
    title: "Liquidación de Stock",
    discount: 25,
    message:
      "¡Hola *{{nombre}}*!\n*Liquidación de stock* con *{{descuento}}* (unidades limitadas):\n\n{{productos}}\n\n{{vigencia}}\n_Pedí antes de que se agote el stock._",
  },
  {
    id: "fidelidad",
    label: "Clientes frecuentes",
    icon: Sparkles,
    title: "Beneficio Cliente Frecuente",
    discount: 10,
    message:
      "¡Hola *{{nombre}}*!\nPor elegirnos siempre, tenés *{{descuento}}* preferencial en tu compra:\n\n{{productos}}\n\n{{vigencia}}\n_Avisanos qué sumamos a tu próximo envío._",
  },
];

const PLACEHOLDER_TOKENS = [
  { token: "{{nombre}}", label: "Nombre", sample: "Laura" },
  { token: "{{productos}}", label: "Productos", sample: "- Producto: $..." },
  { token: "{{descuento}}", label: "% OFF", sample: "15% OFF" },
  { token: "{{vigencia}}", label: "Vigencia", sample: "Válido hasta..." },
];

type SortOption = "recent" | "savings" | "expiring" | "products";
type MainTab = "offers" | "whatsapp";

/**
 * Limpia y normaliza texto para WhatsApp:
 * - Elimina emojis y pictogramas de todos los planos Unicode para evitar
 *   que aparezcan como signo de pregunta (?) al abrir WhatsApp Web o Desktop.
 * - Reemplaza viñetas decorativas (▸, •, 🔹) por '-' estándar, que WhatsApp formatea nativamente como lista.
 * - Reemplaza flechas decorativas (➜, →) por '> ' o texto claro.
 * - Reemplaza divisores decorativos (━, ─, ═) por líneas estándar ASCII (---).
 * - Conserva texto alfanumérico, puntuación estándar, caracteres en español (á, é, í, ó, ú, ñ, ¿, ¡)
 *   y formato markdown nativo de WhatsApp (*negrita*, _cursiva_, ~tachado~).
 */
export function sanitizeWhatsAppText(text?: string | null): string {
  if (!text) return "";
  return String(text)
    .replace(/[━─═―—]{3,}/g, "---")
    .replaceAll("▸", "-")
    .replaceAll("🔹", "-")
    .replaceAll("•", "-")
    .replaceAll("✦", "")
    .replaceAll("➜", ">")
    .replaceAll("→", ">")
    .replaceAll("\uFFFD", "")
    .replaceAll("\u00A0", " ")
    .replaceAll("\uFE0F", "")
    .replaceAll("\uFE0E", "")
    .replaceAll("\u200D", "")
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "")
    .replace(/[\u2300-\u23FF\u25A0-\u25FF\u2600-\u27BF\u2B00-\u2BFF]/g, "")
    .replace(/[\uD800-\uDFFF]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/^[ \t]+/gm, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function fmtArs(n?: number | null) {
  if (n === undefined || n === null || Number.isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(n));
}

function parseLocalDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function fmtShortDate(iso?: string | null) {
  const local = parseLocalDate(iso);
  if (!local) return null;
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(local);
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function toDateInputValue(iso?: string | null) {
  const local = parseLocalDate(iso);
  if (!local) return "";
  const yyyy = local.getFullYear();
  const mm = String(local.getMonth() + 1).padStart(2, "0");
  const dd = String(local.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysInputValue(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Normaliza un número telefónico para enlaces oficiales https://wa.me/
 * sin requerir ninguna API externa.
 */
export function normalizeWhatsAppPhone(raw?: string | null): string {
  if (!raw) return "";
  let digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) {
    digits = `549${digits}`;
  }
  return digits.length >= 7 && digits.length <= 15 ? digits : "";
}

/**
 * Construye el link oficial wa.me con el mensaje codificado.
 */
export function buildWaMeLink(
  phone: string | null | undefined,
  message: string
): string {
  const cleanPhone = normalizeWhatsAppPhone(phone);
  const encoded = encodeURIComponent(sanitizeWhatsAppText(message).trim());
  return cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encoded}`
    : `https://api.whatsapp.com/send?text=${encoded}`;
}

function extractCustomerPhone(
  customer?: { phone?: string | null; contact?: string } | null
): string {
  if (!customer) return "";
  if (customer.phone && customer.phone.trim()) return customer.phone.trim();
  const contactDigits = (customer.contact || "").replace(/\D/g, "");
  if (contactDigits.length >= 7) return (customer.contact || "").trim();
  return "";
}

function computeEffectiveItemPrice(
  basePrice: number,
  explicitOfferPrice: number | null | undefined,
  discountPercent: number | null | undefined
) {
  if (
    explicitOfferPrice !== null &&
    explicitOfferPrice !== undefined &&
    Number.isFinite(Number(explicitOfferPrice)) &&
    Number(explicitOfferPrice) > 0
  ) {
    return Number(explicitOfferPrice);
  }
  const pct = Number(discountPercent);
  if (Number.isFinite(pct) && pct > 0 && pct <= 90) {
    return Math.round(basePrice * (1 - pct / 100));
  }
  return basePrice;
}

function buildLocalPreview({
  baseMessage,
  customerName,
  products,
  discountPercent,
  validUntil,
}: {
  baseMessage: string;
  customerName?: string;
  products: Array<{ name: string; price: number; offerPrice?: number | null }>;
  discountPercent?: number | null;
  validUntil?: string | null;
}) {
  const pct =
    discountPercent && discountPercent > 0 && discountPercent <= 90
      ? discountPercent
      : null;
  const raw = sanitizeWhatsAppText(baseMessage || "");
  const hasProducts = raw.includes("{{productos}}");
  const hasVigencia = raw.includes("{{vigencia}}");
  const hasDescuento = raw.includes("{{descuento}}");

  const lines = products.map(p => {
    const cleanName = sanitizeWhatsAppText(p.name);
    if (p.offerPrice !== null && p.offerPrice !== undefined) {
      return `- *${cleanName}*: *${fmtArs(p.offerPrice)}* _(antes ${fmtArs(p.price)})_`;
    }
    if (pct) {
      const withDisc = Math.round(p.price * (1 - pct / 100));
      return hasDescuento
        ? `- *${cleanName}*: *${fmtArs(withDisc)}* _(antes ${fmtArs(p.price)})_`
        : `- *${cleanName}*: *${fmtArs(withDisc)}* _(-${pct}%)_`;
    }
    return `- *${cleanName}*: *${fmtArs(p.price)}*`;
  });

  const vigenciaText = validUntil
    ? `Válido hasta el ${fmtShortDate(validUntil) ?? validUntil}`
    : "Por tiempo limitado";

  let text = raw
    .replaceAll("{{vigencia}}.", "{{vigencia}}")
    .replaceAll("{{nombre}}", sanitizeWhatsAppText(customerName) || "cliente")
    .replaceAll("{{productos}}", lines.join("\n"))
    .replaceAll("{{descuento}}", pct ? `${pct}% OFF` : "precio especial")
    .replaceAll("{{vigencia}}", vigenciaText);

  if (!hasProducts && lines.length) {
    text = `${text}\n\n${lines.join("\n")}`;
  }
  if (!hasVigencia && validUntil) {
    text += `\n\n${vigenciaText}`;
  }
  return sanitizeWhatsAppText(text).trim();
}

export function buildSingleOfferPreview(
  offer: TelegramOffer,
  customerName?: string | null,
  preserveFullName = false
) {
  const cleanName = customerName?.trim();
  return buildLocalPreview({
    baseMessage: offer.message,
    customerName: cleanName
      ? preserveFullName
        ? cleanName
        : cleanName.split(" ")[0]
      : "cliente",
    products: offer.items
      .filter(i => !i.missing)
      .map(i => ({
        name: i.name || `#${i.productId}`,
        price: i.price ?? 0,
        offerPrice: i.offerPrice ?? null,
      })),
    discountPercent: offer.discountPercent ?? null,
    validUntil: offer.validUntil ?? null,
  });
}

export function buildOffersWhatsAppMessage(
  selectedOffers: TelegramOffer[],
  customerName?: string | null,
  preserveFullName = false
) {
  if (selectedOffers.length <= 1) {
    return selectedOffers
      .map(offer =>
        buildSingleOfferPreview(offer, customerName, preserveFullName)
      )
      .join("\n\n");
  }

  return selectedOffers
    .map((offer, idx) => {
      let block = buildSingleOfferPreview(
        offer,
        customerName,
        preserveFullName
      );
      if (idx > 0) {
        block = block
          .replace(/^¡?Hola\s+[^!\n,:]+[!,:]\s*/i, "")
          .trim();
      }
      if (idx < selectedOffers.length - 1) {
        block = block
          .replace(
            /\n?>?\s*_?¡?(?:Respondé|Escribinos|Indicá|Pedí|Avisanos)[^\n]*$/i,
            ""
          )
          .trim();
      }
      const cleanTitle = sanitizeWhatsAppText(offer.title).trim();
      if (
        cleanTitle &&
        !block.toLowerCase().includes(cleanTitle.toLowerCase())
      ) {
        const formattedTitle = `*${cleanTitle}*`;
        if (idx === 0) {
          const firstBreak = block.indexOf("\n");
          if (firstBreak !== -1 && /^¡?Hola/i.test(block)) {
            block = `${block.slice(0, firstBreak)}\n\n${formattedTitle}\n${block.slice(firstBreak + 1).trimStart()}`;
          } else {
            block = `${formattedTitle}\n${block}`;
          }
        } else {
          block = `${formattedTitle}\n${block}`;
        }
      }
      return block;
    })
    .join("\n\n------------------------------\n\n");
}

export default function TelegramOffersPage() {
  const [mainTab, setMainTab] = useState<MainTab>("offers");
  const [offers, setOffers] = useState<TelegramOffer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  // Modales separados:
  // 1) Crear / Editar Oferta (solo datos de la oferta)
  const [editing, setEditing] = useState<TelegramOffer | null>(null);
  const [creating, setCreating] = useState(false);
  // 2) Ver Detalle de la Oferta
  const [detailOffer, setDetailOffer] = useState<TelegramOffer | null>(null);
  // 3) Modal de Envío por WhatsApp (wa.me)
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  // Ofertas del catálogo seleccionadas para enviar por WhatsApp (una, varias o todas)
  const [selectedOfferIds, setSelectedOfferIds] = useState<number[]>([]);
  // Pestaña activa dentro de cada tarjeta del catálogo ("preview" | "products")
  const [cardTabs, setCardTabs] = useState<Record<number, "preview" | "products">>({});

  const loadOffers = useCallback(async () => {
    try {
      const r = await telegramService.list({});
      setOffers(r.items);
      setError("");
    } catch (e) {
      setError((e as Error).message || "No pudimos cargar las ofertas.");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      telegramService.list({}),
      productService.list("", "Todas"),
      customerService.list(""),
    ])
      .then(([o, p, c]) => {
        setOffers(o.items);
        setProducts(p.items);
        setCustomers(c.items);
        if (o.items.length > 0) {
          setSelectedOfferIds(o.items.map(it => it.id));
        }
      })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  // Sincronizar modales abiertos y selección cuando cambia la lista de ofertas
  useEffect(() => {
    if (detailOffer) {
      const fresh = offers.find(o => o.id === detailOffer.id);
      if (fresh) setDetailOffer(fresh);
    }
    setSelectedOfferIds(prev => {
      const validIds = prev.filter(id => offers.some(o => o.id === id));
      if (validIds.length > 0) return validIds;
      return offers.map(o => o.id);
    });
  }, [offers, detailOffer]);

  const counts = useMemo<Record<string, number>>(() => {
    const by: Record<string, number> = { total: offers.length };
    let totalPortfolioSavings = 0;
    let withWarnings = 0;
    for (const s of TELEGRAM_STATUSES) by[s] = 0;
    for (const o of offers) {
      by[o.status] = (by[o.status] || 0) + 1;
      if (o.totalSavings && o.status !== "Cancelada") {
        totalPortfolioSavings += o.totalSavings;
      }
      if ((o.warnings?.length ?? 0) > 0) {
        withWarnings += 1;
      }
    }
    return {
      ...by,
      totalPortfolioSavings,
      withWarnings,
      readyAndDraft: (by["Borrador"] || 0) + (by["Lista para enviar"] || 0),
    };
  }, [offers]);

  const filteredOffers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = offers.filter(offer => {
      if (statusFilter && offer.status !== statusFilter) return false;
      if (onlyAlerts && (offer.warnings?.length ?? 0) === 0) return false;
      if (q) {
        const inTitle = (offer.title || "").toLowerCase().includes(q);
        const inMsg = (offer.message || "").toLowerCase().includes(q);
        const inProducts = offer.items.some(
          it =>
            (it.name || "").toLowerCase().includes(q) ||
            (it.sku || "").toLowerCase().includes(q)
        );
        if (!inTitle && !inMsg && !inProducts) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "savings") {
        return (b.totalSavings ?? 0) - (a.totalSavings ?? 0);
      }
      if (sortBy === "products") {
        return b.items.length - a.items.length;
      }
      if (sortBy === "expiring") {
        const da = a.validUntil
          ? new Date(a.validUntil).getTime()
          : Number.MAX_SAFE_INTEGER;
        const db = b.validUntil
          ? new Date(b.validUntil).getTime()
          : Number.MAX_SAFE_INTEGER;
        return da - db;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [offers, statusFilter, onlyAlerts, search, sortBy]);

  const handleTransition = async (
    offer: TelegramOffer,
    next: string,
    customerIds?: number[]
  ) => {
    setBusyId(offer.id);
    try {
      const res = await telegramService.updateStatus(
        offer.id,
        next,
        customerIds
      );
      toast.success(res.message || `Oferta marcada como "${next}".`);
      await loadOffers();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkOffersSent = async (
    targetOffers: TelegramOffer[],
    sentCustomerIds: number[]
  ) => {
    if (targetOffers.length === 0) return;
    setBusyId(targetOffers[0].id);
    try {
      for (const offer of targetOffers) {
        if (offer.status === "Cancelada" || offer.status === "Archivada") {
          continue;
        }
        if (offer.status === "Borrador") {
          await telegramService.updateStatus(offer.id, "Lista para enviar");
        }
        const mergedCustomerIds = Array.from(
          new Set([...(offer.customerIds || []), ...sentCustomerIds])
        );
        await telegramService.updateStatus(
          offer.id,
          "Enviada",
          mergedCustomerIds
        );
      }
      toast.success(
        targetOffers.length === 1
          ? `Oferta "${targetOffers[0].title || `#${targetOffers[0].id}`}" marcada como compartida.`
          : `${targetOffers.length} ofertas del catálogo marcadas como compartidas.`
      );
      await loadOffers();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDuplicate = async (offer: TelegramOffer) => {
    setBusyId(offer.id);
    try {
      const r = await telegramService.duplicate(offer.id);
      toast.success("Oferta duplicada como borrador.");
      await loadOffers();
      if (r.item) setEditing(r.item);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (offer: TelegramOffer) => {
    if (
      !window.confirm(
        `¿Eliminar la oferta "${offer.title || `#${offer.id}`}"? Esta acción no se puede deshacer.`
      )
    )
      return;
    setBusyId(offer.id);
    try {
      await telegramService.remove(offer.id);
      toast.success("Oferta eliminada.");
      if (detailOffer?.id === offer.id) setDetailOffer(null);
      await loadOffers();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleCopyQuickWaMe = async (targetOffers: TelegramOffer[]) => {
    if (targetOffers.length === 0) return;
    const previewText = buildOffersWhatsAppMessage(targetOffers, "cliente");
    const link = buildWaMeLink(null, previewText);
    try {
      await navigator.clipboard.writeText(link);
      toast.success(
        targetOffers.length === 1
          ? "Link wa.me de la oferta copiado al portapapeles."
          : `Link wa.me con ${targetOffers.length} ofertas copiado al portapapeles.`
      );
    } catch {
      toast.error("No se pudo copiar el link.");
    }
  };

  const toggleOfferSelection = (offerId: number) => {
    setSelectedOfferIds(prev => {
      if (prev.includes(offerId)) {
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== offerId);
      }
      return [...prev, offerId];
    });
  };

  const clearAllFilters = () => {
    setStatusFilter("");
    setOnlyAlerts(false);
    setSearch("");
    setSortBy("recent");
  };

  const hasActiveFilters =
    Boolean(statusFilter) ||
    onlyAlerts ||
    Boolean(search.trim()) ||
    sortBy !== "recent";

  const selectedDispatchOffers = useMemo(() => {
    const picked = offers.filter(o => selectedOfferIds.includes(o.id));
    return picked.length > 0 ? picked : offers;
  }, [offers, selectedOfferIds]);

  return (
    <>
      <PageHeader
        eyebrow="Promociones comerciales · Envíos vía wa.me"
        title="Ofertas y Envíos por WhatsApp"
        description="Administrá tus promociones en el catálogo y compartí una, varias o todas por WhatsApp."
        action={
          <div className="telegram-header-actions">
            <button
              type="button"
              className="button-primary"
              onClick={() => setCreating(true)}
            >
              <Plus size={16} />
              <span>Nueva oferta</span>
            </button>
          </div>
        }
      />

      {error && <ErrorPanel message={error} retry={() => void loadOffers()} />}

      {/* ─── Conmutador Principal: 1. Catálogo de Ofertas | 2. Envíos por WhatsApp (wa.me) ─── */}
      <div
        className="offers-module-switcher"
        role="tablist"
        aria-label="Módulos de ofertas y envíos"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mainTab === "offers"}
          className={`offers-module-tab ${mainTab === "offers" ? "is-active" : ""}`}
          onClick={() => setMainTab("offers")}
        >
          <span className="offers-module-tab-icon">
            <Tag size={18} />
          </span>
          <div className="offers-module-tab-text">
            <strong>1. Catálogo de Ofertas</strong>
            <small>
              Creá y administrá las ofertas del catálogo (productos, descuentos y vigencia)
            </small>
          </div>
          <span className="offers-module-badge">{offers.length}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mainTab === "whatsapp"}
          className={`offers-module-tab offers-module-tab-wa ${mainTab === "whatsapp" ? "is-active" : ""}`}
          onClick={() => setMainTab("whatsapp")}
        >
          <span className="offers-module-tab-icon whatsapp">
            <MessageCircle size={18} />
          </span>
          <div className="offers-module-tab-text">
            <strong>2. Envíos por WhatsApp (wa.me)</strong>
            <small>
              Enviá exactamente una, varias o todas las ofertas del catálogo a clientes o grupos
            </small>
          </div>
          <span className="offers-module-badge whatsapp">
            {selectedDispatchOffers.length === offers.length && offers.length > 0
              ? `Todas (${offers.length})`
              : `${selectedDispatchOffers.length} de ${offers.length}`}
          </span>
        </button>
      </div>

      {mainTab === "offers" ? (
        <>
          {/* ─── KPI Strip Ejecutivo ─── */}
          <section className="telegram-kpi-grid" aria-label="Resumen de ofertas">
            <article
              className={`telegram-kpi-card ${statusFilter === "" && !onlyAlerts ? "is-selected" : ""}`}
              onClick={clearAllFilters}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") clearAllFilters();
              }}
            >
              <div className="telegram-kpi-icon brand">
                <Tag size={20} />
              </div>
              <div className="telegram-kpi-body">
                <span>Ofertas creadas</span>
                <strong>{counts.total ?? 0}</strong>
                <small>
                  {counts["Lista para enviar"] || 0} activa
                  {(counts["Lista para enviar"] || 0) === 1 ? "" : "s"} para enviar
                </small>
              </div>
            </article>

            <article
              className={`telegram-kpi-card ${statusFilter === "Borrador" ? "is-selected" : ""}`}
              onClick={() => {
                setOnlyAlerts(false);
                setStatusFilter(statusFilter === "Borrador" ? "" : "Borrador");
              }}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") {
                  setOnlyAlerts(false);
                  setStatusFilter(statusFilter === "Borrador" ? "" : "Borrador");
                }
              }}
            >
              <div className="telegram-kpi-icon info">
                <Clock size={20} />
              </div>
              <div className="telegram-kpi-body">
                <span>En preparación</span>
                <strong>{counts.readyAndDraft}</strong>
                <small>
                  {counts["Borrador"] || 0} borrador ·{" "}
                  {counts["Lista para enviar"] || 0} activa
                  {(counts["Lista para enviar"] || 0) === 1 ? "" : "s"}
                </small>
              </div>
            </article>

            <article
              className={`telegram-kpi-card ${statusFilter === "Enviada" ? "is-selected" : ""}`}
              onClick={() => {
                setOnlyAlerts(false);
                setStatusFilter(statusFilter === "Enviada" ? "" : "Enviada");
              }}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") {
                  setOnlyAlerts(false);
                  setStatusFilter(statusFilter === "Enviada" ? "" : "Enviada");
                }
              }}
            >
              <div className="telegram-kpi-icon success">
                <MessageCircle size={20} />
              </div>
              <div className="telegram-kpi-body">
                <span>Compartidas por WhatsApp</span>
                <strong>{counts["Enviada"] ?? 0}</strong>
                <small>
                  {counts["Archivada"] || 0} archivada
                  {(counts["Archivada"] || 0) === 1 ? "" : "s"}
                </small>
              </div>
            </article>

            <article
              className={`telegram-kpi-card ${onlyAlerts ? "is-selected" : ""}`}
              onClick={() => {
                setStatusFilter("");
                setOnlyAlerts(prev => !prev);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") {
                  setStatusFilter("");
                  setOnlyAlerts(prev => !prev);
                }
              }}
            >
              <div
                className={`telegram-kpi-icon ${counts.withWarnings > 0 ? "warning" : "emerald"}`}
              >
                {counts.withWarnings > 0 ? (
                  <AlertTriangle size={20} />
                ) : (
                  <TrendingDown size={20} />
                )}
              </div>
              <div className="telegram-kpi-body">
                <span>
                  {counts.withWarnings > 0
                    ? "Atención de catálogo"
                    : "Ahorro en cartera"}
                </span>
                <strong>
                  {counts.withWarnings > 0
                    ? `${counts.withWarnings} alerta${counts.withWarnings === 1 ? "" : "s"}`
                    : fmtArs(counts.totalPortfolioSavings)}
                </strong>
                <small>
                  {counts.withWarnings > 0
                    ? "Ofertas con stock agotado o vencidas"
                    : "Suma de descuentos por unidad"}
                </small>
              </div>
            </article>
          </section>

          {/* ─── Pestañas rápidas por Estado ─── */}
          <div className="telegram-status-tabs" role="tablist" aria-label="Filtrar por estado">
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === ""}
              className={`telegram-status-tab ${statusFilter === "" ? "is-active" : ""}`}
              onClick={() => setStatusFilter("")}
            >
              <span>Todas</span>
              <span className="tab-count">{counts.total ?? 0}</span>
            </button>
            {TELEGRAM_STATUSES.map(s => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={statusFilter === s}
                className={`telegram-status-tab ${statusFilter === s ? "is-active" : ""}`}
                onClick={() => setStatusFilter(statusFilter === s ? "" : s)}
              >
                <span
                  className={`tab-dot ${STATUS_META[s]?.accent ?? "draft"}`}
                />
                <span>{STATUS_META[s]?.label ?? s}</span>
                <span className="tab-count">{counts[s] ?? 0}</span>
              </button>
            ))}
          </div>

          {/* ─── Barra de Búsqueda, Selección de Envío y Orden ─── */}
          <div className="filter-bar telegram-toolbar">
            <label className="search-field telegram-search">
              <Search size={16} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar oferta por título, mensaje, producto o código SKU..."
              />
              {search && (
                <button
                  type="button"
                  className="telegram-search-clear"
                  onClick={() => setSearch("")}
                  aria-label="Limpiar búsqueda"
                >
                  <X size={14} />
                </button>
              )}
            </label>

            <div className="telegram-toolbar-controls">
              {offers.length > 0 && (
                <div className="catalog-wa-selection-bar">
                  <button
                    type="button"
                    className={`button-ghost catalog-select-all-btn ${selectedDispatchOffers.length === offers.length ? "is-active" : ""}`}
                    onClick={() => setSelectedOfferIds(offers.map(o => o.id))}
                    title="Seleccionar todas las ofertas del catálogo para enviar por WhatsApp"
                  >
                    <Check size={14} />
                    <span>Todas ({offers.length})</span>
                  </button>
                  <button
                    type="button"
                    className="button-whatsapp"
                    onClick={() => setWhatsAppModalOpen(true)}
                    title="Enviar por WhatsApp las ofertas seleccionadas del catálogo"
                  >
                    <MessageCircle size={15} />
                    <span>
                      {selectedDispatchOffers.length === offers.length &&
                      offers.length > 1
                        ? `Enviar todas por WhatsApp (${offers.length})`
                        : selectedDispatchOffers.length === 1
                          ? "Enviar 1 oferta por WhatsApp"
                          : `Enviar ${selectedDispatchOffers.length} ofertas por WhatsApp`}
                    </span>
                  </button>
                </div>
              )}

              <label className="telegram-select-pill" title="Ordenar ofertas">
                <ArrowUpDown size={14} />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortOption)}
                  aria-label="Ordenar ofertas"
                >
                  <option value="recent">Más recientes</option>
                  <option value="savings">Mayor ahorro ($)</option>
                  <option value="expiring">Próximas a vencer</option>
                  <option value="products">Más productos</option>
                </select>
              </label>

              {hasActiveFilters && (
                <button
                  type="button"
                  className="button-ghost telegram-reset-btn"
                  onClick={clearAllFilters}
                >
                  <RotateCcw size={14} />
                  <span>Limpiar filtros</span>
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <LoadingPanel />
          ) : filteredOffers.length === 0 ? (
            <EmptyState
              title={
                offers.length === 0
                  ? "Todavía no creaste ninguna oferta"
                  : "Sin resultados para los filtros aplicados"
              }
              detail={
                offers.length === 0
                  ? "Creá tu primera oferta con productos, porcentaje de descuento o precios especiales. Después vas a poder enviar una, varias o todas las ofertas por WhatsApp."
                  : "Probá cambiando el término de búsqueda o restableciendo los filtros activos."
              }
              action={
                offers.length === 0 ? (
                  <button
                    className="button-primary"
                    onClick={() => setCreating(true)}
                  >
                    <Plus size={16} />
                    <span>Crear primera oferta</span>
                  </button>
                ) : (
                  <button
                    className="button-secondary"
                    onClick={clearAllFilters}
                  >
                    <RotateCcw size={15} />
                    <span>Ver todas las ofertas</span>
                  </button>
                )
              }
            />
          ) : (
            <div className="telegram-grid">
              {filteredOffers.map(offer => {
                const meta =
                  STATUS_META[offer.status] || STATUS_META["Borrador"];
                const isBusy = busyId === offer.id;
                const isSelectedForWa = selectedOfferIds.includes(offer.id);
                const activeCardTab = cardTabs[offer.id] || "preview";
                const previewSnippet = buildSingleOfferPreview(
                  offer,
                  "cliente"
                );

                return (
                  <article
                    key={offer.id}
                    className={`telegram-card accent-${meta.accent} ${isSelectedForWa ? "is-wa-selected" : ""}`}
                  >
                    <header className="telegram-card-head">
                      <div className="telegram-card-title">
                        <label
                          className="wa-card-select-check"
                          title="Incluir esta oferta en el envío por WhatsApp"
                        >
                          <input
                            type="checkbox"
                            checked={isSelectedForWa}
                            onChange={() => toggleOfferSelection(offer.id)}
                            aria-label={`Seleccionar ${offer.title || `Oferta #${offer.id}`} para WhatsApp`}
                          />
                        </label>
                        <div className={`telegram-avatar ${meta.accent}`}>
                          <Tag size={17} />
                        </div>
                        <div className="telegram-title-block">
                          <div className="telegram-title-row">
                            <h3 title={offer.title || `Oferta #${offer.id}`}>
                              {sanitizeWhatsAppText(offer.title) ||
                                `Oferta #${offer.id}`}
                            </h3>
                            <span className="telegram-id-chip">
                              #{offer.id}
                            </span>
                          </div>
                          <div className="telegram-sub-row">
                            <span className={`status-pill ${meta.tone}`}>
                              {meta.label}
                            </span>
                            {offer.validUntil ? (
                              <span
                                className={`telegram-date-caption ${offer.expired ? "text-warn" : ""}`}
                              >
                                {offer.expired
                                  ? `Venció ${fmtShortDate(offer.validUntil)}`
                                  : `Hasta ${fmtShortDate(offer.validUntil)}`}
                              </span>
                            ) : (
                              <span className="telegram-date-caption">
                                Sin vencimiento
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {(offer.discountPercent ||
                        (offer.totalSavings ?? 0) > 0) && (
                        <div className="telegram-discount-badge">
                          {offer.discountPercent ? (
                            <strong>-{offer.discountPercent}%</strong>
                          ) : (
                            <strong>Oferta</strong>
                          )}
                          {(offer.totalSavings ?? 0) > 0 && (
                            <small>Ahorra {fmtArs(offer.totalSavings)}</small>
                          )}
                        </div>
                      )}
                    </header>

                    {/* ─── Pestañas internas de la tarjeta (Mensaje | Productos) ─── */}
                    <div
                      className="telegram-card-tabs"
                      role="tablist"
                      aria-label="Vista de la tarjeta"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeCardTab === "preview"}
                        className={`telegram-card-tab ${activeCardTab === "preview" ? "is-active" : ""}`}
                        onClick={() =>
                          setCardTabs(prev => ({
                            ...prev,
                            [offer.id]: "preview",
                          }))
                        }
                      >
                        <MessageCircle size={13} />
                        <span>Mensaje WhatsApp</span>
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeCardTab === "products"}
                        className={`telegram-card-tab ${activeCardTab === "products" ? "is-active" : ""}`}
                        onClick={() =>
                          setCardTabs(prev => ({
                            ...prev,
                            [offer.id]: "products",
                          }))
                        }
                      >
                        <Package size={13} />
                        <span>Productos ({offer.items.length})</span>
                        {offer.offerTotal !== undefined && (
                          <b className="card-tab-price">
                            {fmtArs(offer.offerTotal)}
                          </b>
                        )}
                      </button>
                    </div>

                    {activeCardTab === "preview" ? (
                      <div
                        className="telegram-bubble whatsapp-bubble-card"
                        onClick={() => setDetailOffer(offer)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => {
                          if (e.key === "Enter" || e.key === " ")
                            setDetailOffer(offer);
                        }}
                        title="Clic para ver el detalle completo de la oferta"
                      >
                        <div className="telegram-bubble-header">
                          <span className="telegram-bot-tag whatsapp-tag">
                            <MessageCircle size={11} /> Vista previa
                          </span>
                          <span className="telegram-bubble-Action">
                            Ver completo →
                          </span>
                        </div>
                        <p className="telegram-bubble-text">{previewSnippet}</p>
                        <div className="telegram-bubble-footer">
                          {offer.customerCount > 0 && (
                            <span>
                              {offer.customerCount} enviado
                              {offer.customerCount === 1 ? "" : "s"} ·{" "}
                            </span>
                          )}
                          <span>wa.me listo</span>
                          <CheckCheck size={13} className="telegram-checks inline ml-1" />
                        </div>
                      </div>
                    ) : (
                      <div className="telegram-products-strip">
                        <div className="telegram-strip-header">
                          <span>
                            <Package size={13} /> {offer.items.length} producto
                            {offer.items.length === 1 ? "" : "s"} incluido
                            {offer.items.length === 1 ? "" : "s"}
                          </span>
                          {offer.offerTotal !== undefined &&
                            offer.baseTotal !== undefined &&
                            offer.offerTotal < offer.baseTotal && (
                              <span className="telegram-combo-total">
                                Total: <del>{fmtArs(offer.baseTotal)}</del>{" "}
                                <b>{fmtArs(offer.offerTotal)}</b>
                              </span>
                            )}
                        </div>
                        <div className="telegram-product-pills">
                          {offer.items.map(it => {
                            const eff =
                              it.effectivePrice ??
                              computeEffectiveItemPrice(
                                it.price ?? 0,
                                it.offerPrice,
                                offer.discountPercent
                              );
                            const hasDisc =
                              it.price !== undefined && eff < it.price;
                            return (
                              <span
                                key={it.productId}
                                className={`product-pill ${it.missing || (it.stock ?? 0) <= 0 ? "pill-warn" : ""}`}
                                title={
                                  it.missing
                                    ? "Producto eliminado"
                                    : `Stock disponible: ${it.stock ?? 0} u.`
                                }
                              >
                                <span className="product-pill-name">
                                  {it.name || `#${it.productId}`}
                                </span>
                                {it.price !== undefined && (
                                  <span className="product-pill-price">
                                    {hasDisc ? (
                                      <>
                                        <b>{fmtArs(eff)}</b>
                                        <del>{fmtArs(it.price)}</del>
                                      </>
                                    ) : (
                                      <b>{fmtArs(it.price)}</b>
                                    )}
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {offer.warnings && offer.warnings.length > 0 && (
                      <div className="telegram-warnings" role="status">
                        <AlertTriangle size={14} />
                        <span>{offer.warnings.join(" · ")}</span>
                      </div>
                    )}

                    {/* ─── Acciones de la Oferta + Botón de Envío WhatsApp ─── */}
                    <footer className="telegram-card-foot">
                      <div className="telegram-foot-secondary">
                        <button
                          type="button"
                          className="button-ghost"
                          onClick={() => setDetailOffer(offer)}
                          disabled={isBusy}
                          title="Ver detalle de la oferta"
                        >
                          <Eye size={15} />
                          <span>Detalle</span>
                        </button>
                        {offer.canEdit && (
                          <button
                            type="button"
                            className="button-ghost"
                            onClick={() => setEditing(offer)}
                            disabled={isBusy}
                            title="Editar productos, precios o mensaje de la oferta"
                          >
                            <Edit3 size={15} />
                            <span>Editar</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="button-ghost"
                          onClick={() => void handleCopyQuickWaMe([offer])}
                          disabled={isBusy}
                          title="Copiar link wa.me general de esta oferta"
                        >
                          <Link2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="button-ghost"
                          onClick={() => void handleDuplicate(offer)}
                          disabled={isBusy}
                          title="Duplicar oferta como borrador"
                        >
                          <Copy size={15} />
                        </button>
                        {offer.canDelete && (
                          <button
                            type="button"
                            className="button-ghost danger"
                            onClick={() => void handleDelete(offer)}
                            disabled={isBusy}
                            title="Eliminar oferta"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>

                      <div className="telegram-foot-primary">
                        {offer.status === "Borrador" && (
                          <button
                            type="button"
                            className="button-secondary"
                            onClick={() =>
                              void handleTransition(offer, "Lista para enviar")
                            }
                            disabled={isBusy}
                            title="Dejar oferta activa para enviar"
                          >
                            <CheckCircle2 size={15} />
                            <span>Activar</span>
                          </button>
                        )}
                        {offer.status === "Enviada" && (
                          <button
                            type="button"
                            className="button-ghost"
                            onClick={() =>
                              void handleTransition(offer, "Archivada")
                            }
                            disabled={isBusy}
                            title="Archivar oferta"
                          >
                            <Archive size={15} />
                          </button>
                        )}
                        {(offer.status === "Archivada" ||
                          offer.status === "Cancelada") && (
                          <button
                            type="button"
                            className="button-secondary"
                            onClick={() =>
                              void handleTransition(offer, "Borrador")
                            }
                            disabled={isBusy}
                          >
                            <RotateCcw size={15} />
                            <span>Reabrir</span>
                          </button>
                        )}
                        {offer.status !== "Cancelada" && (
                          <button
                            type="button"
                            className="button-whatsapp"
                            onClick={() => {
                              setSelectedOfferIds([offer.id]);
                              setWhatsAppModalOpen(true);
                            }}
                            disabled={isBusy}
                            title="Enviar esta oferta por WhatsApp (links wa.me)"
                          >
                            <MessageCircle size={15} />
                            <span>Enviar</span>
                          </button>
                        )}
                      </div>
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* ─── MÓDULO 2: Centro de Envíos por WhatsApp (una, varias o todas las ofertas del catálogo) ─── */
        <WhatsAppDispatchPanel
          offers={offers}
          selectedOffers={selectedDispatchOffers}
          onChangeSelectedOfferIds={setSelectedOfferIds}
          customers={customers}
          onCustomersChange={setCustomers}
          onCreateOfferClick={() => setCreating(true)}
          onMarkSent={handleMarkOffersSent}
        />
      )}

      {/* ─── Modal 1: Crear / Editar Oferta (SOLO creación/edición de la oferta) ─── */}
      {(creating || editing) && (
        <OfferFormModal
          initial={editing}
          products={products}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={async savedOffer => {
            setCreating(false);
            setEditing(null);
            await loadOffers();
            if (savedOffer) {
              setSelectedOfferIds(prev =>
                prev.includes(savedOffer.id) ? prev : [...prev, savedOffer.id]
              );
            }
          }}
        />
      )}

      {/* ─── Modal 2: Envíos por WhatsApp (una, varias o todas las ofertas del catálogo) ─── */}
      {whatsAppModalOpen && (
        <WhatsAppSendModal
          offers={offers}
          selectedOffers={selectedDispatchOffers}
          onChangeSelectedOfferIds={setSelectedOfferIds}
          customers={customers}
          onCustomersChange={setCustomers}
          onCreateOfferClick={() => setCreating(true)}
          onClose={() => setWhatsAppModalOpen(false)}
          onMarkSent={handleMarkOffersSent}
        />
      )}

      {/* ─── Modal 3: Detalle de la Oferta ─── */}
      {detailOffer && (
        <OfferDetailModal
          offer={detailOffer}
          busy={busyId === detailOffer.id}
          onClose={() => setDetailOffer(null)}
          onEdit={() => {
            const target = detailOffer;
            setDetailOffer(null);
            setEditing(target);
          }}
          onOpenWhatsApp={() => {
            const target = detailOffer;
            setDetailOffer(null);
            setSelectedOfferIds([target.id]);
            setWhatsAppModalOpen(true);
          }}
          onTransition={next => void handleTransition(detailOffer, next)}
          onDuplicate={() => {
            const target = detailOffer;
            setDetailOffer(null);
            void handleDuplicate(target);
          }}
          onDelete={() => void handleDelete(detailOffer)}
        />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * COMPONENTE DE ENVÍOS POR WHATSAPP (wa.me)
 * Envía exactamente una, varias o todas las ofertas creadas en el catálogo,
 * sin diferencias respecto al catálogo.
 * ═══════════════════════════════════════════════════════════════════════════ */

function WhatsAppDispatchPanel({
  offers,
  selectedOffers,
  onChangeSelectedOfferIds,
  customers,
  onCustomersChange,
  onCreateOfferClick,
  onMarkSent,
  inModal = false,
}: {
  offers: TelegramOffer[];
  selectedOffers: TelegramOffer[];
  onChangeSelectedOfferIds: (offerIds: number[]) => void;
  customers: Customer[];
  onCustomersChange: (next: Customer[]) => void;
  onCreateOfferClick?: () => void;
  onMarkSent: (
    targetOffers: TelegramOffer[],
    customerIds: number[]
  ) => Promise<void>;
  inModal?: boolean;
}) {
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState<
    "all" | "withPhone" | "opened"
  >("all");
  // Teléfonos editables por cliente (id -> string)
  const [phoneOverrides, setPhoneOverrides] = useState<Record<number, string>>(
    {}
  );
  const [savingPhoneId, setSavingPhoneId] = useState<number | null>(null);
  // Clientes a los que ya se les abrió el link wa.me
  const [openedCustomerIds, setOpenedCustomerIds] = useState<number[]>([]);
  // Cliente activo en el simulador de la derecha
  const [activeCustomerId, setActiveCustomerId] = useState<number | null>(null);

  // Pestaña activa de destinatario ("customers" | "group" | "manual")
  const [recipientTab, setRecipientTab] = useState<
    "customers" | "group" | "manual"
  >("customers");
  // Pestaña activa del panel simulador derecho ("preview" | "details")
  const [simTab, setSimTab] = useState<"preview" | "details">("preview");
  // Mostrar/ocultar el detalle desplegable de tarjetas de ofertas
  const [showOffersGrid, setShowOffersGrid] = useState(false);

  // Envío rápido manual (sin necesidad de que esté en la agenda)
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [useManualInPreview, setUseManualInPreview] = useState(false);

  // Envío a un Grupo de WhatsApp
  const [groupGreeting, setGroupGreeting] = useState("clientes");
  const [useGroupInPreview, setUseGroupInPreview] = useState(false);

  const [markingSent, setMarkingSent] = useState(false);

  const selectedIdsSet = useMemo(
    () => new Set(selectedOffers.map(o => o.id)),
    [selectedOffers]
  );

  // Inicializar clientes ya enviados en las ofertas seleccionadas
  const selectedKey = useMemo(
    () => selectedOffers.map(o => o.id).join(","),
    [selectedOffers]
  );

  useEffect(() => {
    const unionCustomerIds = Array.from(
      new Set(selectedOffers.flatMap(o => o.customerIds || []))
    );
    setOpenedCustomerIds(unionCustomerIds);
  }, [selectedKey]);

  const getCustomerPhone = useCallback(
    (c: Customer) => {
      if (phoneOverrides[c.id] !== undefined) return phoneOverrides[c.id];
      return extractCustomerPhone(c);
    },
    [phoneOverrides]
  );

  const activeCustomer = useMemo(
    () => customers.find(c => c.id === activeCustomerId) || null,
    [customers, activeCustomerId]
  );

  const buildMessageForCustomer = useCallback(
    (recipientName?: string | null, preserveFullName = false) => {
      if (selectedOffers.length === 0) return "";
      return buildOffersWhatsAppMessage(
        selectedOffers,
        recipientName,
        preserveFullName
      );
    },
    [selectedOffers]
  );

  const groupMessage = useMemo(
    () => buildMessageForCustomer(groupGreeting.trim() || "clientes", true),
    [buildMessageForCustomer, groupGreeting]
  );

  const groupWaMeLink = useMemo(
    () => buildWaMeLink(null, groupMessage),
    [groupMessage]
  );

  const previewTargetName = useGroupInPreview
    ? groupGreeting.trim() || "clientes"
    : useManualInPreview
      ? manualName.trim() || "cliente"
      : activeCustomer
        ? activeCustomer.name
        : "cliente";

  const previewTargetPhone = useGroupInPreview
    ? ""
    : useManualInPreview
      ? manualPhone
      : activeCustomer
        ? getCustomerPhone(activeCustomer)
        : "";

  const generatedMessage = useMemo(
    () => buildMessageForCustomer(previewTargetName, useGroupInPreview),
    [buildMessageForCustomer, previewTargetName, useGroupInPreview]
  );

  const activeWaMeLink = useMemo(
    () => buildWaMeLink(previewTargetPhone, generatedMessage),
    [previewTargetPhone, generatedMessage]
  );

  const generalWaMeLink = useMemo(
    () => buildWaMeLink(null, groupMessage),
    [groupMessage]
  );

  const catalogSelectionTotals = useMemo(() => {
    let totalProducts = 0;
    let totalBase = 0;
    let totalOffer = 0;
    let totalSavings = 0;
    for (const o of selectedOffers) {
      totalProducts += o.items.length;
      totalBase += o.baseTotal ?? 0;
      totalOffer += o.offerTotal ?? o.baseTotal ?? 0;
      totalSavings += o.totalSavings ?? 0;
    }
    return { totalProducts, totalBase, totalOffer, totalSavings };
  }, [selectedOffers]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    return customers.filter(c => {
      const rawPhone = getCustomerPhone(c);
      const clean = normalizeWhatsAppPhone(rawPhone);
      if (customerFilter === "withPhone" && !clean) return false;
      if (customerFilter === "opened" && !openedCustomerIds.includes(c.id))
        return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.contact.toLowerCase().includes(q) ||
        rawPhone.toLowerCase().includes(q)
      );
    });
  }, [
    customers,
    customerSearch,
    customerFilter,
    getCustomerPhone,
    openedCustomerIds,
  ]);

  const handleToggleOffer = (offerId: number) => {
    if (selectedIdsSet.has(offerId)) {
      if (selectedOffers.length <= 1) {
        toast.info("Al menos una oferta del catálogo debe estar seleccionada.");
        return;
      }
      onChangeSelectedOfferIds(
        selectedOffers.filter(o => o.id !== offerId).map(o => o.id)
      );
    } else {
      onChangeSelectedOfferIds([...selectedOffers.map(o => o.id), offerId]);
    }
  };

  const handleSelectAllOffers = () => {
    onChangeSelectedOfferIds(offers.map(o => o.id));
  };

  const handleSelectSingleOffer = (offerId: number) => {
    onChangeSelectedOfferIds([offerId]);
  };

  const handleSaveCustomerPhone = async (customer: Customer) => {
    const newPhone = (phoneOverrides[customer.id] ?? "").trim();
    if (!newPhone) {
      toast.error("Ingresá un número de teléfono válido.");
      return;
    }
    setSavingPhoneId(customer.id);
    try {
      await customerService.update(customer.id, {
        name: customer.name,
        contact: customer.contact,
        email: customer.email ?? null,
        phone: newPhone,
      });
      onCustomersChange(
        customers.map(c =>
          c.id === customer.id ? { ...c, phone: newPhone } : c
        )
      );
      toast.success(`Teléfono guardado en la ficha de ${customer.name}.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingPhoneId(null);
    }
  };

  const markCustomerOpened = (customerId: number) => {
    setOpenedCustomerIds(prev =>
      prev.includes(customerId) ? prev : [...prev, customerId]
    );
  };

  const handleCopyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label);
    } catch {
      toast.error("No se pudo copiar al portapapeles.");
    }
  };

  const selectionLabel =
    offers.length === 0
      ? "0 ofertas en el catálogo"
      : selectedOffers.length === offers.length && offers.length > 1
        ? `Todas las ofertas del catálogo (${offers.length})`
        : selectedOffers.length === 1
          ? `1 oferta del catálogo: ${selectedOffers[0].title || `#${selectedOffers[0].id}`}`
          : `${selectedOffers.length} ofertas del catálogo seleccionadas`;

  return (
    <div className={`wa-dispatch-shell ${inModal ? "in-modal" : ""}`}>
      {/* ─── Selección Compacta de Una, Varias o Todas las Ofertas del Catálogo ─── */}
      <section className="wa-catalog-selector-box">
        <div className="wa-catalog-selector-head">
          <div className="wa-catalog-selector-title">
            <span className="telegram-step-badge whatsapp">
              <Tag size={14} />
            </span>
            <div>
              <h3>Ofertas a enviar: {selectionLabel}</h3>
              <p>
                Seleccioná <strong>una</strong>, <strong>varias</strong> o{" "}
                <strong>todas</strong> las ofertas del catálogo con un clic.
              </p>
            </div>
          </div>

          <div className="wa-catalog-selector-actions">
            {offers.length > 0 && (
              <>
                <button
                  type="button"
                  className={`button-secondary ${selectedOffers.length === 1 ? "is-active" : ""}`}
                  onClick={() => {
                    if (selectedOffers[0]) {
                      handleSelectSingleOffer(selectedOffers[0].id);
                    } else if (offers[0]) {
                      handleSelectSingleOffer(offers[0].id);
                    }
                  }}
                >
                  <span>Una sola (1)</span>
                </button>
                <button
                  type="button"
                  className={`button-secondary ${selectedOffers.length === offers.length ? "is-active" : ""}`}
                  onClick={handleSelectAllOffers}
                >
                  <Check size={14} />
                  <span>Todas ({offers.length})</span>
                </button>
                <button
                  type="button"
                  className="button-ghost"
                  onClick={() => setShowOffersGrid(prev => !prev)}
                >
                  <span className="inline-flex items-center gap-1">
                    {showOffersGrid ? (
                      <>
                        Ocultar detalle <ChevronUp size={13} />
                      </>
                    ) : (
                      <>
                        Ver detalle <ChevronDown size={13} />
                      </>
                    )}
                  </span>
                </button>
              </>
            )}
            {onCreateOfferClick && (
              <button
                type="button"
                className="button-primary"
                onClick={onCreateOfferClick}
              >
                <Plus size={15} />
                <span>Nueva oferta</span>
              </button>
            )}
          </div>
        </div>

        {offers.length === 0 ? (
          <div className="wa-catalog-inline-empty">
            <span>
              Todavía no hay ofertas cargadas. Creá una oferta con productos y
              descuentos para incluirla en tus envíos por WhatsApp (
              <code>wa.me</code>).
            </span>
            {onCreateOfferClick && (
              <button
                type="button"
                className="button-secondary"
                onClick={onCreateOfferClick}
              >
                <Plus size={14} />
                <span>Crear oferta</span>
              </button>
            )}
          </div>
        ) : !showOffersGrid ? (
          /* Píldoras horizontales rápidas para marcar/desmarcar sin ocupar toda la pantalla */
          <div className="wa-offer-quick-pills">
            {offers.map(o => {
              const isChecked = selectedIdsSet.has(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  className={`wa-offer-quick-pill ${isChecked ? "is-selected" : ""}`}
                  onClick={() => handleToggleOffer(o.id)}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    readOnly
                    tabIndex={-1}
                  />
                  <span>
                    {sanitizeWhatsAppText(o.title) || `Oferta #${o.id}`}
                  </span>
                  {o.discountPercent && (
                    <b className="wa-pill-disc">-{o.discountPercent}%</b>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="wa-catalog-offers-grid">
            {offers.map(o => {
              const isChecked = selectedIdsSet.has(o.id);
              const meta = STATUS_META[o.status] || STATUS_META["Borrador"];
              return (
                <div
                  key={o.id}
                  className={`wa-catalog-offer-item ${isChecked ? "is-selected" : ""}`}
                  onClick={() => handleToggleOffer(o.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleToggleOffer(o.id);
                    }
                  }}
                >
                  <div className="wa-catalog-offer-item-top">
                    <label
                      className="wa-catalog-offer-check"
                      onClick={e => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleOffer(o.id)}
                      />
                      <strong>
                        {sanitizeWhatsAppText(o.title) || `Oferta #${o.id}`}
                      </strong>
                    </label>
                    <div className="wa-catalog-offer-badges">
                      <span className={`status-pill ${meta.tone}`}>
                        {meta.label}
                      </span>
                      {o.discountPercent && (
                        <span className="wa-offer-mini-disc">
                          -{o.discountPercent}%
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="wa-catalog-offer-item-meta">
                    <span>
                      <Package size={12} /> {o.items.length} prod.
                    </span>
                    {o.offerTotal !== undefined && (
                      <span>
                        Total: <b>{fmtArs(o.offerTotal)}</b>
                      </span>
                    )}
                    {o.validUntil && (
                      <span>Hasta {fmtShortDate(o.validUntil)}</span>
                    )}
                    {offers.length > 1 && (
                      <button
                        type="button"
                        className="wa-only-this-btn"
                        onClick={e => {
                          e.stopPropagation();
                          handleSelectSingleOffer(o.id);
                        }}
                      >
                        Enviar solo esta
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="wa-dispatch-grid">
        {/* ─── COLUMNA IZQUIERDA: Pestañas de Destinatario (Clientes | Grupo | Número Manual) ─── */}
        <div className="wa-dispatch-left">
          <div
            className="telegram-panel-tabs"
            role="tablist"
            aria-label="Tipo de destinatario de WhatsApp"
          >
            <button
              type="button"
              role="tab"
              aria-selected={recipientTab === "customers"}
              className={`telegram-panel-tab ${recipientTab === "customers" ? "is-active" : ""}`}
              onClick={() => {
                setRecipientTab("customers");
                setUseGroupInPreview(false);
                setUseManualInPreview(false);
              }}
            >
              <UserCheck size={15} />
              <span>1. Clientes registrados ({customers.length})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={recipientTab === "group"}
              className={`telegram-panel-tab ${recipientTab === "group" ? "is-active" : ""}`}
              onClick={() => {
                setRecipientTab("group");
                setUseGroupInPreview(true);
                setUseManualInPreview(false);
              }}
            >
              <Users size={15} />
              <span>2. Grupo de WhatsApp</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={recipientTab === "manual"}
              className={`telegram-panel-tab ${recipientTab === "manual" ? "is-active" : ""}`}
              onClick={() => {
                setRecipientTab("manual");
                setUseManualInPreview(true);
                setUseGroupInPreview(false);
              }}
            >
              <Phone size={15} />
              <span>3. Número manual</span>
            </button>
          </div>

          {/* PESTAÑA 1: Clientes Registrados */}
          {recipientTab === "customers" && (
            <section className="telegram-form-section">
              <div className="telegram-section-head">
                <span className="telegram-step-badge whatsapp">
                  <UserCheck size={14} />
                </span>
                <div>
                  <h3>Enviar a clientes de la cartera ({customers.length})</h3>
                  <p>
                    Hacé clic en un cliente para previsualizar su mensaje
                    personalizado o abrí directamente su chat <code>wa.me</code>.
                  </p>
                </div>
              </div>

              <div className="telegram-catalog-toolbar">
                <label className="search-field">
                  <Search size={15} />
                  <input
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    placeholder="Buscar cliente por nombre, contacto o teléfono..."
                  />
                  {customerSearch && (
                    <button
                      type="button"
                      className="telegram-search-clear"
                      onClick={() => setCustomerSearch("")}
                    >
                      <X size={13} />
                    </button>
                  )}
                </label>
                <div className="telegram-mini-tabs">
                  <button
                    type="button"
                    className={customerFilter === "all" ? "is-active" : ""}
                    onClick={() => setCustomerFilter("all")}
                  >
                    Todos ({customers.length})
                  </button>
                  <button
                    type="button"
                    className={customerFilter === "withPhone" ? "is-active" : ""}
                    onClick={() => setCustomerFilter("withPhone")}
                  >
                    Con teléfono
                  </button>
                  <button
                    type="button"
                    className={customerFilter === "opened" ? "is-active" : ""}
                    onClick={() => setCustomerFilter("opened")}
                  >
                    Enviados ({openedCustomerIds.length})
                  </button>
                </div>
              </div>

              <div className="wa-customer-list">
                {filteredCustomers.length === 0 ? (
                  <p className="muted-empty">
                    No se encontraron clientes con ese criterio.
                  </p>
                ) : (
                  filteredCustomers.map(c => {
                    const rawPhone = getCustomerPhone(c);
                    const cleanPhone = normalizeWhatsAppPhone(rawPhone);
                    const personalizedMsg = buildMessageForCustomer(c.name);
                    const customerWaLink = buildWaMeLink(
                      rawPhone,
                      personalizedMsg
                    );
                    const isOpened = openedCustomerIds.includes(c.id);
                    const isPreviewing =
                      !useManualInPreview &&
                      !useGroupInPreview &&
                      activeCustomerId === c.id;
                    const phoneChanged =
                      phoneOverrides[c.id] !== undefined &&
                      phoneOverrides[c.id].trim() !== (c.phone || "").trim();

                    return (
                      <div
                        key={c.id}
                        className={`wa-customer-row ${isPreviewing ? "is-previewing" : ""} ${isOpened ? "is-opened" : ""}`}
                      >
                        <div
                          className="wa-customer-info"
                          onClick={() => {
                            setUseManualInPreview(false);
                            setUseGroupInPreview(false);
                            setActiveCustomerId(c.id);
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={e => {
                            if (e.key === "Enter" || e.key === " ") {
                              setUseManualInPreview(false);
                              setUseGroupInPreview(false);
                              setActiveCustomerId(c.id);
                            }
                          }}
                        >
                          <div className="telegram-customer-avatar">
                            {c.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="wa-customer-meta">
                            <div className="wa-customer-name-line">
                              <b>{c.name}</b>
                              {isOpened && (
                                <span className="wa-sent-pill">
                                  <Check size={11} /> wa.me abierto
                                </span>
                              )}
                            </div>
                            <small>{c.contact}</small>
                          </div>
                        </div>

                        <div className="wa-customer-phone-box">
                          <div className="wa-phone-input-wrap">
                            <Phone size={13} />
                            <input
                              type="text"
                              value={rawPhone}
                              onChange={e =>
                                setPhoneOverrides(prev => ({
                                  ...prev,
                                  [c.id]: e.target.value,
                                }))
                              }
                              placeholder="+54 9 341..."
                              aria-label={`Teléfono de WhatsApp de ${c.name}`}
                            />
                            {phoneChanged && (
                              <button
                                type="button"
                                className="wa-save-phone-btn"
                                onClick={() => void handleSaveCustomerPhone(c)}
                                disabled={savingPhoneId === c.id}
                                title="Guardar este teléfono en la ficha del cliente"
                              >
                                <Save size={12} />
                                <span>Guardar</span>
                              </button>
                            )}
                          </div>
                          <span
                            className={`wa-phone-status ${cleanPhone ? "ok" : "missing"}`}
                          >
                            {cleanPhone
                              ? `wa.me/${cleanPhone}`
                              : "Sin número (selector general)"}
                          </span>
                        </div>

                        <div className="wa-customer-actions">
                          <button
                            type="button"
                            className="button-ghost"
                            onClick={() => {
                              setUseManualInPreview(false);
                              setUseGroupInPreview(false);
                              setActiveCustomerId(c.id);
                            }}
                            title="Ver vista previa de este cliente"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            className="button-ghost"
                            onClick={() =>
                              void handleCopyText(
                                customerWaLink,
                                `Link wa.me de ${c.name} copiado.`
                              )
                            }
                            title="Copiar link wa.me"
                          >
                            <Copy size={14} />
                          </button>
                          <a
                            href={customerWaLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="button-whatsapp wa-row-send-btn"
                            onClick={() => {
                              setUseManualInPreview(false);
                              setUseGroupInPreview(false);
                              setActiveCustomerId(c.id);
                              markCustomerOpened(c.id);
                            }}
                          >
                            <MessageCircle size={14} />
                            <span>Enviar wa.me</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          )}

          {/* PESTAÑA 2: Enviar a un Grupo de WhatsApp */}
          {recipientTab === "group" && (
            <section className="telegram-form-section wa-group-box">
              <div className="telegram-section-head">
                <span className="telegram-step-badge whatsapp">
                  <Users size={14} />
                </span>
                <div>
                  <h3>Enviar a un Grupo de WhatsApp</h3>
                  <p>
                    Compartí{" "}
                    {selectedOffers.length === 1
                      ? "la oferta seleccionada"
                      : `las ${selectedOffers.length} ofertas seleccionadas`}{" "}
                    en cualquier grupo de WhatsApp. Hacé clic en{" "}
                    <strong>Elegir Grupo en WhatsApp</strong> para abrir WhatsApp
                    con el mensaje listo y seleccionar el grupo de destino.
                  </p>
                </div>
              </div>

              <div className="wa-manual-inputs">
                <div className="field">
                  <label>Saludo grupal para {"{{nombre}}"}</label>
                  <input
                    value={groupGreeting}
                    onChange={e => {
                      setGroupGreeting(e.target.value);
                      setUseGroupInPreview(true);
                      setUseManualInPreview(false);
                    }}
                    placeholder="Ej: clientes, vecinos, comunidad, grupo mayorista..."
                  />
                  <div className="telegram-quick-chips">
                    {["clientes", "vecinos", "comunidad", "equipo"].map(g => (
                      <button
                        key={g}
                        type="button"
                        className={`chip-btn ${groupGreeting === g ? "is-active" : ""}`}
                        onClick={() => {
                          setGroupGreeting(g);
                          setUseGroupInPreview(true);
                          setUseManualInPreview(false);
                        }}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  <small className="field-hint">
                    Reemplaza el token {"{{nombre}}"} en el mensaje grupal (ej:
                    &ldquo;¡Hola {groupGreeting.trim() || "clientes"}!&rdquo;).
                  </small>
                </div>
              </div>

              <div className="wa-manual-actions">
                <div className="wa-generated-url-mini">
                  <Users size={13} />
                  <code>{groupWaMeLink}</code>
                </div>
                <div className="wa-manual-buttons">
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => {
                      setUseGroupInPreview(true);
                      setUseManualInPreview(false);
                      void handleCopyText(
                        groupMessage,
                        "Mensaje para el grupo copiado al portapapeles."
                      );
                    }}
                  >
                    <Copy size={14} />
                    <span>Copiar mensaje grupal</span>
                  </button>
                  <a
                    href={groupWaMeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button-whatsapp"
                    onClick={() => {
                      setUseGroupInPreview(true);
                      setUseManualInPreview(false);
                    }}
                  >
                    <Users size={15} />
                    <span>Elegir Grupo en WhatsApp</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            </section>
          )}

          {/* PESTAÑA 3: Envío Rápido a Número Manual */}
          {recipientTab === "manual" && (
            <section className="telegram-form-section wa-manual-box">
              <div className="telegram-section-head">
                <span className="telegram-step-badge whatsapp">
                  <Phone size={14} />
                </span>
                <div>
                  <h3>Envío rápido a número manual (wa.me)</h3>
                  <p>
                    Escribí cualquier número de teléfono para enviar{" "}
                    {selectedOffers.length === 1
                      ? "la oferta seleccionada"
                      : `las ${selectedOffers.length} ofertas seleccionadas`}{" "}
                    sin necesidad de agendar al contacto.
                  </p>
                </div>
              </div>

              <div className="wa-manual-inputs">
                <div className="field">
                  <label>Nombre para el saludo (opcional)</label>
                  <input
                    value={manualName}
                    onChange={e => {
                      setManualName(e.target.value);
                      setUseManualInPreview(true);
                      setUseGroupInPreview(false);
                    }}
                    placeholder="Ej: Martín / Kiosco Sur"
                  />
                </div>
                <div className="field">
                  <label>Teléfono de WhatsApp</label>
                  <input
                    value={manualPhone}
                    onChange={e => {
                      setManualPhone(e.target.value);
                      setUseManualInPreview(true);
                      setUseGroupInPreview(false);
                    }}
                    placeholder="Ej: +54 9 341 555-0182 o 3415550182"
                  />
                </div>
              </div>

              <div className="wa-manual-actions">
                <div className="wa-generated-url-mini">
                  <Link2 size={13} />
                  <code>
                    {buildWaMeLink(
                      manualPhone,
                      buildMessageForCustomer(manualName || "cliente")
                    )}
                  </code>
                </div>
                <div className="wa-manual-buttons">
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() =>
                      void handleCopyText(
                        buildWaMeLink(
                          manualPhone,
                          buildMessageForCustomer(manualName || "cliente")
                        ),
                        "Link wa.me copiado al portapapeles."
                      )
                    }
                  >
                    <Copy size={14} />
                    <span>Copiar link</span>
                  </button>
                  <a
                    href={buildWaMeLink(
                      manualPhone,
                      buildMessageForCustomer(manualName || "cliente")
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button-whatsapp"
                  >
                    <MessageCircle size={15} />
                    <span>Abrir wa.me</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* ─── COLUMNA DERECHA: Simulador con Pestañas (Vista previa | Resumen y Links) ─── */}
        <aside className="wa-dispatch-right">
          <div className="telegram-simulator-card wa-simulator-card">
            <div className="telegram-simulator-header whatsapp-sim-header">
              <div className="telegram-sim-Title">
                <span className="telegram-sim-dot whatsapp" />
                <div>
                  <strong>
                    {selectedOffers.length === offers.length &&
                    offers.length > 1
                      ? `Envío: Todas las ofertas (${offers.length})`
                      : selectedOffers.length === 1
                        ? `Envío: ${sanitizeWhatsAppText(selectedOffers[0].title) || `Oferta #${selectedOffers[0].id}`}`
                        : `Envío: ${selectedOffers.length} ofertas del catálogo`}
                  </strong>
                  <small>
                    Destinatario:{" "}
                    <b>
                      {useGroupInPreview
                        ? `Grupo (${groupGreeting || "clientes"})`
                        : useManualInPreview
                          ? manualName || "Número manual"
                          : activeCustomer
                            ? activeCustomer.name
                            : "General (cliente)"}
                    </b>
                  </small>
                </div>
              </div>
              <button
                type="button"
                className="telegram-copy-btn"
                onClick={() =>
                  void handleCopyText(
                    generatedMessage,
                    "Mensaje de WhatsApp copiado."
                  )
                }
              >
                <Copy size={13} />
                <span>Copiar texto</span>
              </button>
            </div>

            {/* Pestañas del Simulador Derecho */}
            <div
              className="telegram-card-tabs sim-internal-tabs"
              role="tablist"
              aria-label="Vistas del simulador"
            >
              <button
                type="button"
                role="tab"
                aria-selected={simTab === "preview"}
                className={`telegram-card-tab ${simTab === "preview" ? "is-active" : ""}`}
                onClick={() => setSimTab("preview")}
              >
                <MessageCircle size={13} />
                <span>Vista previa WhatsApp</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={simTab === "details"}
                className={`telegram-card-tab ${simTab === "details" ? "is-active" : ""}`}
                onClick={() => setSimTab("details")}
              >
                <Link2 size={13} />
                <span>Resumen y Links wa.me</span>
              </button>
            </div>

            {simTab === "preview" ? (
              <>
                <div className="telegram-chat-canvas whatsapp-chat-canvas">
                  <div className="telegram-chat-bubble-live whatsapp-bubble-live">
                    <div className="telegram-chat-sender whatsapp-sender">
                      StockIA ·{" "}
                      {selectedOffers.length === 1
                        ? sanitizeWhatsAppText(selectedOffers[0].title) ||
                          `Oferta #${selectedOffers[0].id}`
                        : `${selectedOffers.length} Ofertas del Catálogo`}
                    </div>
                    <p>
                      {generatedMessage ||
                        "Creá o seleccioná una, varias o todas las ofertas del catálogo para enviar por WhatsApp."}
                    </p>
                    <div className="telegram-chat-meta">
                      <span>
                        {new Date().toLocaleTimeString("es-AR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <CheckCheck size={13} className="telegram-checks inline ml-1" />
                    </div>
                  </div>
                </div>

                <div className="wa-link-inspector">
                  <div className="wa-link-inspector-actions">
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() =>
                        void handleCopyText(
                          activeWaMeLink,
                          "Link wa.me copiado al portapapeles."
                        )
                      }
                    >
                      <Copy size={15} />
                      <span>Copiar link wa.me</span>
                    </button>
                    <a
                      href={activeWaMeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button-whatsapp"
                      onClick={() => {
                        if (!useManualInPreview && activeCustomer) {
                          markCustomerOpened(activeCustomer.id);
                        }
                      }}
                    >
                      <MessageCircle size={16} />
                      <span>Abrir en WhatsApp (wa.me)</span>
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Resumen idéntico al catálogo de las ofertas incluidas */}
                <div className="telegram-economics-box">
                  <h4>
                    Resumen del catálogo ({selectedOffers.length} oferta
                    {selectedOffers.length === 1 ? "" : "s"} ·{" "}
                    {catalogSelectionTotals.totalProducts} prod.)
                  </h4>
                  <div className="economics-row">
                    <span>Valor de lista</span>
                    <strong>{fmtArs(catalogSelectionTotals.totalBase)}</strong>
                  </div>
                  <div className="economics-row">
                    <span>Valor en oferta</span>
                    <strong className="text-brand">
                      {fmtArs(catalogSelectionTotals.totalOffer)}
                    </strong>
                  </div>
                  <div className="economics-row highlight">
                    <span>Ahorro total incluido</span>
                    <strong>
                      {fmtArs(catalogSelectionTotals.totalSavings)}
                    </strong>
                  </div>
                </div>

                {/* Inspector del Link wa.me Generado */}
                <div className="wa-link-inspector">
                  <div className="wa-link-inspector-head">
                    <span>
                      <Link2 size={14} /> Link oficial <code>wa.me</code>{" "}
                      generado:
                    </span>
                    <span className="wa-phone-badge">
                      {normalizeWhatsAppPhone(previewTargetPhone)
                        ? `+${normalizeWhatsAppPhone(previewTargetPhone)}`
                        : "Selector libre de contacto"}
                    </span>
                  </div>
                  <div className="wa-link-code-box">
                    <code>{activeWaMeLink}</code>
                  </div>
                </div>

                {/* Link general sin número para Estados o Grupos */}
                <div className="wa-general-share-box">
                  <div>
                    <strong>Link general sin número fijo</strong>
                    <small>
                      Abre WhatsApp permitiéndote elegir cualquier contacto o
                      grupo (<code>wa.me/?text=...</code>)
                    </small>
                  </div>
                  <div className="wa-general-share-btns">
                    <button
                      type="button"
                      className="button-ghost"
                      onClick={() =>
                        void handleCopyText(
                          generalWaMeLink,
                          "Link wa.me general copiado."
                        )
                      }
                    >
                      <Copy size={14} />
                      <span>Copiar</span>
                    </button>
                    <a
                      href={generalWaMeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button-secondary"
                    >
                      <ExternalLink size={14} />
                      <span>Abrir wa.me</span>
                    </a>
                  </div>
                </div>
              </>
            )}

            {/* Registro interno de envíos realizados */}
            <div className="wa-tracking-footer">
              <div>
                <strong>Seguimiento de envíos</strong>
                <small>
                  {openedCustomerIds.length > 0
                    ? `${openedCustomerIds.length} cliente(s) con link wa.me abierto.`
                    : `Registrá ${selectedOffers.length === 1 ? "la oferta" : `las ${selectedOffers.length} ofertas`} como compartida(s).`}
                </small>
              </div>
              <button
                type="button"
                className="button-primary"
                disabled={markingSent || selectedOffers.length === 0}
                onClick={async () => {
                  setMarkingSent(true);
                  try {
                    await onMarkSent(selectedOffers, openedCustomerIds);
                  } finally {
                    setMarkingSent(false);
                  }
                }}
              >
                <CheckCircle2 size={15} />
                <span>
                  {markingSent
                    ? "Registrando..."
                    : selectedOffers.length === 1
                      ? "Marcar como compartida"
                      : `Marcar ${selectedOffers.length} como compartidas`}
                </span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MODAL DE ENVÍO POR WHATSAPP (wa.me)
 * ═══════════════════════════════════════════════════════════════════════════ */

function WhatsAppSendModal({
  offers,
  selectedOffers,
  onChangeSelectedOfferIds,
  customers,
  onCustomersChange,
  onCreateOfferClick,
  onClose,
  onMarkSent,
}: {
  offers: TelegramOffer[];
  selectedOffers: TelegramOffer[];
  onChangeSelectedOfferIds: (offerIds: number[]) => void;
  customers: Customer[];
  onCustomersChange: (next: Customer[]) => void;
  onCreateOfferClick?: () => void;
  onClose: () => void;
  onMarkSent: (
    targetOffers: TelegramOffer[],
    customerIds: number[]
  ) => Promise<void>;
}) {
  const modalTitle =
    selectedOffers.length === offers.length && offers.length > 1
      ? `Enviar todas las ofertas del catálogo (${offers.length})`
      : selectedOffers.length === 1
        ? `Enviar oferta: ${selectedOffers[0].title || `Oferta #${selectedOffers[0].id}`}`
        : `Enviar ${selectedOffers.length} ofertas del catálogo`;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Envíos por WhatsApp mediante link wa.me"
    >
      <div
        className="modal-card telegram-modal telegram-studio-modal"
        onClick={e => e.stopPropagation()}
      >
        <header className="modal-head telegram-modal-head">
          <div className="telegram-modal-title-group">
            <span className="telegram-modal-icon whatsapp">
              <MessageCircle size={20} />
            </span>
            <div>
              <p className="eyebrow">
                Envío por WhatsApp · Una, varias o todas las ofertas del catálogo
              </p>
              <h2>{modalTitle}</h2>
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </header>

        <div className="modal-body telegram-modal-body">
          <WhatsAppDispatchPanel
            offers={offers}
            selectedOffers={selectedOffers}
            onChangeSelectedOfferIds={onChangeSelectedOfferIds}
            customers={customers}
            onCustomersChange={onCustomersChange}
            onCreateOfferClick={onCreateOfferClick}
            onMarkSent={onMarkSent}
            inModal
          />
        </div>

        <footer className="modal-foot telegram-modal-foot">
          <div className="telegram-foot-status">
            <span className="ready-pill">
              <CheckCircle2 size={14} /> Links oficiales https://wa.me/ con las
              ofertas exactas del catálogo
            </span>
          </div>
          <div className="modal-foot-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={onClose}
            >
              Cerrar ventana de envíos
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MODAL DE CREACIÓN / EDICIÓN DE OFERTA (Exclusivamente para crear la oferta)
 * ═══════════════════════════════════════════════════════════════════════════ */

function OfferFormModal({
  initial,
  products,
  onClose,
  onSaved,
}: {
  initial: TelegramOffer | null;
  products: Product[];
  onClose: () => void;
  onSaved: (offer?: TelegramOffer) => Promise<void>;
}) {
  const [title, setTitle] = useState(
    initial?.title ? sanitizeWhatsAppText(initial.title) : ""
  );
  const [message, setMessage] = useState(
    initial?.message
      ? sanitizeWhatsAppText(initial.message)
      : "¡Hola *{{nombre}}*!\nMirá esta promo especial con *{{descuento}}*:\n\n{{productos}}\n\n{{vigencia}}\n_Respondé a este mensaje para reservar tu pedido._"
  );
  const [formStep, setFormStep] = useState<"message" | "products" | "validity">(
    "message"
  );
  const [studioRightTab, setStudioRightTab] = useState<"preview" | "summary">(
    "preview"
  );
  const [discountPercent, setDiscountPercent] = useState<string>(
    initial?.discountPercent ? String(initial.discountPercent) : "15"
  );
  const [validFrom, setValidFrom] = useState(
    toDateInputValue(initial?.validFrom) || addDaysInputValue(0)
  );
  const [validUntil, setValidUntil] = useState(
    toDateInputValue(initial?.validUntil) || addDaysInputValue(7)
  );
  const [items, setItems] = useState<
    Record<number, { selected: boolean; offerPrice: string }>
  >(() => {
    const map: Record<number, { selected: boolean; offerPrice: string }> = {};
    for (const it of initial?.items ?? []) {
      map[it.productId] = {
        selected: true,
        offerPrice:
          it.offerPrice !== null && it.offerPrice !== undefined
            ? String(it.offerPrice)
            : "",
      };
    }
    return map;
  });

  const [productSearch, setProductSearch] = useState("");
  const [productTab, setProductTab] = useState<"all" | "selected" | "inStock">(
    "all"
  );
  const [submitting, setSubmitting] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const messageRef = useRef<HTMLTextAreaElement | null>(null);

  const selectedProductList = useMemo(
    () =>
      products
        .filter(p => items[p.id]?.selected)
        .map(p => {
          const raw = items[p.id]?.offerPrice?.trim() ?? "";
          const num = raw === "" ? null : Number(raw);
          return {
            productId: p.id,
            name: p.name,
            sku: p.sku,
            price: p.price,
            stock: p.stock,
            offerPrice: num !== null && Number.isFinite(num) ? num : null,
          };
        }),
    [products, items]
  );

  const parsedDiscount = useMemo(() => {
    if (!discountPercent.trim()) return null;
    const n = Number(discountPercent);
    return Number.isInteger(n) && n >= 1 && n <= 90 ? n : null;
  }, [discountPercent]);

  const economicSummary = useMemo(() => {
    let baseTotal = 0;
    let offerTotal = 0;
    let outOfStockCount = 0;
    let invalidPriceCount = 0;

    for (const p of selectedProductList) {
      baseTotal += p.price;
      const eff = computeEffectiveItemPrice(
        p.price,
        p.offerPrice,
        parsedDiscount
      );
      offerTotal += eff;
      if (p.stock <= 0) outOfStockCount += 1;
      if (p.offerPrice !== null && p.offerPrice >= p.price) {
        invalidPriceCount += 1;
      }
    }

    const totalSavings = Math.max(0, baseTotal - offerTotal);
    const effectiveDiscountPct =
      baseTotal > 0 ? Math.round((totalSavings / baseTotal) * 100) : 0;

    return {
      baseTotal,
      offerTotal,
      totalSavings,
      effectiveDiscountPct,
      outOfStockCount,
      invalidPriceCount,
    };
  }, [selectedProductList, parsedDiscount]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter(p => {
      if (productTab === "selected" && !items[p.id]?.selected) return false;
      if (productTab === "inStock" && p.stock <= 0) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q)
      );
    });
  }, [products, productSearch, productTab, items]);

  const livePreview = useMemo(
    () =>
      buildLocalPreview({
        baseMessage: message,
        customerName: "cliente",
        products: selectedProductList,
        discountPercent: parsedDiscount,
        validUntil: validUntil || null,
      }),
    [message, selectedProductList, parsedDiscount, validUntil]
  );

  const sampleWaMeUrl = useMemo(
    () => buildWaMeLink(null, livePreview),
    [livePreview]
  );

  const toggleProduct = (p: Product) => {
    setItems(prev => {
      const cur = prev[p.id];
      if (cur?.selected) {
        const next = { ...prev };
        delete next[p.id];
        return next;
      }
      return {
        ...prev,
        [p.id]: { selected: true, offerPrice: cur?.offerPrice ?? "" },
      };
    });
  };

  const setOfferPrice = (productId: number, value: string) => {
    setItems(prev => ({
      ...prev,
      [productId]: { selected: true, offerPrice: value },
    }));
  };

  const applyDiscountToSelectedPrices = () => {
    if (!parsedDiscount) {
      toast.error("Ingresá un porcentaje de descuento válido (1 a 90%).");
      return;
    }
    if (selectedProductList.length === 0) {
      toast.error("Seleccioná al menos un producto primero.");
      return;
    }
    setItems(prev => {
      const next = { ...prev };
      for (const p of selectedProductList) {
        const discounted = Math.max(
          1,
          Math.round(p.price * (1 - parsedDiscount / 100))
        );
        next[p.productId] = {
          selected: true,
          offerPrice: String(discounted),
        };
      }
      return next;
    });
    toast.success(
      `Se calcularon los precios de oferta con -${parsedDiscount}% en ${selectedProductList.length} producto(s).`
    );
  };

  const clearExplicitPrices = () => {
    setItems(prev => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        const id = Number(key);
        if (next[id]?.selected) {
          next[id] = { selected: true, offerPrice: "" };
        }
      }
      return next;
    });
  };

  const insertTokenAtCursor = (token: string) => {
    const el = messageRef.current;
    if (!el) {
      setMessage(prev => `${prev} ${token}`.trim());
      return;
    }
    const start = el.selectionStart ?? message.length;
    const end = el.selectionEnd ?? message.length;
    const next = `${message.slice(0, start)}${token}${message.slice(end)}`;
    setMessage(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const applyTemplate = (tpl: (typeof MESSAGE_TEMPLATES)[number]) => {
    if (!title.trim() || MESSAGE_TEMPLATES.some(t => t.title === title)) {
      setTitle(tpl.title);
    }
    setMessage(tpl.message);
    setDiscountPercent(String(tpl.discount));
    toast.success(`Plantilla "${tpl.label}" aplicada.`);
  };

  const handleSuggest = async () => {
    setSuggestLoading(true);
    try {
      const s = await telegramService.suggest();
      setTitle(s.title);
      setMessage(s.message);
      if (s.discountPercent) {
        setDiscountPercent(String(s.discountPercent));
      }
      const next: Record<number, { selected: boolean; offerPrice: string }> =
        {};
      for (const it of s.items) {
        next[it.productId] = {
          selected: true,
          offerPrice: it.offerPrice ? String(it.offerPrice) : "",
        };
      }
      setItems(next);
      toast.success(
        "Se cargaron los productos con mayor rotación y stock disponible."
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSuggestLoading(false);
    }
  };

  const readinessChecks = useMemo(() => {
    return [
      {
        id: "title",
        label: "Título descriptivo (mín. 3 caracteres)",
        ok: title.trim().length >= 3,
      },
      {
        id: "message",
        label: "Mensaje comercial (mín. 10 caracteres)",
        ok: message.trim().length >= 10,
      },
      {
        id: "products",
        label: `Productos incluidos (${selectedProductList.length} seleccionado${selectedProductList.length === 1 ? "" : "s"})`,
        ok: selectedProductList.length >= 1,
      },
      {
        id: "prices",
        label: "Precios de oferta menores al precio base",
        ok: economicSummary.invalidPriceCount === 0,
      },
      {
        id: "dates",
        label: "Fechas de vigencia coherentes",
        ok: !(validFrom && validUntil && validUntil < validFrom),
      },
    ];
  }, [
    title,
    message,
    selectedProductList.length,
    economicSummary.invalidPriceCount,
    validFrom,
    validUntil,
  ]);

  const submit = async (targetStatus: "Borrador" | "Lista para enviar") => {
    const errs: string[] = [];
    if (title.trim().length < 3)
      errs.push("El título debe tener al menos 3 caracteres.");
    if (message.trim().length < 10)
      errs.push("El mensaje debe tener al menos 10 caracteres.");
    if (selectedProductList.length === 0)
      errs.push("Elegí al menos un producto para la oferta.");
    for (const p of selectedProductList) {
      if (p.offerPrice !== null) {
        if (p.offerPrice <= 0)
          errs.push(`El precio de oferta de "${p.name}" debe ser mayor a 0.`);
        else if (p.offerPrice >= p.price)
          errs.push(
            `El precio de oferta de "${p.name}" (${fmtArs(p.offerPrice)}) debe ser menor al precio base (${fmtArs(p.price)}).`
          );
      }
    }
    const disc = discountPercent.trim() === "" ? null : Number(discountPercent);
    if (disc !== null && (!Number.isInteger(disc) || disc < 1 || disc > 90))
      errs.push("El descuento debe ser un entero entre 1 y 90.");
    if (validFrom && validUntil && validUntil < validFrom)
      errs.push("La fecha de fin debe ser posterior o igual a la de inicio.");

    if (errs.length) {
      setFormErrors(errs);
      return;
    }
    setFormErrors([]);

    const payload: TelegramOfferInput = {
      title: title.trim(),
      message: message.trim(),
      items: selectedProductList.map(p => ({
        productId: p.productId,
        offerPrice: p.offerPrice,
      })),
      // La creación de la oferta es independiente de los envíos
      customerIds: initial?.customerIds ?? [],
      discountPercent: disc,
      validFrom: validFrom || null,
      validUntil: validUntil || null,
      status: targetStatus,
    };

    setSubmitting(true);
    try {
      if (initial) {
        const res = await telegramService.update(initial.id, payload);
        toast.success("Oferta actualizada correctamente.");
        await onSaved(res.item);
      } else {
        const res = await telegramService.create(payload);
        toast.success(
          targetStatus === "Lista para enviar"
            ? "Oferta creada y lista para compartir por WhatsApp (wa.me)."
            : "Oferta guardada como borrador."
        );
        await onSaved(res.item);
      }
    } catch (e) {
      setFormErrors([(e as Error).message]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={initial ? "Editar oferta" : "Nueva oferta"}
    >
      <div
        className="modal-card telegram-modal telegram-studio-modal"
        onClick={e => e.stopPropagation()}
      >
        <header className="modal-head telegram-modal-head">
          <div className="telegram-modal-title-group">
            <span className="telegram-modal-icon">
              <Tag size={20} />
            </span>
            <div>
              <p className="eyebrow">
                {initial
                  ? `Editando oferta #${initial.id}`
                  : "Diseño de promoción comercial"}
              </p>
              <h2>
                {initial
                  ? initial.title || `Oferta #${initial.id}`
                  : "Crear nueva oferta"}
              </h2>
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </header>

        <div className="modal-body telegram-modal-body">
          {formErrors.length > 0 && (
            <div className="telegram-errors" role="alert">
              <AlertTriangle size={16} />
              <ul>
                {formErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="telegram-studio-layout">
            {/* ─── COLUMNA IZQUIERDA: Definición de la Oferta en 3 Pestañas ─── */}
            <div className="telegram-studio-form">
              <div
                className="telegram-panel-tabs"
                role="tablist"
                aria-label="Pasos de configuración de la oferta"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={formStep === "message"}
                  className={`telegram-panel-tab ${formStep === "message" ? "is-active" : ""}`}
                  onClick={() => setFormStep("message")}
                >
                  <FileText size={14} />
                  <span>1. Mensaje y Plantilla</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={formStep === "products"}
                  className={`telegram-panel-tab ${formStep === "products" ? "is-active" : ""}`}
                  onClick={() => setFormStep("products")}
                >
                  <Package size={14} />
                  <span>
                    2. Productos y Precios ({selectedProductList.length})
                  </span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={formStep === "validity"}
                  className={`telegram-panel-tab ${formStep === "validity" ? "is-active" : ""}`}
                  onClick={() => setFormStep("validity")}
                >
                  <Calendar size={14} />
                  <span>3. Vigencia y Control</span>
                </button>
              </div>

              {/* PESTAÑA 1: Identidad y Mensaje */}
              {formStep === "message" && (
                <section className="telegram-form-section">
                  <div className="telegram-section-head">
                    <span className="telegram-step-badge">1</span>
                    <div>
                      <h3>Identidad y plantilla del mensaje</h3>
                      <p>
                        Definí el nombre de la oferta y el texto base que luego
                        se usará al generar los links <code>wa.me</code>.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => void handleSuggest()}
                      disabled={suggestLoading}
                      title="Autocompletar con los productos más vendidos con stock"
                    >
                      <Wand2 size={14} />
                      <span>
                        {suggestLoading
                          ? "Analizando..."
                          : "Sugerir más vendidos"}
                      </span>
                    </button>
                  </div>

                  <div className="field">
                    <div className="telegram-field-header">
                      <label htmlFor="offer-title">Título de la oferta</label>
                      <span className="char-counter">{title.length}/80</span>
                    </div>
                    <input
                      id="offer-title"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Ej: Combo Almacén y Desayuno"
                      maxLength={80}
                    />
                  </div>

                  {/* Plantillas rápidas */}
                  <div className="telegram-templates-row">
                    <span className="templates-label">Plantillas rápidas:</span>
                    <div className="templates-list">
                      {MESSAGE_TEMPLATES.map(tpl => {
                        const Icon = tpl.icon;
                        return (
                          <button
                            key={tpl.id}
                            type="button"
                            className="template-chip"
                            onClick={() => applyTemplate(tpl)}
                          >
                            <Icon size={13} />
                            <span>{tpl.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="field">
                    <div className="telegram-field-header">
                      <label htmlFor="offer-msg">
                        Mensaje de la oferta para WhatsApp
                      </label>
                      <span className="char-counter">{message.length}/900</span>
                    </div>
                    <textarea
                      id="offer-msg"
                      ref={messageRef}
                      rows={5}
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      maxLength={900}
                      placeholder="Escribí el mensaje de la oferta..."
                    />
                    <div className="telegram-tokens-bar">
                      <span className="tokens-caption">
                        Insertar variable en el cursor:
                      </span>
                      <div className="tokens-list">
                        {PLACEHOLDER_TOKENS.map(t => (
                          <button
                            key={t.token}
                            type="button"
                            className="token-chip"
                            onClick={() => insertTokenAtCursor(t.token)}
                            title={`Inserta ${t.token} (${t.label})`}
                          >
                            <code>{t.token}</code>
                            <span>{t.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="telegram-step-nav">
                    <span />
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => setFormStep("products")}
                    >
                      <span>Siguiente: Productos y Precios →</span>
                    </button>
                  </div>
                </section>
              )}

              {/* PESTAÑA 2: Selección de Productos y Descuento */}
              {formStep === "products" && (
                <section className="telegram-form-section">
                  <div className="telegram-section-head">
                    <span className="telegram-step-badge">2</span>
                    <div>
                      <h3>
                        Productos y precios de oferta ({selectedProductList.length}{" "}
                        seleccionado
                        {selectedProductList.length === 1 ? "" : "s"})
                      </h3>
                      <p>
                        Aplicá un descuento porcentual general o definí un
                        precio especial para cada artículo.
                      </p>
                    </div>
                    {selectedProductList.some(p => p.offerPrice !== null) && (
                      <button
                        type="button"
                        className="telegram-link-action"
                        onClick={clearExplicitPrices}
                      >
                        Usar % general en todos
                      </button>
                    )}
                  </div>

                  <div className="field">
                    <label htmlFor="offer-discount">
                      <Percent size={13} /> Descuento general (% OFF)
                    </label>
                    <div className="discount-input-group">
                      <input
                        id="offer-discount"
                        type="number"
                        min={1}
                        max={90}
                        value={discountPercent}
                        onChange={e => setDiscountPercent(e.target.value)}
                        placeholder="Ej: 15"
                      />
                      <button
                        type="button"
                        className="button-secondary discount-apply-btn"
                        onClick={applyDiscountToSelectedPrices}
                        disabled={
                          !parsedDiscount || selectedProductList.length === 0
                        }
                        title="Calcula y rellena el precio de oferta de cada producto elegido"
                      >
                        Aplicar % a productos
                      </button>
                      <div className="preset-pills">
                        {[10, 15, 20, 25, 30].map(pct => (
                          <button
                            key={pct}
                            type="button"
                            className={`preset-pill ${Number(discountPercent) === pct ? "is-active" : ""}`}
                            onClick={() => setDiscountPercent(String(pct))}
                          >
                            -{pct}%
                          </button>
                        ))}
                        <button
                          type="button"
                          className={`preset-pill ${discountPercent === "" ? "is-active" : ""}`}
                          onClick={() => setDiscountPercent("")}
                        >
                          Sin % fijo
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="telegram-catalog-toolbar">
                    <label className="search-field">
                      <Search size={15} />
                      <input
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                        placeholder="Filtrar por nombre, código SKU o categoría..."
                      />
                      {productSearch && (
                        <button
                          type="button"
                          className="telegram-search-clear"
                          onClick={() => setProductSearch("")}
                        >
                          <X size={13} />
                        </button>
                      )}
                    </label>
                    <div className="telegram-mini-tabs">
                      <button
                        type="button"
                        className={productTab === "all" ? "is-active" : ""}
                        onClick={() => setProductTab("all")}
                      >
                        Todos ({products.length})
                      </button>
                      <button
                        type="button"
                        className={productTab === "selected" ? "is-active" : ""}
                        onClick={() => setProductTab("selected")}
                      >
                        Elegidos ({selectedProductList.length})
                      </button>
                      <button
                        type="button"
                        className={productTab === "inStock" ? "is-active" : ""}
                        onClick={() => setProductTab("inStock")}
                      >
                        Con stock
                      </button>
                    </div>
                  </div>

                  <div className="telegram-product-picker">
                    {filteredProducts.length === 0 ? (
                      <p className="muted-empty">
                        No hay productos que coincidan con el filtro actual.
                      </p>
                    ) : (
                      filteredProducts.map(p => {
                        const sel = Boolean(items[p.id]?.selected);
                        const rawOfferPrice = items[p.id]?.offerPrice ?? "";
                        const numOffer =
                          rawOfferPrice.trim() !== ""
                            ? Number(rawOfferPrice)
                            : null;
                        const effective = computeEffectiveItemPrice(
                          p.price,
                          numOffer,
                          parsedDiscount
                        );
                        const itemSaving = Math.max(0, p.price - effective);
                        const itemPct =
                          p.price > 0
                            ? Math.round((itemSaving / p.price) * 100)
                            : 0;
                        const isInvalidPrice =
                          numOffer !== null &&
                          (numOffer <= 0 || numOffer >= p.price);

                        return (
                          <div
                            key={p.id}
                            className={`picker-row ${sel ? "is-selected" : ""} ${p.stock <= 0 ? "is-no-stock" : ""}`}
                          >
                            <label className="picker-check">
                              <input
                                type="checkbox"
                                checked={sel}
                                onChange={() => toggleProduct(p)}
                              />
                              <div className="picker-product-info">
                                <div className="picker-product-title">
                                  <b>{p.name}</b>
                                  {p.category && (
                                    <span className="picker-cat-tag">
                                      {p.category}
                                    </span>
                                  )}
                                </div>
                                <small>
                                  {p.sku} · Base:{" "}
                                  <strong>{fmtArs(p.price)}</strong> ·{" "}
                                  <span
                                    className={
                                      p.stock <= 0 ? "text-warn" : "text-ok"
                                    }
                                  >
                                    Stock: {p.stock} u.
                                  </span>
                                </small>
                              </div>
                            </label>

                            {sel && (
                              <div className="picker-price-box">
                                <div
                                  className={`picker-price-input ${isInvalidPrice ? "has-error" : ""}`}
                                >
                                  <span>Precio oferta $</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={Math.max(1, p.price - 1)}
                                    step="1"
                                    placeholder={
                                      parsedDiscount
                                        ? `${Math.round(p.price * (1 - parsedDiscount / 100))} (-${parsedDiscount}%)`
                                        : `Menor a ${p.price}`
                                    }
                                    value={rawOfferPrice}
                                    onChange={e =>
                                      setOfferPrice(p.id, e.target.value)
                                    }
                                    aria-label={`Precio de oferta para ${p.name}`}
                                  />
                                </div>
                                {isInvalidPrice ? (
                                  <span className="picker-saving-pill error">
                                    Debe ser menor a {fmtArs(p.price)}
                                  </span>
                                ) : itemSaving > 0 ? (
                                  <span className="picker-saving-pill">
                                    -{itemPct}% · Ahorra {fmtArs(itemSaving)}
                                  </span>
                                ) : null}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="telegram-step-nav">
                    <button
                      type="button"
                      className="button-ghost"
                      onClick={() => setFormStep("message")}
                    >
                      <span>← Anterior: Mensaje</span>
                    </button>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => setFormStep("validity")}
                    >
                      <span>Siguiente: Vigencia y Control →</span>
                    </button>
                  </div>
                </section>
              )}

              {/* PESTAÑA 3: Vigencia y Control */}
              {formStep === "validity" && (
                <section className="telegram-form-section">
                  <div className="telegram-section-head">
                    <span className="telegram-step-badge">3</span>
                    <div>
                      <h3>Período de vigencia y control final</h3>
                      <p>
                        Definí hasta cuándo es válida la promoción y revisá el
                        estado de los requisitos antes de guardar.
                      </p>
                    </div>
                  </div>

                  <div className="field">
                    <label>
                      <Calendar size={13} /> Período de vigencia
                    </label>
                    <div className="dates-input-row">
                      <div className="date-sub-field">
                        <small>Desde</small>
                        <input
                          id="offer-from"
                          type="date"
                          value={validFrom}
                          onChange={e => setValidFrom(e.target.value)}
                        />
                      </div>
                      <div className="date-sub-field">
                        <small>Hasta</small>
                        <input
                          id="offer-until"
                          type="date"
                          value={validUntil}
                          onChange={e => setValidUntil(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="preset-pills">
                      <button
                        type="button"
                        className="preset-pill"
                        onClick={() => {
                          setValidFrom(addDaysInputValue(0));
                          setValidUntil(addDaysInputValue(0));
                        }}
                      >
                        Solo hoy
                      </button>
                      <button
                        type="button"
                        className="preset-pill"
                        onClick={() => {
                          setValidFrom(addDaysInputValue(0));
                          setValidUntil(addDaysInputValue(3));
                        }}
                      >
                        3 días
                      </button>
                      <button
                        type="button"
                        className="preset-pill"
                        onClick={() => {
                          setValidFrom(addDaysInputValue(0));
                          setValidUntil(addDaysInputValue(7));
                        }}
                      >
                        7 días
                      </button>
                      <button
                        type="button"
                        className="preset-pill"
                        onClick={() => {
                          setValidFrom(addDaysInputValue(0));
                          setValidUntil(addDaysInputValue(15));
                        }}
                      >
                        15 días
                      </button>
                      <button
                        type="button"
                        className="preset-pill"
                        onClick={() => {
                          setValidFrom("");
                          setValidUntil("");
                        }}
                      >
                        Sin límite
                      </button>
                    </div>
                  </div>

                  <div className="telegram-checklist-box">
                    <h4>Control de validez de la oferta</h4>
                    <ul>
                      {readinessChecks.map(c => (
                        <li
                          key={c.id}
                          className={c.ok ? "is-ok" : "is-pending"}
                        >
                          {c.ok ? (
                            <CheckCircle2 size={14} />
                          ) : (
                            <Clock size={14} />
                          )}
                          <span>{c.label}</span>
                        </li>
                      ))}
                    </ul>
                    {economicSummary.outOfStockCount > 0 && (
                      <div className="telegram-inline-alert">
                        <AlertTriangle size={14} />
                        <span>
                          {economicSummary.outOfStockCount} producto(s)
                          elegido(s) no tienen stock actualmente.
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="telegram-step-nav">
                    <button
                      type="button"
                      className="button-ghost"
                      onClick={() => setFormStep("products")}
                    >
                      <span>← Anterior: Productos y Precios</span>
                    </button>
                    <span />
                  </div>
                </section>
              )}
            </div>

            {/* ─── COLUMNA DERECHA: Simulador de WhatsApp con Pestañas ─── */}
            <aside className="telegram-studio-sidebar">
              <div className="telegram-simulator-card">
                <div className="telegram-simulator-header whatsapp-sim-header">
                  <div className="telegram-sim-Title">
                    <span className="telegram-sim-dot whatsapp" />
                    <div>
                      <strong>Vista previa para WhatsApp</strong>
                      <small>Así se armará el mensaje en el link wa.me</small>
                    </div>
                  </div>
                </div>

                <div
                  className="telegram-card-tabs sim-internal-tabs"
                  role="tablist"
                  aria-label="Vista previa o resumen"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={studioRightTab === "preview"}
                    className={`telegram-card-tab ${studioRightTab === "preview" ? "is-active" : ""}`}
                    onClick={() => setStudioRightTab("preview")}
                  >
                    <MessageCircle size={13} />
                    <span>Mensaje WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={studioRightTab === "summary"}
                    className={`telegram-card-tab ${studioRightTab === "summary" ? "is-active" : ""}`}
                    onClick={() => setStudioRightTab("summary")}
                  >
                    <Tag size={13} />
                    <span>Resumen económico</span>
                  </button>
                </div>

                {studioRightTab === "preview" ? (
                  <>
                    <div className="telegram-chat-canvas whatsapp-chat-canvas">
                      <div className="telegram-chat-bubble-live whatsapp-bubble-live">
                        <div className="telegram-chat-sender whatsapp-sender">
                          StockIA ·{" "}
                          {sanitizeWhatsAppText(title).trim() || "Nueva Oferta"}
                        </div>
                        <p>{livePreview}</p>
                        <div className="telegram-chat-meta">
                          <span>
                            {new Date().toLocaleTimeString("es-AR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <CheckCheck size={13} className="telegram-checks inline ml-1" />
                        </div>
                      </div>
                    </div>

                    <div className="wa-preview-url-strip">
                      <small>
                        <Link2 size={12} /> Link oficial generado:
                      </small>
                      <code>{sampleWaMeUrl}</code>
                    </div>
                  </>
                ) : (
                  <div className="telegram-economics-box">
                    <h4>Resumen económico de la oferta</h4>
                    <div className="economics-row">
                      <span>
                        Valor de lista ({selectedProductList.length} prod.)
                      </span>
                      <strong>{fmtArs(economicSummary.baseTotal)}</strong>
                    </div>
                    <div className="economics-row">
                      <span>Valor en oferta</span>
                      <strong className="text-brand">
                        {fmtArs(economicSummary.offerTotal)}
                      </strong>
                    </div>
                    <div className="economics-row highlight">
                      <span>Ahorro para el cliente</span>
                      <strong>
                        {fmtArs(economicSummary.totalSavings)}{" "}
                        {economicSummary.effectiveDiscountPct > 0 &&
                          `(-${economicSummary.effectiveDiscountPct}%)`}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>

        <footer className="modal-foot telegram-modal-foot">
          <div className="telegram-foot-status">
            <span>
              Una vez creada la oferta, podrás enviarla por WhatsApp con links{" "}
              <code>wa.me</code> desde el módulo de envíos.
            </span>
          </div>
          <div className="modal-foot-actions">
            <button
              type="button"
              className="button-ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => void submit("Borrador")}
              disabled={submitting}
            >
              <FileText size={15} />
              <span>Guardar borrador</span>
            </button>
            <button
              type="button"
              className="button-primary"
              onClick={() => void submit("Lista para enviar")}
              disabled={submitting}
            >
              <Check size={15} />
              <span>
                {initial ? "Guardar oferta activa" : "Crear oferta activa"}
              </span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MODAL DE DETALLE DE LA OFERTA
 * ═══════════════════════════════════════════════════════════════════════════ */

function OfferDetailModal({
  offer,
  busy,
  onClose,
  onEdit,
  onOpenWhatsApp,
  onTransition,
  onDuplicate,
  onDelete,
}: {
  offer: TelegramOffer;
  busy: boolean;
  onClose: () => void;
  onEdit: () => void;
  onOpenWhatsApp: () => void;
  onTransition: (next: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [detailTab, setDetailTab] = useState<"preview" | "products" | "history">(
    "preview"
  );
  const meta = STATUS_META[offer.status] || STATUS_META["Borrador"];

  const previewText = useMemo(
    () =>
      buildLocalPreview({
        baseMessage: offer.message,
        customerName: "cliente",
        products: offer.items
          .filter(i => !i.missing)
          .map(i => ({
            name: i.name || `#${i.productId}`,
            price: i.price ?? 0,
            offerPrice: i.offerPrice ?? null,
          })),
        discountPercent: offer.discountPercent ?? null,
        validUntil: offer.validUntil ?? null,
      }),
    [offer]
  );

  const generalWaLink = useMemo(
    () => buildWaMeLink(null, previewText),
    [previewText]
  );

  const handleCopy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(msg);
    } catch {
      toast.error("No se pudo copiar al portapapeles.");
    }
  };

  const lifecycleSteps = [
    { key: "Borrador", label: "Borrador" },
    { key: "Lista para enviar", label: "Activa para enviar" },
    { key: "Enviada", label: "Compartida" },
    {
      key: offer.status === "Cancelada" ? "Cancelada" : "Archivada",
      label: offer.status === "Cancelada" ? "Cancelada" : "Archivada",
    },
  ];

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Detalle de la oferta"
    >
      <div
        className="modal-card telegram-modal telegram-detail-modal"
        onClick={e => e.stopPropagation()}
      >
        <header className="modal-head telegram-modal-head">
          <div className="telegram-modal-title-group">
            <span className={`telegram-modal-icon ${meta.accent}`}>
              <Tag size={20} />
            </span>
            <div>
              <div className="telegram-detail-kicker">
                <span>Oferta #{offer.id}</span>
                <span className={`status-pill ${meta.tone}`}>{meta.label}</span>
                {offer.discountPercent && (
                  <span className="meta-chip chip-accent">
                    -{offer.discountPercent}% OFF
                  </span>
                )}
              </div>
              <h2>
                {sanitizeWhatsAppText(offer.title) || `Oferta #${offer.id}`}
              </h2>
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </header>

        <div className="modal-body telegram-modal-body">
          {/* KPIs rápidos de la oferta */}
          <div className="telegram-detail-kpis">
            <div className="detail-kpi">
              <span>Productos incluidos</span>
              <strong>{offer.items.length}</strong>
              <small>
                {offer.outOfStockCount
                  ? `${offer.outOfStockCount} sin stock`
                  : "Todos con stock"}
              </small>
            </div>
            <div className="detail-kpi">
              <span>Valor de oferta</span>
              <strong>{fmtArs(offer.offerTotal ?? offer.baseTotal)}</strong>
              <small>Lista: {fmtArs(offer.baseTotal)}</small>
            </div>
            <div className="detail-kpi highlight">
              <span>Ahorro por combo</span>
              <strong>{fmtArs(offer.totalSavings ?? 0)}</strong>
              <small>
                {offer.discountPercent
                  ? `Descuento base -${offer.discountPercent}%`
                  : "Precios especiales"}
              </small>
            </div>
            <div className="detail-kpi">
              <span>Vigencia</span>
              <strong>
                {offer.validUntil
                  ? fmtShortDate(offer.validUntil)
                  : "Sin límite"}
              </strong>
              <small>
                {offer.validFrom
                  ? `Desde ${fmtShortDate(offer.validFrom)}`
                  : `Creada ${fmtShortDate(offer.createdAt)}`}
              </small>
            </div>
          </div>

          {offer.warnings && offer.warnings.length > 0 && (
            <div className="telegram-warnings" role="status">
              <AlertTriangle size={15} />
              <span>{offer.warnings.join(" · ")}</span>
            </div>
          )}

          {/* Pestañas del Modal de Detalle */}
          <div
            className="telegram-panel-tabs"
            role="tablist"
            aria-label="Secciones del detalle de la oferta"
          >
            <button
              type="button"
              role="tab"
              aria-selected={detailTab === "preview"}
              className={`telegram-panel-tab ${detailTab === "preview" ? "is-active" : ""}`}
              onClick={() => setDetailTab("preview")}
            >
              <MessageCircle size={15} />
              <span>1. Mensaje y Link wa.me</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={detailTab === "products"}
              className={`telegram-panel-tab ${detailTab === "products" ? "is-active" : ""}`}
              onClick={() => setDetailTab("products")}
            >
              <Package size={15} />
              <span>2. Productos y Precios ({offer.items.length})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={detailTab === "history"}
              className={`telegram-panel-tab ${detailTab === "history" ? "is-active" : ""}`}
              onClick={() => setDetailTab("history")}
            >
              <Users size={15} />
              <span>
                3. Estado e Historial ({offer.customers?.length ?? 0})
              </span>
            </button>
          </div>

          {detailTab === "preview" && (
            <div className="telegram-simulator-card">
              <div className="telegram-simulator-header whatsapp-sim-header">
                <div className="telegram-sim-Title">
                  <span className="telegram-sim-dot whatsapp" />
                  <div>
                    <strong>Mensaje y link wa.me</strong>
                    <small>Listo para compartir por WhatsApp</small>
                  </div>
                </div>
                <button
                  type="button"
                  className="telegram-copy-btn"
                  onClick={() =>
                    void handleCopy(previewText, "Mensaje copiado.")
                  }
                >
                  <Copy size={13} />
                  <span>Copiar texto</span>
                </button>
              </div>

              <div className="telegram-chat-canvas whatsapp-chat-canvas">
                <div className="telegram-chat-bubble-live whatsapp-bubble-live">
                  <div className="telegram-chat-sender whatsapp-sender">
                    StockIA ·{" "}
                    {sanitizeWhatsAppText(offer.title) || `Oferta #${offer.id}`}
                  </div>
                  <p>{previewText}</p>
                  <div className="telegram-chat-meta">
                    <span>WhatsApp</span>
                    <CheckCheck size={13} className="telegram-checks inline ml-1" />
                  </div>
                </div>
              </div>

              <div className="wa-link-inspector">
                <div className="wa-link-inspector-head">
                  <span>
                    <Link2 size={14} /> Link general <code>wa.me</code>:
                  </span>
                </div>
                <div className="wa-link-code-box">
                  <code>{generalWaLink}</code>
                </div>
                <div className="wa-link-inspector-actions">
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() =>
                      void handleCopy(
                        generalWaLink,
                        "Link wa.me copiado al portapapeles."
                      )
                    }
                  >
                    <Copy size={14} />
                    <span>Copiar link wa.me</span>
                  </button>
                  <button
                    type="button"
                    className="button-whatsapp"
                    onClick={onOpenWhatsApp}
                  >
                    <MessageCircle size={15} />
                    <span>Personalizar envío por cliente o grupo</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {detailTab === "products" && (
            <section className="detail-section">
              <h3>
                <Package size={15} /> Productos y precios de la oferta (
                {offer.items.length})
              </h3>
              <div className="detail-product-list">
                {offer.items.map(it => {
                  const eff =
                    it.effectivePrice ??
                    computeEffectiveItemPrice(
                      it.price ?? 0,
                      it.offerPrice,
                      offer.discountPercent
                    );
                  const saving =
                    it.price !== undefined ? Math.max(0, it.price - eff) : 0;
                  const pct =
                    it.price && it.price > 0
                      ? Math.round((saving / it.price) * 100)
                      : 0;
                  return (
                    <div key={it.productId} className="detail-product-row">
                      <div>
                        <b>{it.name || `Producto #${it.productId}`}</b>
                        <small>
                          {it.sku || "—"}
                          {it.category ? ` · ${it.category}` : ""} · Stock:{" "}
                          <span
                            className={
                              (it.stock ?? 0) <= 0 ? "text-warn" : "text-ok"
                            }
                          >
                            {it.stock ?? 0} u.
                          </span>
                        </small>
                      </div>
                      <div className="detail-price-col">
                        {saving > 0 && it.price !== undefined ? (
                          <>
                            <span className="price-strike">
                              {fmtArs(it.price)}
                            </span>
                            <strong className="price-offer">
                              {fmtArs(eff)}
                            </strong>
                            <span className="picker-saving-pill">-{pct}%</span>
                          </>
                        ) : (
                          <strong>{fmtArs(it.price)}</strong>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {detailTab === "history" && (
            <div className="detail-history-stack">
              <div className="telegram-lifecycle-bar">
                <div className="lifecycle-steps">
                  {lifecycleSteps.map((step, idx) => {
                    const isCurrent = step.key === offer.status;
                    const isDone = idx < meta.stepIndex;
                    return (
                      <div
                        key={step.key}
                        className={`lifecycle-step ${isCurrent ? "is-current" : ""} ${isDone ? "is-done" : ""}`}
                      >
                        <span className="lifecycle-dot">
                          {isDone ? <Check size={12} /> : idx + 1}
                        </span>
                        <span className="lifecycle-label">{step.label}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="lifecycle-hint">{meta.hint}</p>
              </div>

              <section className="detail-section">
                <h3>
                  <Users size={15} /> Clientes a los que ya se envió (
                  {offer.customers?.length ?? 0})
                </h3>
                {offer.customers && offer.customers.length > 0 ? (
                  <div className="detail-customer-pills">
                    {offer.customers.map(c => (
                      <div key={c.id} className="detail-customer-pill">
                        <span className="detail-cust-avatar">
                          {c.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <b>{c.name}</b>
                          <small>{c.phone || c.contact}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted-empty">
                    Todavía no se registraron envíos individuales para esta
                    oferta.
                  </p>
                )}
              </section>
            </div>
          )}
        </div>

        <footer className="modal-foot telegram-modal-foot">
          <div className="telegram-foot-secondary">
            {offer.canEdit && (
              <button
                type="button"
                className="button-secondary"
                onClick={onEdit}
                disabled={busy}
              >
                <Edit3 size={15} />
                <span>Editar oferta</span>
              </button>
            )}
            <button
              type="button"
              className="button-ghost"
              onClick={onDuplicate}
              disabled={busy}
            >
              <Copy size={15} />
              <span>Duplicar</span>
            </button>
            {offer.canDelete && (
              <button
                type="button"
                className="button-ghost danger"
                onClick={onDelete}
                disabled={busy}
              >
                <Trash2 size={15} />
                <span>Eliminar</span>
              </button>
            )}
          </div>

          <div className="modal-foot-actions">
            {offer.status === "Borrador" && (
              <button
                type="button"
                className="button-secondary"
                onClick={() => onTransition("Lista para enviar")}
                disabled={busy}
              >
                <CheckCircle2 size={15} />
                <span>Activar oferta</span>
              </button>
            )}
            {offer.status === "Enviada" && (
              <button
                type="button"
                className="button-secondary"
                onClick={() => onTransition("Archivada")}
                disabled={busy}
              >
                <Archive size={15} />
                <span>Archivar</span>
              </button>
            )}
            {(offer.status === "Archivada" || offer.status === "Cancelada") && (
              <button
                type="button"
                className="button-secondary"
                onClick={() => onTransition("Borrador")}
                disabled={busy}
              >
                <RotateCcw size={15} />
                <span>Reabrir como borrador</span>
              </button>
            )}
            <button
              type="button"
              className="button-whatsapp"
              onClick={onOpenWhatsApp}
              disabled={busy}
            >
              <MessageCircle size={15} />
              <span>Enviar por WhatsApp (wa.me)</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
