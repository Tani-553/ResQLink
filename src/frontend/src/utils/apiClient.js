import { translateErrorMessage, translateSuccessMessage } from './errorTranslator';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Make an API call with automatic error translation support
 * @param {string} url - API endpoint (without /api prefix)
 * @param {Object} options - Fetch options
 * @param {string} options.method - HTTP method (GET, POST, etc)
 * @param {Object} options.body - Request body
 * @param {string} token - Optional JWT token for authentication
 * @returns {Promise<Object>} API response with potential messageKey translation
 */
export const apiCall = async (url, options = {}, token = null) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(`${API}${url}`, config);
    const data = await response.json();

    // If response has messageKey, it's from the multilingual backend
    if (data.messageKey) {
      if (data.success) {
        data.message = translateSuccessMessage(data);
      } else {
        data.message = translateErrorMessage(data);
      }
    }

    return data;
  } catch (error) {
    throw new Error(error.message || 'Network error');
  }
};

/**
 * Helper for GET requests
 */
export const apiGet = (url, token = null) =>
  apiCall(url, { method: 'GET' }, token);

/**
 * Helper for POST requests
 */
export const apiPost = (url, body, token = null) =>
  apiCall(url, { method: 'POST', body }, token);

/**
 * Helper for PUT requests
 */
export const apiPut = (url, body, token = null) =>
  apiCall(url, { method: 'PUT', body }, token);

/**
 * Helper for DELETE requests
 */
export const apiDelete = (url, token = null) =>
  apiCall(url, { method: 'DELETE' }, token);

export default {
  call: apiCall,
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,
};
