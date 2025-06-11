import React from 'react';
import { AlertTriangle, RefreshCw, Wifi, WifiOff, Clock, XCircle } from 'lucide-react';

const ErrorBoundary = ({ children, fallback }) => {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const handleError = (error) => {
      setHasError(true);
      setError(error);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  if (hasError) {
    return fallback || (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start">
          <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Something went wrong</h3>
            <p className="text-sm text-red-700 mt-1">
              {error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => {
                setHasError(false);
                setError(null);
                window.location.reload();
              }}
              className="text-sm text-red-600 hover:text-red-800 mt-2 underline"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

const NetworkErrorHandler = ({ error, onRetry, retryCount = 0 }) => {
  const getErrorMessage = () => {
    if (error?.message?.includes('fetch')) {
      return 'Network connection failed. Please check your internet connection.';
    }
    if (error?.message?.includes('timeout')) {
      return 'Request timed out. The server may be busy.';
    }
    if (error?.message?.includes('CORS')) {
      return 'Cross-origin request blocked. Please check server configuration.';
    }
    if (error?.message?.includes('404')) {
      return 'API endpoint not found. Please check the server URL.';
    }
    if (error?.message?.includes('500')) {
      return 'Server error. Please try again later.';
    }
    return error?.message || 'An unknown error occurred';
  };

  const getRetryDelay = () => {
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    return Math.min(Math.pow(2, retryCount) * 1000, 30000);
  };

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-start">
        <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">Connection Error</h3>
          <p className="text-sm text-yellow-700 mt-1">{getErrorMessage()}</p>
          
          {retryCount > 0 && (
            <p className="text-xs text-yellow-600 mt-1">
              Retry attempt {retryCount}/3
            </p>
          )}
          
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={onRetry}
              className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-200 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Retry now
            </button>
            
            {retryCount < 3 && (
              <span className="text-xs text-yellow-600">
                Auto-retry in {Math.ceil(getRetryDelay() / 1000)}s
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const LoadingWithTimeout = ({ 
  isLoading, 
  timeout = 30000, 
  onTimeout, 
  children,
  loadingMessage = "Loading...",
  timeoutMessage = "This is taking longer than expected"
}) => {
  const [hasTimedOut, setHasTimedOut] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading) {
      setHasTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      setHasTimedOut(true);
      if (onTimeout) onTimeout();
    }, timeout);

    return () => clearTimeout(timer);
  }, [isLoading, timeout, onTimeout]);

  if (isLoading && hasTimedOut) {
    return (
      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <div className="flex items-start">
          <Clock className="w-5 h-5 text-orange-400 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-orange-800">Taking longer than expected</h3>
            <p className="text-sm text-orange-700 mt-1">{timeoutMessage}</p>
            <p className="text-xs text-orange-600 mt-1">
              The IP Screener API typically takes 15-30 seconds to respond.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  return children;
};

const ConnectionStatus = ({ isOnline, lastSuccessfulConnection }) => {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div className="flex items-center gap-2 text-xs">
      {isOnline ? (
        <>
          <Wifi className="w-3 h-3 text-green-500" />
          <span className="text-green-600">Connected</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3 text-red-500" />
          <span className="text-red-600">Offline</span>
        </>
      )}
      
      {lastSuccessfulConnection && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-gray-500 hover:text-gray-700"
        >
          (details)
        </button>
      )}
      
      {showDetails && lastSuccessfulConnection && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-white border rounded shadow-lg z-10">
          <p className="text-xs text-gray-600">
            Last successful: {new Date(lastSuccessfulConnection).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
};

const APIKeyValidator = ({ apiKey, onValidate }) => {
  const [isValidating, setIsValidating] = React.useState(false);
  const [validationResult, setValidationResult] = React.useState(null);

  const validateKey = async () => {
    if (!apiKey) {
      setValidationResult({ valid: false, message: 'API key is required' });
      return;
    }

    setIsValidating(true);
    try {
      // Simple validation - check format
      if (apiKey.length < 10) {
        throw new Error('API key appears to be too short');
      }
      
      if (!/^[a-zA-Z0-9#&]+$/.test(apiKey)) {
        throw new Error('API key contains invalid characters');
      }

      setValidationResult({ valid: true, message: 'API key format is valid' });
      if (onValidate) onValidate(true);
      
    } catch (error) {
      setValidationResult({ valid: false, message: error.message });
      if (onValidate) onValidate(false);
    } finally {
      setIsValidating(false);
    }
  };

  React.useEffect(() => {
    if (apiKey) {
      validateKey();
    }
  }, [apiKey]);

  if (!apiKey) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded">
        <p className="text-sm text-red-700">
          IP Screener API key not configured. Please set IPS_DATA_KEY environment variable.
        </p>
      </div>
    );
  }

  return (
    <div className={`p-3 border rounded ${
      validationResult?.valid 
        ? 'bg-green-50 border-green-200' 
        : 'bg-red-50 border-red-200'
    }`}>
      <div className="flex items-center gap-2">
        {isValidating ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        ) : validationResult?.valid ? (
          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
        ) : (
          <div className="w-4 h-4 bg-red-500 rounded-full"></div>
        )}
        
        <span className={`text-sm ${
          validationResult?.valid ? 'text-green-700' : 'text-red-700'
        }`}>
          {validationResult?.message || 'Validating API key...'}
        </span>
      </div>
    </div>
  );
};

const RetryableOperation = ({ 
  operation, 
  maxRetries = 3, 
  retryDelay = 1000,
  onSuccess,
  onFailure,
  children 
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [retryCount, setRetryCount] = React.useState(0);

  const executeOperation = async (attempt = 0) => {
    setIsLoading(true);
    setError(null);
    setRetryCount(attempt);

    try {
      const result = await operation();
      setIsLoading(false);
      setRetryCount(0);
      if (onSuccess) onSuccess(result);
      return result;
    } catch (err) {
      console.error(`Operation failed (attempt ${attempt + 1}):`, err);
      
      if (attempt < maxRetries) {
        // Auto-retry with exponential backoff
        const delay = retryDelay * Math.pow(2, attempt);
        setTimeout(() => {
          executeOperation(attempt + 1);
        }, delay);
      } else {
        setIsLoading(false);
        setError(err);
        if (onFailure) onFailure(err);
      }
    }
  };

  const manualRetry = () => {
    executeOperation(0);
  };

  return children({
    execute: executeOperation,
    retry: manualRetry,
    isLoading,
    error,
    retryCount
  });
};

export {
  ErrorBoundary,
  NetworkErrorHandler,
  LoadingWithTimeout,
  ConnectionStatus,
  APIKeyValidator,
  RetryableOperation
};

