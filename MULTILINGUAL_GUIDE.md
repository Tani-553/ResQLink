# Multilingual Feature Implementation Guide

## Overview

The Smart Disaster Coordination System now supports full multilingual capabilities for both frontend and backend components. The system supports English (en), Hindi (hi), and Tamil (ta) with easy extensibility for additional languages.

## Architecture

### Frontend Multilingual System

**Framework**: `react-i18next` + `i18next-browser-languagedetector`

- **File**: `src/frontend/src/i18n.js`
- **Locale Files**: `src/frontend/src/locales/` (en.json, hi.json, ta.json)
- **Language Detection**: Automatic based on browser language + localStorage persistence
- **Fallback Language**: English

**Features**:
- Automatic language detection from browser settings
- User language preference saved in localStorage
- Language switcher component in navbar (`LanguageSelector.jsx`)
- Support for text interpolation: `t('key', { variable: value })`

### Backend Multilingual System

**Framework**: `i18next` (Node.js version)

- **Configuration**: `src/backend/config/i18n.js`
- **Middleware**: `src/backend/middleware/i18nMiddleware.js`
- **Locale Files**: `src/backend/locales/` (en.json, hi.json, ta.json)
- **Language Detection**: From `Accept-Language` header or `?lang=` query parameter

**Features**:
- Language detection from HTTP headers
- Query parameter override: `?lang=hi`
- Available to all route handlers via `req.t()`
- Consistent error message keys across all endpoints

## Implementation Details

### Backend Error Message System

All backend error responses now use **messageKey** instead of plain text **message**:

```javascript
// Before
res.status(400).json({ success: false, message: "Email already registered." });

// After
res.status(400).json({ success: false, messageKey: 'auth.emailAlreadyRegistered' });
```

#### Translation Key Structure

Error messages are organized by category:

```
auth/             - Authentication errors
request/          - Help request errors
ngo/              - NGO profile errors
notification/     - Notification errors
admin/            - Admin panel errors
general/          - General errors
```

#### Backend Error Response Format

```json
{
  "success": false,
  "messageKey": "request.duplicateRequestDetected",
  "statusCode": 400
}
```

### Frontend Error Handling

#### Error Translator Utility

**File**: `src/frontend/src/utils/errorTranslator.js`

```javascript
import { translateErrorMessage, translateSuccessMessage } from '../utils/errorTranslator';

// Translate backend error
const errorMsg = translateErrorMessage({
  messageKey: 'auth.invalidCredentials',
  role: 'volunteer' // For interpolation
});

// Translate success message
const successMsg = translateSuccessMessage({
  messageKey: 'notification.broadcastSentSuccess',
  count: 50 // For interpolation
});
```

#### API Client Utility

**File**: `src/frontend/src/utils/apiClient.js`

Provides automatic error translation for all API calls:

```javascript
import { apiPost, apiGet } from '../utils/apiClient';

// Automatically translates messageKey to localized message
const response = await apiPost('/auth/login', { email, password }, token);
if (!response.success) {
  console.error(response.message); // Already translated!
}
```

**Available Methods**:
- `apiCall(url, options, token)` - Generic call
- `apiGet(url, token)` - GET request
- `apiPost(url, body, token)` - POST request
- `apiPut(url, body, token)` - PUT request
- `apiDelete(url, token)` - DELETE request

#### Using in Components

**Example 1: With Error Translator**
```javascript
import { useAuth } from '../components/AuthContext';
import { translateErrorMessage } from '../utils/errorTranslator';

function LoginForm() {
  const { login } = useAuth();
  const handleLogin = async (email, password) => {
    try {
      await login(email, password);
    } catch (err) {
      // AuthContext already uses translateErrorMessage
      console.error(err.message); // Translated!
    }
  };
}
```

**Example 2: With API Client**
```javascript
import { apiPost } from '../utils/apiClient';
import { useAuth } from '../components/AuthContext';

function Dashboard() {
  const { token } = useAuth();
  
  const submitRequest = async (data) => {
    const response = await apiPost('/requests', data, token);
    if (!response.success) {
      alert(response.message); // Already translated!
    }
  };
}
```

### Updated Endpoints

All endpoints now return `messageKey` instead of `message`:

