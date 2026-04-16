let googleMapsPromise = null;

export const loadGoogleMaps = (apiKey) => {
  if (!apiKey) {
    return Promise.reject(new Error('Google Maps API key is not available.'));
  }

  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window is not available.'));
  }

  if (window.google?.maps) {
    return Promise.resolve();
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById('google-maps-script');

    const cleanup = (scriptElement, loadListener, errorListener) => {
      if (!scriptElement) return;
      if (loadListener) scriptElement.removeEventListener('load', loadListener);
      if (errorListener) scriptElement.removeEventListener('error', errorListener);
    };

    const handleLoad = () => {
      resolve();
    };

    const handleError = () => {
      cleanup(existingScript, handleLoad, handleError);
      reject(new Error('Unable to load Google Maps.'));
    };

    if (existingScript) {
      existingScript.addEventListener('load', handleLoad);
      existingScript.addEventListener('error', handleError);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);
    document.head.appendChild(script);
  });

  return googleMapsPromise;
};