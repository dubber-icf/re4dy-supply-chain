import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader2, Copy, Eye, EyeOff } from 'lucide-react';
import { useAppState } from '../App';
import ComponentService from '../services/ComponentService';

// NOTE: HealthCheck component with debug mode and hidden normal access
const HealthCheck = () => {
  const { components } = useAppState();
  const [healthData, setHealthData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDebugMode, setShowDebugMode] = useState(false);

  // NOTE: Check if debug mode is enabled via query parameter
  const isDebugMode = new URLSearchParams(window.location.search).get('debug') === '1';

  useEffect(() => {
    loadHealthData();
  }, []);

  const loadHealthData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // NOTE: Get current commit hash from build info or environment
      const buildInfo = {
        commit: process.env.VITE_COMMIT_HASH || 'unknown',
        buildTime: process.env.VITE_BUILD_TIME || new Date().toISOString(),
        version: process.env.VITE_VERSION || '1.0.0'
      };

      // NOTE: Test backend connectivity
      let backendStatus = 'OK';
      let componentsLoaded = components.length;
      
      try {
        const testComponents = await ComponentService.getAllComponents();
        componentsLoaded = testComponents.length;
        backendStatus = 'OK';
      } catch (err) {
        backendStatus = 'ERROR';
        console.error('[HealthCheck] Backend connectivity test failed:', err);
      }

      // NOTE: Basic health check JSON as specified in C.R.A.F.T. prompt
      const basicHealthData = {
        componentsLoaded,
        backend: backendStatus,
        build: buildInfo.commit
      };

      // NOTE: Extended diagnostic data for debug mode
      const extendedHealthData = {
        ...basicHealthData,
        timestamp: new Date().toISOString(),
        apiBaseUrl: ComponentService.getApiBaseUrl(),
        environment: {
          isDev: import.meta.env.DEV,
          mode: import.meta.env.MODE,
          baseUrl: import.meta.env.BASE_URL
        },
        buildInfo,
        performance: {
          loadTime: performance.now(),
          memory: performance.memory ? {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
          } : null
        },
        features: {
          virtualScroll: true,
          ipScreener: true,
          mapView: true,
          crossViewSync: true
        }
      };

      setHealthData(isDebugMode ? extendedHealthData : basicHealthData);
      
      // NOTE: Expose to window for console verification
      window.RE4DY_HEALTH = isDebugMode ? extendedHealthData : basicHealthData;
      
    } catch (err) {
      console.error('[HealthCheck] Failed to load health data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyHealthData = () => {
    if (healthData) {
      navigator.clipboard.writeText(JSON.stringify(healthData, null, 2));
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'OK':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'ERROR':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'OK':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'ERROR':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading health check...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Health Check Failed</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadHealthData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">System Health Check</h1>
              <p className="text-gray-600">Supply Chain Visualiser - Status Dashboard</p>
            </div>
            <div className="flex items-center space-x-2">
              {!isDebugMode && (
                <button
                  onClick={() => setShowDebugMode(!showDebugMode)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Toggle Debug View"
                >
                  {showDebugMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              )}
              <button
                onClick={copyHealthData}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Copy Health Data"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* NOTE: Debug mode indicator */}
          {isDebugMode && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-sm">
                <strong>Debug Mode Active</strong> - Full diagnostic dashboard enabled via ?debug=1
              </p>
            </div>
          )}
        </div>

        {/* Basic Health Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Components Loaded</p>
                <p className="text-2xl font-bold text-gray-900">{healthData.componentsLoaded}</p>
              </div>
              {getStatusIcon(healthData.componentsLoaded > 0 ? 'OK' : 'ERROR')}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Backend Status</p>
                <p className={`text-2xl font-bold ${healthData.backend === 'OK' ? 'text-green-600' : 'text-red-600'}`}>
                  {healthData.backend}
                </p>
              </div>
              {getStatusIcon(healthData.backend)}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Build Version</p>
                <p className="text-lg font-mono text-gray-900">
                  {healthData.build.substring(0, 8)}
                </p>
              </div>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        {/* Basic JSON Output */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Health Check JSON</h2>
          <pre className="bg-gray-50 p-4 rounded-lg text-sm font-mono overflow-x-auto">
            {JSON.stringify(isDebugMode || showDebugMode ? healthData : {
              componentsLoaded: healthData.componentsLoaded,
              backend: healthData.backend,
              build: healthData.build
            }, null, 2)}
          </pre>
        </div>

        {/* Extended Diagnostic Dashboard (Debug Mode Only) */}
        {(isDebugMode || showDebugMode) && healthData.environment && (
          <>
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Environment Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Development Mode</p>
                  <p className="text-gray-900">{healthData.environment.isDev ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Build Mode</p>
                  <p className="text-gray-900">{healthData.environment.mode}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">API Base URL</p>
                  <p className="text-gray-900 font-mono text-sm">{healthData.apiBaseUrl}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Base URL</p>
                  <p className="text-gray-900 font-mono text-sm">{healthData.environment.baseUrl}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Load Time</p>
                  <p className="text-gray-900">{Math.round(healthData.performance.loadTime)}ms</p>
                </div>
                {healthData.performance.memory && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Memory Used</p>
                      <p className="text-gray-900">{healthData.performance.memory.used}MB</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Memory Total</p>
                      <p className="text-gray-900">{healthData.performance.memory.total}MB</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Memory Limit</p>
                      <p className="text-gray-900">{healthData.performance.memory.limit}MB</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Feature Status</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(healthData.features).map(([feature, enabled]) => (
                  <div key={feature} className={`p-3 rounded-lg border ${getStatusColor(enabled ? 'OK' : 'ERROR')}`}>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(enabled ? 'OK' : 'ERROR')}
                      <span className="text-sm font-medium capitalize">
                        {feature.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Back to App */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ← Back to Supply Chain Visualiser
          </a>
        </div>
      </div>
    </div>
  );
};

export default HealthCheck;