#### Authentication (`/api/auth/`)
- `POST /register` - `auth.emailAlreadyRegistered`
- `POST /login` - `auth.emailPasswordRequired`, `auth.invalidCredentials`

#### Requests (`/api/requests/`)
- `POST /` - `request.duplicateRequestDetected`
- `GET /nearby` - `request.volunteerLocationRequired`
- `PUT /:id/accept` - `request.requestNotFound`, `request.requestNoLongerAvailable`
- `PUT /:id/status` - `request.invalidRequestStatus`, `request.cannotUpdateOwnRequest`

#### NGO (`/api/ngo/`)
- `POST /register` - `ngo.profileAlreadyExists`
- `GET /profile` - `ngo.profileNotFound`

#### Notifications (`/api/notifications/`)
- `PUT /:id/read` - `notification.markedAsRead`
- `PUT /read-all` - `notification.allMarkedAsRead`
- `POST /subscribe` - `notification.pushSubscriptionSaved`

#### Admin (`/api/admin/`)
- `POST /broadcast` - `notification.broadcastSentSuccess` with `count` interpolation

## Language Support

### Current Languages

| Language | Code | Status |
|----------|------|--------|
| English | en | ✅ Complete |
| Hindi | hi | ✅ Complete |
| Tamil | ta | ✅ Complete |

### Total Translation Keys

- **Frontend**: ~120+ keys organized into 12 namespaces
- **Backend**: 50+ error message keys

## Adding New Languages

### Step 1: Create Backend Locale File

Create `src/backend/locales/[lang].json`:

```json
{
  "auth": {
    "noToken": "Your translation here",
    "userNotFound": "User not found in your language"
  },
  "request": {
    "duplicateRequestDetected": "Duplicate request message"
  }
  // ... add all keys from en.json
}
```

### Step 2: Register in Backend i18n

Update `src/backend/config/i18n.js`:

```javascript
import fr from '../locales/fr.json'; // French example

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  ta: { translation: ta },
  fr: { translation: fr }, // Add here
};
```

### Step 3: Create Frontend Locale File

Create `src/frontend/src/locales/[lang].json` with all frontend translation keys.

### Step 4: Register in Frontend i18n

Update `src/frontend/src/i18n.js`:

```javascript
import fr from './locales/fr.json'; // French example

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  ta: { translation: ta },
  fr: { translation: fr }, // Add here
};
```

### Step 5: Update Language Selector

Update `src/frontend/src/components/LanguageSelector.jsx`:

```javascript
const languages = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिंदी' },
  { code: 'ta', name: 'தமிழ்' },
  { code: 'fr', name: 'Français' }, // Add here
];
```

### Step 6: Update Backend Whitelist

Update `src/backend/middleware/i18nMiddleware.js`:

```javascript
const supportedLanguages = ['en', 'hi', 'ta', 'fr']; // Add new language
```

## Testing

### Frontend Testing

```javascript
import { useTranslation } from 'react-i18next';

function TestComponent() {
  const { i18n, t } = useTranslation();
  
  // Change language
  i18n.changeLanguage('hi');
  
  // Get translation
  const msg = t('auth.loginSuccess');
  console.log(msg); // Translated to Hindi
}
```

### Backend Testing

```javascript
// Set language via header
fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Accept-Language': 'hi' },
  body: JSON.stringify({ ... })
});

// Or use query parameter
fetch('http://localhost:5000/api/auth/login?lang=ta', { ... });
```

### API Response Format

Test that responses contain messageKey:

```json
{
  "success": false,
  "messageKey": "auth.invalidCredentials",
  "statusCode": 401
}
```

## Best Practices

### 1. Always Use Keys Instead of Hardcoded Strings

❌ **Bad**:
```javascript
throw new Error("Invalid email");
```

✅ **Good**:
```javascript
res.status(400).json({ 
  success: false, 
  messageKey: 'auth.invalidCredentials' 
});
```

### 2. Use Consistent Key Naming

- Categories (auth, request, ngo, etc.)
- Descriptive names (invalidCredentials, not error123)
- CamelCase (not snake_case)

### 3. Handle Interpolation Properly

