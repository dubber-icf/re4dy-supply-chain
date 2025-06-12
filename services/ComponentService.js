// Ultra-simplified ComponentService.js - NO LOCALHOST REFERENCES
console.log('[ComponentService] Initializing with no localhost fallbacks');

const API_BASE_URL = import.meta.env.VITE_RE4DY_API_BASE || import.meta.env.VITE_API_URL || '';
console.log('[ComponentService] API Base URL:', API_BASE_URL);

class ComponentService {
  constructor() {
    this.cache = new Map();
  }

  getApiBaseUrl() {
    return API_BASE_URL;
  }

  async getAllComponents() {
    try {
      if (!API_BASE_URL) {
        throw new Error('API Base URL is not configured');
      }
      
      const url = `${API_BASE_URL}/components`;
      console.log('[ComponentService] Fetching from:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[ComponentService] Successfully loaded', data.length, 'components');
      return data;
    } catch (error) {
      console.error('[ComponentService] Error:', error);
      throw error;
    }
  }

  async searchComponents(searchTerm = '', category = '', supplier = '') {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (category) params.append('category', category);
      if (supplier) params.append('supplier', supplier);
      
      const url = `${API_BASE_URL}/components/search?${params}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('[ComponentService] Search error:', error);
      throw error;
    }
  }

  async getComponentById(id) {
    try {
      const url = `${API_BASE_URL}/components/${id}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`[ComponentService] Error fetching component ${id}:`, error);
      throw error;
    }
  }
}

export default new ComponentService();
