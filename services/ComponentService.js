// ComponentService.js
import axios from 'axios';

// CRITICAL FIX: Remove localhost fallback completely
const API_BASE_URL = import.meta.env.VITE_RE4DY_API_BASE || import.meta.env.VITE_API_URL || '';

console.log('[ComponentService] Initializing with no localhost fallbacks');
console.log('[ComponentService] API Base URL:', API_BASE_URL);

class ComponentService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  getApiBaseUrl() {
    return API_BASE_URL;
  }

  async getAllComponents() {
    const cacheKey = 'all_components';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      if (!API_BASE_URL) {
        throw new Error('API Base URL is not configured');
      }
      
      const fullUrl = `${API_BASE_URL}/components`;
      console.log('[ComponentService] Fetching from:', fullUrl);
      
      const response = await axios.get(fullUrl);
      const data = response.data;
      
      console.log('[ComponentService] Successfully loaded', data.length, 'components');
      
      this.cache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.error('[ComponentService] Error:', error);
      throw error;
    }
  }

  async searchComponents(searchTerm = '', category = '', supplier = '') {
    try {
      if (!API_BASE_URL) {
        throw new Error('API Base URL is not configured');
      }
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (category) params.append('category', category);
      if (supplier) params.append('supplier', supplier);
      
      const fullUrl = `${API_BASE_URL}/components/search?${params}`;
      const response = await axios.get(fullUrl);
      return response.data;
    } catch (error) {
      console.error('[ComponentService] Search error:', error);
      throw error;
    }
  }

  async getComponentById(id) {
    try {
      if (!API_BASE_URL) {
        throw new Error('API Base URL is not configured');
      }
      
      const fullUrl = `${API_BASE_URL}/components/${id}`;
      const response = await axios.get(fullUrl);
      return response.data;
    } catch (error) {
      console.error(`[ComponentService] Error fetching component ${id}:`, error);
      throw error;
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

export default new ComponentService();
