import React, { useState } from "react";
import {
  Bell, Box, FileBarChart, Home, Menu, Package, PackageSearch,
  Receipt, ShoppingCart, Users, Warehouse, X, ArrowRightLeft
} from "lucide-react";
import {
  Routes, Route, NavLink, useLocation, useNavigate
} from "react-router-dom";
import { useAppData } from "./context/AppDataContext";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import ProductList from "./pages/products/ProductList";
import ProductForm from "./pages/products/ProductForm";
import DepositList from "./pages/deposits/DepositList";
import DepositForm from "./pages/deposits/DepositForm";
import Transferencias from "./pages/deposits/Transferencias";
import NewTransfer from "./pages/deposits/NewTransfer";
import StockQuery from "./pages/stock/StockQuery";
import NewSale from "./pages/sales/NewSale";
import SalesHistory from "./pages/sales/SalesHistory";

const navGroups = [
  { label: "OPERACIONES", items: [
    { to: "/panel", label: "Panel", icon: Home, end: true },
    { to: "/panel/nueva-venta", label: "Nueva Venta", icon: ShoppingCart },
    { to: "/panel/ventas", label: "Historial de Ventas", icon: Receipt },
    { to: "/panel/transferencias", label: "Transferencias", icon: ArrowRightLeft },
  ]},
  { label: "INVENTARIO", items: [
    { to: "/panel/productos", label: "Productos", icon: Package },
    { to: "/panel/stock", label: "Stock", icon: PackageSearch },
    { to: "/panel/depositos", label: "Depósitos", icon: Warehouse },
    { to: "/panel/clientes", label: "Clientes", icon: Users },
  ]},
  { label: "ANÁLISIS", items: [
    { to: "/panel/reportes", label: "Reportes", icon: FileBarChart },
  ]}
];

function App() {
  return (
    <Routes>
      <Route path="/" element={<NavigateTo to="/login" />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/registro" element={<AuthPage mode="register" />} />
      <Route path="/panel/*" element={<AppShell />} />
      <Route path="*" element={<NavigateTo to="/login" />} />
    </Routes>
  );
}

function NavigateTo({ to }) {
  const navigate = useNavigate();
  React.useEffect(() => navigate(to, { replace: true }), [navigate, to]);
  return null;
}

function AppShell() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { apiStatus } = useAppData();

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Box size={20} /></div>
          <div>
            <strong>STOCKAI</strong>
            <small>v2.1.0</small>
          </div>
          <button className="mobile-close" onClick={() => setMobileOpen(false)}><X size={18}/></button>
        </div>

        <nav className="side-nav">
          {navGroups.map(group => (
            <div className="nav-group" key={group.label}>
              <div className="nav-label">{group.label}</div>
              {group.items.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({isActive}) => `nav-item ${isActive ? "active" : ""}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="user-mini">
          <div className="avatar">JM</div>
          <div className="user-mini-copy">
            <strong>Juan M.</strong>
            <span>Sucursal Principal</span>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)}><Menu size={20}/></button>
          <div className="topbar-right">
            <ApiStatusBadge status={apiStatus} />
            <span className="separator" />
            <button className="icon-button notification"><Bell size={17}/><i /></button>
            <span className="separator" />
            <span>Depósito Principal</span>
          </div>
        </header>

        <main className="content" key={location.pathname}>
          <Routes>
            <Route index element={<Dashboard />} />

            <Route path="nueva-venta" element={<NewSale />} />
            <Route path="ventas" element={<SalesHistory />} />

            <Route path="transferencias" element={<Transferencias />} />
            <Route path="transferencias/nueva" element={<NewTransfer />} />

            <Route path="productos" element={<ProductList />} />
            <Route path="productos/nuevo" element={<ProductForm mode="create" />} />
            <Route path="productos/:id/editar" element={<ProductForm mode="edit" />} />

            <Route path="stock" element={<StockQuery />} />

            <Route path="depositos" element={<DepositList />} />
            <Route path="depositos/nuevo" element={<DepositForm />} />

            <Route path="clientes" element={<Placeholder title="Clientes" icon={Users} />} />
            <Route path="reportes" element={<Placeholder title="Reportes" icon={FileBarChart} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function ApiStatusBadge({ status }) {
  if (status === "online") return <span className="status green" title="Conectado al servidor">CONECTADO</span>;
  if (status === "demo") return <span className="status yellow" title="Sin conexión con el servidor, guardando en memoria">MODO DEMO</span>;
  return <span className="status gray">VERIFICANDO...</span>;
}

function Placeholder({ title, icon: Icon }) {
  return (
    <section className="placeholder-page">
      <div className="placeholder-icon"><Icon size={30}/></div>
      <h1>{title}</h1>
      <p>Esta sección no forma parte del alcance actual del backlog. La estructura queda preparada para conectarla al backend.</p>
    </section>
  );
}

export default App;
