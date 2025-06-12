// NOTE: ComponentService handles all API calls to Flask backend - PRODUCTION READY
import axios from 'axios';

// NOTE: Use build-time injected API base or environment variable
const API_BASE_URL = typeof __API_BASE__ !== 'undefined' 
  ? __API_BASE__ 
  : import.meta.env.VITE_RE4DY_API_BASE 
  || 'https://re4dy-supply-chain.onrender.com/api';

// NOTE: Fail build if localhost detected in production
if (import.meta.env.PROD && API_BASE_URL.includes('localhost' )) {
  throw new Error('PRODUCTION BUILD ERROR: localhost API detected. Set VITE_RE4DY_API_BASE environment variable.');
}

// NOTE: Log the exact URL being used for debugging
console.log('[ComponentService] API Base URL:', API_BASE_URL);

class ComponentService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // NOTE: Get the current API base URL for debugging
  getApiBaseUrl() {
    return API_BASE_URL;
  }

  // NOTE: Fetch all components from PostgreSQL database
  async getAllComponents() {
    const cacheKey = 'all_components';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const fullUrl = `${API_BASE_URL}/components`;
      console.log('[ComponentService] Fetching components from:', fullUrl);
      
      const response = await axios.get(fullUrl, {
        timeout: 30000, // 30 second timeout
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      // NOTE: Handle both array response and object with components array
      const data = response.data.components || response.data;
      console.log('[ComponentService] Successfully loaded', data.length, 'components');
      
      this.cache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.error('[ComponentService] Failed to fetch components:', error);
      console.error('[ComponentService] Request URL was:', `${API_BASE_URL}/components`);
      
      // NOTE: Provide detailed error information for debugging
      if (error.response) {
        console.error('[ComponentService] Response status:', error.response.status);
        console.error('[ComponentService] Response data:', error.response.data);
      } else if (error.request) {
        console.error('[ComponentService] No response received - check CORS and network');
      } else {
        console.error('[ComponentService] Request setup error:', error.message);
      }
      
      throw new Error(`Backend offline. Check RE4DY_API_BASE: ${API_BASE_URL}/components`);
    }
  }

  // NOTE: Search components with filters
  async searchComponents(searchTerm = '', category = '', supplier = '') {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (category) params.append('category', category);
      if (supplier) params.append('supplier', supplier);
      
      const fullUrl = `${API_BASE_URL}/components/search?${params}`;
      console.log('[ComponentService] Searching components:', fullUrl);
      
      const response = await axios.get(fullUrl, {
        timeout: 30000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      return response.data.components || response.data;
    } catch (error) {
      console.error('[ComponentService] Failed to search components:', error);
      throw new Error('Search failed. Please try again.');
    }
  }

  // NOTE: Get component by ID with full details
  async getComponentById(id) {
    const cacheKey = `component_${id}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const fullUrl = `${API_BASE_URL}/components/${id}`;
      console.log('[ComponentService] Fetching component by ID:', fullUrl);
      
      const response = await axios.get(fullUrl, {
        timeout: 30000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const data = response.data;
      
      this.cache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.error(`[ComponentService] Failed to fetch component ${id}:`, error);
      throw new Error('Unable to load component details.');
    }
  }

  // NOTE: Get unique categories for filtering
  async getCategories() {
    const cacheKey = 'categories';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/categories`, {
        timeout: 30000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const data = response.data;
      
      this.cache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.error('[ComponentService] Failed to fetch categories:', error);
      return []; // Graceful fallback
    }
  }

  // NOTE: Get unique suppliers for filtering
  async getSuppliers() {
    const cacheKey = 'suppliers';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/suppliers`, {
        timeout: 30000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const data = response.data;
      
      this.cache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.error('[ComponentService] Failed to fetch suppliers:', error);
      return []; // Graceful fallback
    }
  }

  // NOTE: Clear cache when needed
  clearCache() {
    this.cache.clear();
  }
}

export default new ComponentService();
