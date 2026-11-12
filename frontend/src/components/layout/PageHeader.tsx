import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  actionButton?: React.ReactNode;
  backAction?: () => void;
  showBackButton?: boolean;
  backButtonLabel?: string;
  backButtonIcon?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actionButton,
  backAction,
  showBackButton = false,
  backButtonLabel = 'Voltar ao funil',
  backButtonIcon = <ArrowLeft className="icon" aria-hidden="true" />
}) => {
  return (
    <div className="page-header animate-fade-in">
      <div className="page-header-left">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>

      <div className="page-header-right flex items-center gap-8">
        {showBackButton && backAction && (
          <button
            type="button"
            className="btn-secondary flex items-center gap-8"
            onClick={backAction}
          >
            {backButtonIcon}
            <span>{backButtonLabel}</span>
          </button>
        )}

        {actionButton && (
          <div className="flex-shrink-0">
            {actionButton}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;