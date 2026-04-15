const admin = require('firebase-admin');

const isPlaceholderValue = (value = '') => {
  const normalized = String(value).trim();
  return (
    !normalized ||
    normalized === 'your_firebase_project_id' ||
    normalized === 'your_firebase_client_email' ||
    normalized.includes('YOUR_KEY_HERE') ||
    normalized === 'https://your-project-default-rtdb.firebaseio.com'
  );
};

const hasFirebaseCreds = Boolean(
  !isPlaceholderValue(process.env.FIREBASE_PROJECT_ID) &&
  !isPlaceholderValue(process.env.FIREBASE_PRIVATE_KEY) &&
  !isPlaceholderValue(process.env.FIREBASE_CLIENT_EMAIL)
);

const initializeFirebase = () => {
  if (!hasFirebaseCreds) return false;
  if (admin.apps.length) return true;

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });

  return true;
};

const syncUserLocation = async ({ userId, role, longitude, latitude, requestId = null, source = 'api' }) => {
  try {
    if (!initializeFirebase() || isPlaceholderValue(process.env.FIREBASE_DATABASE_URL)) {
      return false;
    }

    await admin.database().ref(`liveLocations/${userId}`).set({
      userId: String(userId),
      role,
      requestId: requestId ? String(requestId) : null,
      source,
      location: {
        latitude,
        longitude,
      },
      updatedAt: new Date().toISOString(),
    });

    return true;
  } catch (err) {
    console.error('Failed to sync live location:', err.message);
    return false;
  }
};

module.exports = {
  initializeFirebase,
  syncUserLocation,
};
