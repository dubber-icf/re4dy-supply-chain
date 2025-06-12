// NOTE: ComponentService handles all API calls to Flask backend for component data
import axios from 'axios';

// CRITICAL FIX: Remove localhost fallback to prevent CORS errors in production
const API_BASE_URL = import.meta.env.VITE_RE4DY_API_BASE || import.meta.env.VITE_API_URL || '';

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
      // CRITICAL FIX: Check if API_BASE_URL is empty and throw clear error
      if (!API_BASE_URL) {
        throw new Error('API Base URL is not configured. Please set VITE_RE4DY_API_BASE environment variable.');
      }
      
      const fullUrl = `${API_BASE_URL}/components`;
      console.log('[ComponentService] Fetching components from:', fullUrl);
      
      const response = await axios.get(fullUrl, {
        timeout: 30000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const data = response.data;
      console.log('[ComponentService] Successfully loaded', data.length, 'components');
      
      this.cache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.error('[ComponentService] Failed to fetch components:', error);
      
      // NOTE: Provide detailed error information for debugging
      if (error.response) {
        console.error('[ComponentService] Response status:', error.response.status);
        console.error('[ComponentService] Response data:', error.response.data);
      } else if (error.request) {
        console.error('[ComponentService] No response received');
      } else {
        console.error('[ComponentService] Request setup error:', error.message);
      }
      
      throw error;
    }
  }

  // NOTE: Search components by name, category, or supplier
  async searchComponents(searchTerm = '', category = '', supplier = '') {
    try {
      // CRITICAL FIX: Check if API_BASE_URL is empty and throw clear error
      if (!API_BASE_URL) {
        throw new Error('API Base URL is not configured. Please set VITE_RE4DY_API_BASE environment variable.');
      }
      
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
      
      const data = response.data;
      console.log('[ComponentService] Search returned', data.length, 'components');
      
      return data;
    } catch (error) {
      console.error('[ComponentService] Failed to search components:', error);
      throw error;
    }
  }

  // NOTE: Get component by ID
  async getComponentById(id) {
    try {
      // CRITICAL FIX: Check if API_BASE_URL is empty and throw clear error
      if (!API_BASE_URL) {
        throw new Error('API Base URL is not configured. Please set VITE_RE4DY_API_BASE environment variable.');
      }
      
      const fullUrl = `${API_BASE_URL}/components/${id}`;
      console.log('[ComponentService] Fetching component by ID:', fullUrl);
      
      const response = await axios.get(fullUrl, {
        timeout: 30000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error(`[ComponentService] Failed to fetch component ${id}:`, error);
      throw error;
    }
  }

  // NOTE: Get all categories
  async getCategories() {
    try {
      // CRITICAL FIX: Check if API_BASE_URL is empty and throw clear error
      if (!API_BASE_URL) {
        throw new Error('API Base URL is not configured. Please set VITE_RE4DY_API_BASE environment variable.');
      }
      
      const fullUrl = `${API_BASE_URL}/categories`;
      console.log('[ComponentService] Fetching categories:', fullUrl);
      
      const response = await axios.get(fullUrl, {
        timeout: 30000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('[ComponentService] Failed to fetch categories:', error);
      return []; // Graceful fallback
    }
  }

  // NOTE: Get all suppliers
  async getSuppliers() {
    try {
      // CRITICAL FIX: Check if API_BASE_URL is empty and throw clear error
      if (!API_BASE_URL) {
        throw new Error('API Base URL is not configured. Please set VITE_RE4DY_API_BASE environment variable.');
      }
      
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
