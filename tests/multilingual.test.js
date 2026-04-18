/**
 * Multilingual Feature Tests
 * Tests for backend i18n and frontend error translation
 */

// ============================================================================
// BACKEND I18N TESTS
// ============================================================================

describe('Backend i18n Middleware', () => {
  let i18nMiddleware;
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    i18nMiddleware = require('../src/backend/middleware/i18nMiddleware');
    
    mockReq = {
      query: {},
      headers: {},
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  test('should detect language from Accept-Language header', () => {
    mockReq.headers['accept-language'] = 'hi-IN,hi;q=0.9,en;q=0.8';
    
    i18nMiddleware(mockReq, mockRes, mockNext);
    
    expect(mockReq.language).toBe('hi');
    expect(mockReq.t).toBeDefined();
    expect(mockNext).toHaveBeenCalled();
  });

  test('should override header with query parameter lang', () => {
    mockReq.headers['accept-language'] = 'en-US';
    mockReq.query.lang = 'ta';
    
    i18nMiddleware(mockReq, mockRes, mockNext);
    
    expect(mockReq.language).toBe('ta');
  });

  test('should default to English for unsupported languages', () => {
    mockReq.headers['accept-language'] = 'fr-FR';
    
    i18nMiddleware(mockReq, mockRes, mockNext);
    
    expect(mockReq.language).toBe('en');
  });

  test('should provide req.t() function for translations', () => {
    mockReq.headers['accept-language'] = 'en';
    
    i18nMiddleware(mockReq, mockRes, mockNext);
    
    expect(typeof mockReq.t).toBe('function');
  });

  test('should translate error keys to correct language', () => {
    mockReq.headers['accept-language'] = 'hi';
    
    i18nMiddleware(mockReq, mockRes, mockNext);
    
    const translation = mockReq.t('auth.invalidCredentials');
    expect(translation).toBe('अमान्य क्रेडेंशियल।');
  });
});

describe('Backend Locale Files', () => {
  const en = require('../src/backend/locales/en.json');
  const hi = require('../src/backend/locales/hi.json');
  const ta = require('../src/backend/locales/ta.json');

  test('should have matching key structure across languages', () => {
    const getKeys = (obj, prefix = '') => {
      let keys = [];
      for (let key in obj) {
        if (typeof obj[key] === 'object') {
          keys = keys.concat(getKeys(obj[key], `${prefix}${key}.`));
        } else {
          keys.push(`${prefix}${key}`);
        }
      }
      return keys;
    };

    const enKeys = getKeys(en).sort();
    const hiKeys = getKeys(hi).sort();
    const taKeys = getKeys(ta).sort();

    expect(hiKeys).toEqual(enKeys);
    expect(taKeys).toEqual(enKeys);
  });

  test('should have all required auth keys', () => {
    const requiredAuthKeys = [
      'auth.noToken',
      'auth.userNotFound',
      'auth.tokenInvalid',
      'auth.roleUnauthorized',
      'auth.emailAlreadyRegistered',
      'auth.emailPasswordRequired',
      'auth.invalidCredentials',
    ];

    requiredAuthKeys.forEach(key => {
      const [category, keyName] = key.split('.');
      expect(en[category][keyName]).toBeDefined();
      expect(hi[category][keyName]).toBeDefined();
      expect(ta[category][keyName]).toBeDefined();
    });
  });

  test('should have all required request keys', () => {
    const requiredRequestKeys = [
      'request.duplicateRequestDetected',
      'request.requestNotFound',
      'request.requestNoLongerAvailable',
      'request.invalidRequestStatus',
    ];

    requiredRequestKeys.forEach(key => {
      const [category, keyName] = key.split('.');
      expect(en[category][keyName]).toBeDefined();
      expect(hi[category][keyName]).toBeDefined();
      expect(ta[category][keyName]).toBeDefined();
    });
  });

  test('should support interpolation variables', () => {
    expect(en.auth.roleUnauthorized).toContain('{{role}}');
    expect(en.notification.broadcastSentSuccess).toContain('{{count}}');
  });
});

// ============================================================================
// FRONTEND ERROR TRANSLATOR TESTS
// ============================================================================

describe('Frontend Error Translator', () => {
  const errorTranslator = require('../src/frontend/src/utils/errorTranslator');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should translate error messageKey to English', () => {
    const error = { messageKey: 'auth.invalidCredentials' };
    const result = errorTranslator.translateErrorMessage(error);
    
    expect(result).toBe('Invalid credentials.');
  });

  test('should handle interpolation in translations', () => {
    const error = {
      messageKey: 'auth.roleUnauthorized',
      role: 'volunteer'
    };
    const result = errorTranslator.translateErrorMessage(error);
    
    expect(result).toContain('volunteer');
    expect(result).toContain('not authorized');
  });

  test('should fallback to plain message if no messageKey', () => {
    const error = { message: 'Custom error message' };
    const result = errorTranslator.translateErrorMessage(error);
    
    expect(result).toBe('Custom error message');
  });

  test('should handle missing translation keys gracefully', () => {
    const error = { messageKey: 'nonexistent.key' };
    const result = errorTranslator.translateErrorMessage(error);
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  test('should translate success messages', () => {
    const success = { messageKey: 'request.requestCreated' };
    const result = errorTranslator.translateSuccessMessage(success);
    
    expect(result).toContain('successfully');
  });
});

// ============================================================================
// FRONTEND API CLIENT TESTS
// ============================================================================

describe('Frontend API Client', () => {
  const apiClient = require('../src/frontend/src/utils/apiClient');

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should make GET request', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({ success: true, data: [] })
    });

    const result = await apiClient.get('/test');
    
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  test('should make POST request with body', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({ success: true, data: {} })
    });

    const body = { email: 'test@test.com' };
    const result = await apiClient.post('/auth/login', body);
    
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  test('should translate messageKey in response', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({
        success: false,
        messageKey: 'auth.invalidCredentials'
      })
    });

    const result = await apiClient.post('/auth/login', {});
    
    expect(result.message).toBeDefined();
    expect(result.message).not.toBe('auth.invalidCredentials');
  });

  test('should include authorization token', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({ success: true })
    });

    const token = 'test-token-123';
    await apiClient.get('/protected', token);
    
    expect(global.fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${token}`
        })
      })
    );
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('End-to-End Multilingual Integration', () => {
  test('should handle full auth flow with multilingual errors', async () => {
    // Simulate backend error response
    const backendResponse = {
      success: false,
      messageKey: 'auth.emailAlreadyRegistered',
      statusCode: 400
    };

    // Frontend translates the error
    const errorTranslator = require('../src/frontend/src/utils/errorTranslator');
    const translatedError = errorTranslator.translateErrorMessage(backendResponse);

    expect(translatedError).toBeTruthy();
    expect(typeof translatedError).toBe('string');
    expect(translatedError).not.toContain('auth.email');
  });

  test('should support language switching during interaction', async () => {
    const response = {
      success: false,
      messageKey: 'auth.invalidCredentials'
    };

    // This would normally happen when user changes language
    // The errorTranslator would use the current i18n language
    const errorTranslator = require('../src/frontend/src/utils/errorTranslator');
    const message = errorTranslator.translateErrorMessage(response);

    expect(message).toBeDefined();
  });

  test('should maintain consistency between backend and frontend translations', () => {
    const en = require('../src/backend/locales/en.json');
    const frontendEn = require('../src/frontend/src/locales/en.json');

    // Check that auth keys match
    expect(frontendEn.auth).toBeDefined();
    expect(frontendEn.request).toBeDefined();

    // Verify key existence
    Object.entries(en.auth).forEach(([key, value]) => {
      expect(frontendEn.auth[key]).toBeDefined();
    });
  });
});

// ============================================================================
// LANGUAGE SUPPORT TESTS
// ============================================================================

describe('Language Support', () => {
  test('should support at least 3 languages', () => {
    const en = require('../src/backend/locales/en.json');
    const hi = require('../src/backend/locales/hi.json');
    const ta = require('../src/backend/locales/ta.json');

    expect(en).toBeDefined();
    expect(hi).toBeDefined();
    expect(ta).toBeDefined();
  });

  test('should have non-empty translations for all languages', () => {
    const en = require('../src/backend/locales/en.json');
    const hi = require('../src/backend/locales/hi.json');
    const ta = require('../src/backend/locales/ta.json');

    Object.values(en).forEach(category => {
      expect(Object.keys(category).length).toBeGreaterThan(0);
    });

    Object.values(hi).forEach(category => {
      expect(Object.keys(category).length).toBeGreaterThan(0);
    });

    Object.values(ta).forEach(category => {
      expect(Object.keys(category).length).toBeGreaterThan(0);
    });
  });
});

module.exports = {
  name: 'Multilingual Feature Tests',
  description: 'Comprehensive tests for i18n backend and frontend systems'
};
