import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import Home from "@/pages/Home";
import LoginPage from "@/pages/LoginPage";
import ProductsPage from "@/pages/ProductsPage";
import RegisterPage from "@/pages/RegisterPage";
import SalesHistoryPage from "@/pages/SalesHistoryPage";
import StockPage from "@/pages/StockPage";
import TicketPage from "@/pages/TicketPage";
import {
  TransfersHistoryPage,
  TransferReceiptPage,
} from "@/pages/TransfersPages";
import { ClientsPage, ClientDetailPage } from "@/pages/ClientsPages";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import TelegramOffersPage from "@/pages/TelegramOffersPage";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { StockAuthProvider, useStockAuth } from "./contexts/StockAuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";

function WorkspaceRoutes() {
  const { user, loading } = useStockAuth();
  if (loading)
    return (
      <div className="auth-loading">
        <span className="auth-loading-mark">S</span>
        <span>Preparando tu operación…</span>
      </div>
    );
  if (!user) return <Redirect to="/login" />;
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/products" component={ProductsPage} />
        <Route path="/products/new">
          <RequireRole roles={["administrador"]}>
            <Redirect to="/products?new=1" />
          </RequireRole>
        </Route>
        <Route path="/products/:id/edit">
          {params => (
            <RequireRole roles={["administrador"]}>
              <Redirect
                to={
                  params?.id
                    ? `/products?edit=${encodeURIComponent(params.id)}`
                    : "/products"
                }
              />
            </RequireRole>
          )}
        </Route>
        <Route path="/warehouses">
          <Redirect to="/stock" />
        </Route>
        <Route path="/stock" component={StockPage} />
        <Route path="/alerts">
          <Redirect to="/stock?filter=low" />
        </Route>
        <Route path="/sales/new">
          <RequireRole roles={["administrador", "caja"]}>
            <Redirect to="/sales?new=1" />
          </RequireRole>
        </Route>
        <Route path="/sales" component={SalesHistoryPage} />
        <Route path="/sales/:id/ticket" component={TicketPage} />
        <Route path="/transfers/new">
          <RequireRole roles={["administrador", "deposito"]}>
            <Redirect to="/transfers?new=1" />
          </RequireRole>
        </Route>
        <Route path="/transfers/:id/receipt" component={TransferReceiptPage} />
        <Route path="/transfers" component={TransfersHistoryPage} />
        <Route path="/clients/:id" component={ClientDetailPage} />
        <Route path="/clients" component={ClientsPage} />
        <Route path="/telegram" component={TelegramOffersPage} />
        <Route path="/reports">
          <RequireRole roles={["administrador"]}>
            <ReportsPage />
          </RequireRole>
        </Route>
        <Route path="/settings">
          <RequireRole roles={["administrador"]}>
            <SettingsPage />
          </RequireRole>
        </Route>
        <Route path="/team">
          <Redirect to="/" />
        </Route>
        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
    </DashboardLayout>
  );
}

function RequireRole({
  roles,
  children,
}: {
  roles: Array<"administrador" | "caja" | "deposito">;
  children: React.ReactNode;
}) {
  const { user } = useStockAuth();
  return user && roles.includes(user.appRole) ? (
    <>{children}</>
  ) : (
    <Redirect to="/" />
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route component={WorkspaceRoutes} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <StockAuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </StockAuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
