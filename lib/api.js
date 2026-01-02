// API configuration and utilities
// Get base URL from environment variable
const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

// Normalize and get API base URL (checks protocol at runtime to handle HTTPS pages)
function getApiBaseUrl() {
  // If no env variable, use default local backend
  if (!RAW_API_BASE_URL || RAW_API_BASE_URL === 'http://localhost:4000') {
    return RAW_API_BASE_URL;
  }
  
  // Remove any trailing slashes
  let url = RAW_API_BASE_URL.trim().replace(/\/+$/, '');
  
  // If it's a relative URL (starts with /), prepend with current origin
  if (url.startsWith('/')) {
    if (typeof window !== 'undefined') {
      url = `${window.location.origin}${url}`;
    } else {
      // Server-side: use default
      return 'http://localhost:4000';
    }
  }
  
  // If URL doesn't start with http:// or https://, determine protocol
  if (!url.match(/^https?:\/\//)) {
    // Check if we're in a production environment (HTTPS) or if domain suggests production
    const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const isProductionDomain = url.includes('vercel.app') || 
                               url.includes('netlify.app') || 
                               url.includes('herokuapp.com');
    
    const protocol = (isHttpsPage || isProductionDomain) ? 'https://' : 'http://';
    url = `${protocol}${url}`;
  } else {
    // URL already has protocol - but check if we need to upgrade HTTP to HTTPS for production
    // This fixes mixed content errors when frontend is HTTPS but API URL is HTTP
    if (typeof window !== 'undefined') {
      const isHttpsPage = window.location.protocol === 'https:';
      const isProductionDomain = url.includes('vercel.app') || 
                                 url.includes('netlify.app') || 
                                 url.includes('herokuapp.com');
      
      // If page is HTTPS and URL is HTTP with production domain, upgrade to HTTPS
      if (isHttpsPage && url.startsWith('http://') && isProductionDomain) {
        url = url.replace('http://', 'https://');
      }
    }
  }
  
  return url;
}

export const apiClient = {
  get baseURL() {
    // Compute baseURL dynamically to handle HTTPS pages correctly
    return getApiBaseUrl();
  },

  async request(endpoint, options = {}) {
    // Ensure endpoint starts with /
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseURL}${normalizedEndpoint}`;
    
    const { headers, ...restOptions } = options;
    const config = {
      ...restOptions,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      // Handle non-JSON responses (like 404 HTML pages)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`API error: ${response.status} ${response.statusText}. Expected JSON but got ${contentType || 'unknown'}. URL: ${url}`);
      }
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || `API error: ${response.status}`);
      }

      return data;
    } catch (error) {
      // Enhance error messages with URL for debugging
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Network error: Failed to connect to API at ${url}. Please check if the backend is running and NEXT_PUBLIC_API_BASE_URL is set correctly.`);
      }
      throw error;
    }
  },

  async register(username, email, password) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  },

  async login(email, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async googleLogin(idToken) {
    return this.request('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
  },

  async getMe(token) {
    return this.request('/api/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async checkToken(token) {
    return this.request('/api/auth/check-token', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async checkUsername(username) {
    // Special handling for username check - don't throw on 400/500, return the data instead
    const url = `${this.baseURL}/api/auth/check-username?username=${encodeURIComponent(username)}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      // Return data even if status is not ok (400/500) so we can show error messages
      return data;
    } catch (error) {
      // Network error or other fetch error
      return {
        available: false,
        error: 'Failed to check username availability',
      };
    }
  },
};

