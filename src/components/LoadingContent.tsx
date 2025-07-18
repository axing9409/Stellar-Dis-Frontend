import React from 'react';
import { Box } from './Box';
import { performanceMonitor } from '../helpers/performance';

interface LoadingContentProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  showSpinner?: boolean;
  className?: string;
}

export const LoadingContent: React.FC<LoadingContentProps> = ({
  message = 'Loading...',
  size = 'medium',
  showSpinner = true,
  className = ''
}) => {
  const [showMessage, setShowMessage] = React.useState(false);

  React.useEffect(() => {
    performanceMonitor.startTimer('LoadingContent-render');
    
    // Show message after a delay to avoid flashing for fast loads
    const timer = setTimeout(() => {
      setShowMessage(true);
    }, 500);

    return () => {
      clearTimeout(timer);
      performanceMonitor.endTimer('LoadingContent-render');
    };
  }, []);

  const sizeClasses = {
    small: 'loading-content--small',
    medium: 'loading-content--medium',
    large: 'loading-content--large'
  };

  return (
    <Box className={`loading-content ${sizeClasses[size]} ${className}`}>
      {showSpinner && (
        <div className="loading-content__spinner">
          <div className="loading-content__spinner-circle"></div>
        </div>
      )}
      {showMessage && (
        <div className="loading-content__message">
          {message}
        </div>
      )}
    </Box>
  );
};

// Skeleton loading component for content placeholders
interface SkeletonProps {
  lines?: number;
  width?: string;
  height?: string;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  lines = 1,
  width = '100%',
  height = '20px',
  className = ''
}) => {
  return (
    <div className={`skeleton ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="skeleton__line"
          style={{ width, height }}
        />
      ))}
    </div>
  );
};

// Loading overlay for full-screen loading states
interface LoadingOverlayProps {
  message?: string;
  showBackdrop?: boolean;
  zIndex?: number;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = 'Loading...',
  showBackdrop = true,
  zIndex = 1000
}) => {
  return (
    <div 
      className={`loading-overlay ${showBackdrop ? 'loading-overlay--with-backdrop' : ''}`}
      style={{ zIndex }}
    >
      <div className="loading-overlay__content">
        <LoadingContent message={message} size="large" />
      </div>
    </div>
  );
};
