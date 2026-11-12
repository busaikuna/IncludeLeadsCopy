import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Columns3,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate, onLogout }) => {
  const location = useLocation();

  const navigationItems = [
    {
      path: '/funil',
      label: 'Funil de vendas',
      icon: Columns3,
      iconActiveColor: '#F05A22',
      iconInactiveColor: '#6b7a8e'
    },
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      iconActiveColor: '#F05A22',
      iconInactiveColor: '#6b7a8e'
    },
  ];

  return (
    <aside className="sidebar" role="navigation" aria-label="Menu principal">
      {/* Identidade */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          {/* Ícone do logo - usando SVG inline baseado no design do Figma */}
          <svg
            className="sidebar-logo-icon"
            viewBox="0 0 23 23"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="IncludeLeads"
          >
            <path
              d="M5.75 13.5V16.5H8.75V13.5H5.75Z"
              fill="#F05A22"
            />
            <path
              d="M11.5 5.75L8.75 8.75V16.5H14.25V8.75L11.5 5.75ZM12.25 14.25H10.75V12.75H12.25V14.25ZM12.25 10.25H10.75V8.75H12.25V10.25Z"
              fill="#F05A22"
            />
            <path
              d="M17.25 13.5H14.25V16.5H17.25V13.5Z"
              fill="#F05A22"
            />
          </svg>
          <span className="sidebar-logo-text">
            Include<span className="orange">Leads</span>
          </span>
        </div>
        <span className="sidebar-tagline">SEU PRÓXIMO NEGÓCIO</span>
      </div>

      {/* Navegação */}
      <nav className="sidebar-nav" aria-label="Navegação principal">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(item.path)}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className="icon"
                style={{ color: isActive ? item.iconActiveColor : item.iconInactiveColor }}
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Espaçador flexível */}
      <div className="sidebar-spacer" />

      {/* Conta */}
      <div className="sidebar-account">
        <button
          className="sidebar-logout"
          onClick={onLogout}
          aria-label="Sair da conta"
        >
          <LogOut className="icon" aria-hidden="true" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
