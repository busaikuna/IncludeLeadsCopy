import React from 'react';
import { ChevronRight, CalendarDays } from 'lucide-react';

interface TopBarProps {
  currentPage: string;
  breadcrumbArea?: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentPage,
  breadcrumbArea = 'Área comercial'
}) => {
  // Formatar data atual em português (05 de novembro de 2026)
  const formatDate = () => {
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo'
    };
    return date.toLocaleDateString('pt-BR', options);
  };

  return (
    <header className="topbar" role="banner">
      <div className="topbar-left">
        <span className="topbar-area">{breadcrumbArea}</span>
        <ChevronRight className="topbar-separator" aria-hidden="true" />
        <span className="topbar-page">{currentPage}</span>
      </div>

      <div className="topbar-right">
        <div className="topbar-date">
          <CalendarDays className="icon" aria-hidden="true" />
          <span>{formatDate()}</span>
        </div>
      </div>
    </header>
  );
};

export default TopBar;