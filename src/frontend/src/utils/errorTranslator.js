import i18n from '../i18n';

/**
 * Translates backend error messages or uses provided messageKey
 * @param {Object} response - API response object
 * @param {string} response.messageKey - Translation key from backend
 * @param {string} response.message - Fallback message
 * @param {Object} response - Additional fields like 'role', 'count', etc. for interpolation
 * @returns {string} Translated error message
 */
export const translateErrorMessage = (response = {}) => {
  const { messageKey, message, ...interpolationParams } = response;

  if (messageKey) {
    try {
      // Translate the messageKey with interpolation parameters
      return i18n.t(messageKey, interpolationParams);
    } catch (err) {
      console.warn(`Translation key not found: ${messageKey}`, err);
      return message || 'An error occurred';
    }
  }

  // Fallback to plain message if no messageKey
  return message || 'An error occurred';
};

/**
 * Get success message from response
 * @param {Object} response - API response object
 * @param {string} response.messageKey - Translation key from backend
 * @param {string} response.message - Fallback message
 * @returns {string} Translated success message
 */
export const translateSuccessMessage = (response = {}) => {
  const { messageKey, message, ...interpolationParams } = response;

  if (messageKey) {
    try {
      return i18n.t(messageKey, interpolationParams);
    } catch (err) {
      console.warn(`Translation key not found: ${messageKey}`, err);
      return message || 'Success';
    }
  }

  return message || 'Success';
};
