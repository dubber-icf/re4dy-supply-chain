import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { useAppState } from '../App';

// NOTE: MapVisualization now focuses on IP Screener patent alternatives only
// Removes component-supplier markers and shows competitive patent locations
const MapVisualization = () => {
  const { selectedComponent } = useAppState();
  const [mapData, setMapData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);

  // NOTE: Load patent alternatives when component is selected and analyzed
  useEffect(() => {
    if (selectedComponent && selectedComponent.patentData) {
      loadPatentAlternatives(selectedComponent.patentData);
    } else {
      // Clear map when no component selected or no patent data
      setMapData([]);
    }
  }, [selectedComponent]);

  const loadPatentAlternatives = async (patentData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // NOTE: Extract assignee/applicant locations from IP Screener response
      const alternatives = [];
      
      if (patentData.patents && patentData.patents.length > 0) {
        for (const patent of patentData.patents) {
          // Extract assignee information
          if (patent.assignee) {
            const location = await geocodeLocation(patent.assignee.location || patent.assignee.country);
            if (location) {
              alternatives.push({
                id: `assignee_${patent.id}`,
                name: patent.assignee.name,
                location: patent.assignee.location || patent.assignee.country,
                type: 'assignee',
                patentCount: 1,
                coordinates: location,
                patents: [patent]
              });
            }
          }
          
          // Extract applicant information if different from assignee
          if (patent.applicant && patent.applicant !== patent.assignee) {
            const location = await geocodeLocation(patent.applicant.location || patent.applicant.country);
            if (location) {
              alternatives.push({
                id: `applicant_${patent.id}`,
                name: patent.applicant.name,
                location: patent.applicant.location || patent.applicant.country,
                type: 'applicant',
                patentCount: 1,
                coordinates: location,
                patents: [patent]
              });
            }
          }
        }
      }
      
      // NOTE: Consolidate alternatives by location
      const consolidatedAlternatives = consolidateByLocation(alternatives);
      setMapData(consolidatedAlternatives);
      
    } catch (err) {
      console.error('[MapVisualization] Failed to load patent alternatives:', err);
      setError('Failed to load patent alternatives');
    } finally {
      setIsLoading(false);
    }
  };

  // NOTE: Simple geocoding function - in production, use proper geocoding service
  const geocodeLocation = async (location) => {
    if (!location) return null;
    
    // NOTE: Basic coordinate mapping for common locations
    // In production, replace with proper geocoding API
    const locationMap = {
      'United States': { lat: 39.8283, lng: -98.5795 },
      'USA': { lat: 39.8283, lng: -98.5795 },
      'Germany': { lat: 51.1657, lng: 10.4515 },
      'Japan': { lat: 36.2048, lng: 138.2529 },
      'United Kingdom': { lat: 55.3781, lng: -3.4360 },
      'UK': { lat: 55.3781, lng: -3.4360 },
      'China': { lat: 35.8617, lng: 104.1954 },
      'South Korea': { lat: 35.9078, lng: 127.7669 },
      'France': { lat: 46.6034, lng: 1.8883 },
      'Italy': { lat: 41.8719, lng: 12.5674 },
      'Canada': { lat: 56.1304, lng: -106.3468 },
      'Netherlands': { lat: 52.1326, lng: 5.2913 },
      'Sweden': { lat: 60.1282, lng: 18.6435 },
      'Switzerland': { lat: 46.8182, lng: 8.2275 }
    };
    
    return locationMap[location] || null;
  };

  // NOTE: Consolidate alternatives by location to avoid marker overlap
  const consolidateByLocation = (alternatives) => {
    const locationGroups = {};
    
    alternatives.forEach(alt => {
      const key = `${alt.coordinates.lat}_${alt.coordinates.lng}`;
      if (!locationGroups[key]) {
        locationGroups[key] = {
          ...alt,
          patents: [...alt.patents],
          companies: [alt.name]
        };
      } else {
        locationGroups[key].patentCount += alt.patentCount;
        locationGroups[key].patents.push(...alt.patents);
        if (!locationGroups[key].companies.includes(alt.name)) {
          locationGroups[key].companies.push(alt.name);
        }
      }
    });
    
    return Object.values(locationGroups);
  };

  // NOTE: Render empty state when no patent data available
  if (!selectedComponent || !selectedComponent.patentData) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Patent Alternatives Map</h3>
          <p className="text-gray-600 max-w-sm">
            Select a component and run IP Screener analysis to view patent assignee and applicant locations on the world map.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-gray-200 relative">
      {/* NOTE: Alternatives badge in corner */}
      <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm text-gray-600 border border-gray-200">
        Alternatives
      </div>
      
      {/* Map Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Patent Alternatives Map</h3>
        <p className="text-sm text-gray-600">
          {selectedComponent.name} - Competitive patent locations
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-gray-600">Loading patent alternatives...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Map Content */}
      {!isLoading && !error && (
        <div className="flex-1 relative">
          <div 
            ref={mapRef}
            className="w-full h-full bg-gray-100 rounded-b-lg flex items-center justify-center"
          >
            {mapData.length > 0 ? (
              <div className="text-center">
                <MapPin className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  {mapData.length} Patent Alternative{mapData.length !== 1 ? 's' : ''} Found
                </h4>
                <div className="space-y-2 max-w-md">
                  {mapData.slice(0, 5).map((location, index) => (
                    <div key={location.id} className="bg-white p-3 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{location.location}</p>
                          <p className="text-sm text-gray-600">
                            {location.companies.join(', ')} ({location.patentCount} patent{location.patentCount !== 1 ? 's' : ''})
                          </p>
                        </div>
                        <MapPin className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                  ))}
                  {mapData.length > 5 && (
                    <p className="text-sm text-gray-500">
                      +{mapData.length - 5} more locations
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No patent alternatives found for this component</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* NOTE: Future integration point for interactive map library */}
      {/* OPTIONAL: Replace with Leaflet or MapBox when available */}
      <div className="hidden">
        {/* Map integration placeholder - requires react-leaflet or similar */}
        <div id="interactive-map" className="w-full h-full" />
      </div>
    </div>
  );
};

export default MapVisualization;