```javascript
// Backend
res.json({ 
  success: false, 
  messageKey: 'auth.roleUnauthorized',
  role: req.user.role // Pass interpolation variables
});

// Frontend translation key
"roleUnauthorized": "Role '{{role}}' is not authorized"
```

### 4. Maintain Parity

Always ensure backend and frontend have the same translation keys for consistency.

## Architecture Diagram

```
┌─────────────────────────────────────────┐
│           Frontend (React)              │
├─────────────────────────────────────────┤
│  Components ──> i18n (react-i18next)  │
│                     ↓                   │
│              locale files (en/hi/ta)   │
│                     ↓                   │
│         Language Detector + Selector   │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴─────────┐
        │    API Calls      │
        │  (with messageKey)│
        └─────────┬─────────┘
                  │
┌─────────────────┴───────────────────────┐
│          Backend (Express)              │
├─────────────────────────────────────────┤
│  Middleware ──> i18n (i18next)         │
│       ↓               ↓                 │
│   Language        locale files         │
│   Detection       (en/hi/ta)           │
│       ↓               ↓                 │
│  Controllers ──> req.t(messageKey)    │
│       ↓                                │
│  Response (with messageKey)           │
└─────────────────────────────────────────┘
        ↓
    Frontend receives messageKey
    ↓
    Error/Success Translator
    ↓
    Display translated message
```

## File Structure

```
smart-disaster-coordination/
├── src/
│   ├── backend/
│   │   ├── config/
│   │   │   └── i18n.js
│   │   ├── middleware/
│   │   │   └── i18nMiddleware.js
│   │   ├── locales/
│   │   │   ├── en.json
│   │   │   ├── hi.json
│   │   │   └── ta.json
│   │   └── ... (controllers, routes, etc.)
│   │
│   └── frontend/
│       └── src/
│           ├── i18n.js
│           ├── components/
│           │   ├── LanguageSelector.jsx
│           │   └── ... (other components)
│           ├── locales/
│           │   ├── en.json
│           │   ├── hi.json
│           │   └── ta.json
│           └── utils/
│               ├── errorTranslator.js
│               └── apiClient.js
└── package.json
```

## Configuration

### Environment Variables

Add to `.env`:

```env
# Frontend
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_DEFAULT_LANGUAGE=en

# Backend  
SUPPORTED_LANGUAGES=en,hi,ta
DEFAULT_LANGUAGE=en
```

## Troubleshooting

### Missing Translations

- Check that messageKey exists in all locale files
- Verify key structure matches: `category.keyName`
- Use console warnings to catch missing keys

### Language Not Switching

- Check browser localStorage: `localStorage.getItem('i18nextLng')`
- Verify Accept-Language header is being sent
- Check i18n initialization: `console.log(i18n.language)`

### Backend Not Translating

- Verify i18nMiddleware is loaded before routes
- Check `req.t()` is available in route handlers
- Test with `?lang=hi` query parameter

## Performance Considerations

- Locale files are bundled with app (no runtime fetching)
- Translations are cached in browser localStorage
- i18n initialization happens once at app startup
- No performance impact on API calls

## Future Enhancements

1. **Additional Languages**
   - Bengali (bn)
   - Marathi (mr)
   - Gujarati (gu)

2. **Right-to-Left (RTL) Support**
   - Arabic (ar)
   - Urdu (ur)

3. **Translation Management**
   - Admin panel for live translation updates
   - Community translation contributions

4. **Pluralization**
   - Language-specific plural rules
   - Better numeric interpolation

## Dependencies

### Backend
- `i18next@^23.7.6` - Internationalization framework

### Frontend
- `i18next@^13.2.3` - Internationalization framework (already included)
- `react-i18next@^13.2.2` - React binding for i18next (already included)
- `i18next-browser-languagedetector@^7.2.0` - Language detection (already included)

## Support

For issues or questions about the multilingual feature:

1. Check the locale files for correct key names
2. Verify backend and frontend keys match
3. Test with direct messageKey translation
4. Check browser console for i18n warnings
5. Enable debug mode in i18n configuration

## Changelog

### Version 1.0.0 (Initial Release)

✅ Complete multilingual system for backend and frontend
✅ Support for English, Hindi, Tamil
✅ Automatic language detection
✅ Error message translation
✅ API integration with messageKey support
✅ Extensible architecture for new languages
