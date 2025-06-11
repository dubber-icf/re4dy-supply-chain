import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Info, XCircle, X } from 'lucide-react';

interface StatusBannerProps {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  isVisible: boolean;
  onDismiss?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

// NOTE: ARIA-compliant status banner for accessibility
// Uses aria-live for screen reader announcements
export function StatusBanner({
  type,
  message,
  isVisible,
  onDismiss,
  autoHide = true,
  autoHideDelay = 3000
}: StatusBannerProps) {
  const [shouldRender, setShouldRender] = useState(isVisible);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      
      if (autoHide && type === 'success') {
        const timer = setTimeout(() => {
          onDismiss?.();
        }, autoHideDelay);
        
        return () => clearTimeout(timer);
      }
    } else {
      // Delay unmounting to allow exit animation
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, autoHide, autoHideDelay, type, onDismiss]);

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5" />;
      case 'warning': return <AlertCircle className="w-5 h-5" />;
      case 'error': return <XCircle className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const getStyles = () => {
    const baseStyles = "flex items-center gap-3 px-4 py-3 rounded-lg border shadow-sm";
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-50 border-green-200 text-green-800`;
      case 'warning':
        return `${baseStyles} bg-yellow-50 border-yellow-200 text-yellow-800`;
      case 'error':
        return `${baseStyles} bg-red-50 border-red-200 text-red-800`;
      default:
        return `${baseStyles} bg-blue-50 border-blue-200 text-blue-800`;
    }
  };

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-40 max-w-md transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className={getStyles()}>
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="flex-1 text-sm font-medium">
          {message}
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 rounded-full hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

