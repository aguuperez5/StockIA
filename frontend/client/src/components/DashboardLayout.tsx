import { ArrowRightLeft, BarChart3, Boxes, ClipboardList, LayoutDashboard, LogOut, MapPin, Menu, Moon, PackagePlus, ReceiptText, Send, ShoppingCart, Store, Sun, Users, Warehouse, X } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useStockAuth } from "@/contexts/StockAuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const navigation = [
  { label: "Resumen", path: "/", icon: LayoutDashboard },
  { label: "Productos", path: "/products", icon: Boxes },
  { label: "Nuevo producto", path: "/products/new", icon: PackagePlus, roles: ["administrador"] },
  { label: "Depósitos", path: "/warehouses", icon: Warehouse, roles: ["administrador", "deposito"] },
  { label: "Stock", path: "/stock", icon: ClipboardList },
  { label: "Nueva venta", path: "/sales/new", icon: ShoppingCart },
  { label: "Ventas", path: "/sales", icon: ReceiptText },
  { label: "Transferencias", path: "/transfers", icon: ArrowRightLeft, roles: ["administrador", "deposito"] },
  { label: "Clientes", path: "/clients", icon: Users, roles: ["administrador", "caja"] },
  { label: "Telegram", path: "/telegram", icon: Send, roles: ["administrador", "caja"] },
  { label: "Reportes", path: "/reports", icon: BarChart3, roles: ["administrador"] },
  { label: "Equipo", path: "/team", icon: Users, roles: ["administrador"] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useStockAuth();
  const { theme, toggleTheme } = useTheme();
  const visibleNavigation = navigation.filter(item => !item.roles || item.roles.includes(user?.appRole ?? "caja"));
  const active = visibleNavigation.find(item => location === item.path || (item.path === "/products" && location.startsWith("/products/")));
  const navigate = (path: string) => { setLocation(path); setMobileOpen(false); };
  const initials = user?.fullName.split(" ").map(part => part[0]).slice(0, 2).join("").toUpperCase() || "ST";

  return <div className="app-shell">
    <aside className={`side-rail ${mobileOpen ? "side-rail-open" : ""}`} aria-label="Navegación principal">
      <div className="brand-block" onClick={() => navigate("/")} role="button" tabIndex={0}><span className="brand-mark"><Store size={19} strokeWidth={2.4} /></span><span><b>Stock</b><em>IA</em><small>gestión comercial</small></span><button className="mobile-close" onClick={event => { event.stopPropagation(); setMobileOpen(false); }} aria-label="Cerrar navegación"><X size={19} /></button></div>
      <nav className="nav-list"><p className="nav-caption">Operación</p>{visibleNavigation.map(item => { const isActive = item.path === "/products" ? location === "/products" || location.startsWith("/products/") : item.path === location; return <button key={item.path} className={`nav-entry ${isActive ? "nav-active" : ""}`} onClick={() => navigate(item.path)}><item.icon size={18} /><span>{item.label}</span></button>; })}</nav>
      <div className="rail-bottom"><button className="profile-chip" onClick={() => void logout().then(() => navigate("/login"))}><span className="profile-avatar">{initials}</span><span><b>{user?.fullName || "Mi cuenta"}</b><small>{user?.email || "Sesión activa"}</small></span><LogOut size={15} /></button><div className="workspace-chip"><span className="workspace-icon"><MapPin size={14} /></span><span><b>Mi comercio</b><small>Operación activa</small></span></div></div>
    </aside>
    {mobileOpen && <button className="mobile-backdrop" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú" />}
    <section className="main-stage"><header className="topbar"><div className="topbar-leading"><button className="menu-button" onClick={() => setMobileOpen(true)} aria-label="Abrir navegación"><Menu size={21} /></button><span className="section-kicker">{active?.label ?? "StockIA"}</span></div><div className="topbar-trailing"><div className="topbar-status"><span className="live-dot" />Sesión protegida</div><button className="theme-toggle" onClick={toggleTheme} aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"} title={theme === "dark" ? "Modo claro" : "Modo oscuro"}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button></div></header><main className="page-content">{children}</main></section>
  </div>;
}
