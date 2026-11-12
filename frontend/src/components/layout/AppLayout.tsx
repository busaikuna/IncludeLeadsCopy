import React from 'react';
import { Outlet, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { sessionKey } from '../../api';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  if (!sessionStorage.getItem(sessionKey)) return <Navigate to="/login" replace />;

  function signOut() {
    sessionStorage.removeItem(sessionKey);
    navigate('/login', { replace: true });
  }

  // Determinar página atual para breadcrumb
  const getCurrentPage = () => {
    switch (location.pathname) {
      case '/dashboard':
        return 'Dashboard';
      case '/funil':
        return 'Funil de vendas';
      case '/novo-lead':
        return 'Funil de vendas';
      default:
        if (location.pathname.startsWith('/lead/')) {
          return 'Funil de vendas';
        }
        return 'Dashboard';
    }
  };

  // Determinar área do breadcrumb
  const getBreadcrumbArea = () => {
    return 'Área comercial';
  };

  return (
    <div className="app-layout">
      <Sidebar onNavigate={navigate} onLogout={signOut} />
      <div className="workspace">
        <TopBar
          currentPage={getCurrentPage()}
          breadcrumbArea={getBreadcrumbArea()}
        />
        <main className="page-content" role="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
