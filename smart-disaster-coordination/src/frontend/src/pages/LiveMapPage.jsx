import React, { useEffect, useState } from "react";
import { useAuth } from "../components/AuthContext";
import MapView from "../components/MapView";

export default function LiveMapPage() {
  const { authFetch } = useAuth();

  const [locationState, setLocationState] = useState(null);
  const [allRequests, setAllRequests] = useState([]);

  // 📍 Get user location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setLocationState({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
    });
  }, []);

  // 📦 Get all requests
  useEffect(() => {
    authFetch("/requests/all")
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) {
          setAllRequests(data.data);
        }
      });
  }, [authFetch]);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <MapView
        userLocation={locationState}
        requests={allRequests}
      />
    </div>
  );
}