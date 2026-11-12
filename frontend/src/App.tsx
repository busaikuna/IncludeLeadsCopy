import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { FunnelPage } from './pages/FunnelPage';
import { DashboardPage } from './pages/DashboardPage';
import { LeadDetailPage } from './pages/LeadDetailPage';
import { NewLeadPage } from './pages/NewLeadPage';
import { AppLayout } from './components/layout/AppLayout';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota da tela de login (sem layout) */}
        <Route path="/login" element={<LoginPage />} />

        {/* Funil de vendas - mantém layout original (dark theme com header próprio) */}
        <Route path="/funil" element={<FunnelPage />} />
        <Route path="/lead/:id" element={<LeadDetailPage />} />

        {/* Rotas protegidas com novo layout (sidebar + topbar) */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/novo-lead" element={<NewLeadPage />} />
        </Route>

        {/* Redirecionamento padrão para /funil */}
        <Route path="*" element={<Navigate to="/funil" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
