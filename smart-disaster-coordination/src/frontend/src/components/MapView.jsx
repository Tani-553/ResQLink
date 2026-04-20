import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

export default function MapView({ userLocation, requests = [] }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef({ user: null, list: [] }); // ✅ improved

  // INIT MAP (once)
  useEffect(() => {
    console.log("TOKEN:", mapboxgl.accessToken);

    if (!mapboxgl.accessToken) {
      console.error("❌ Mapbox token missing");
      return;
    }

    if (map.current) return;

    const lng = userLocation?.longitude ?? 80.2707;
    const lat = userLocation?.latitude ?? 13.0827;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [lng, lat],
      zoom: 12,
    });

    map.current.on("load", () => {
      console.log("✅ Map loaded");
    });

    setTimeout(() => {
      map.current.resize();
    }, 500);

    map.current.on("error", (e) => {
      console.error("❌ Map error:", e?.error);
    });

  }, []);

  // UPDATE USER LOCATION (🔵 BLUE)
  useEffect(() => {
    if (!map.current || !userLocation) return;

    const lng = userLocation.longitude;
    const lat = userLocation.latitude;

    map.current.setCenter([lng, lat]);

    if (!markers.current.user) {
      markers.current.user = new mapboxgl.Marker({ color: "#3B82F6" }) // 🔵
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup().setText("You"))
        .addTo(map.current);
    } else {
      markers.current.user.setLngLat([lng, lat]);
    }

  }, [userLocation]);

  // REQUEST MARKERS (🔴 RED)
  useEffect(() => {
    if (!map.current) return;

    // remove old markers
    markers.current.list.forEach(m => m.remove());
    markers.current.list = [];

    requests.forEach(req => {
      if (!req.location?.coordinates) return;

      const [lng, lat] = req.location.coordinates;

      const marker = new mapboxgl.Marker({ color: "#EF4444" }) // 🔴
        .setLngLat([lng, lat])
        .setPopup(
          new mapboxgl.Popup().setHTML(`
            <strong>${req.type || "Request"}</strong><br/>
            ${req.description || ""}
          `)
        )
        .addTo(map.current);

      markers.current.list.push(marker);
    });

  }, [requests]);

  return (
    <div
      ref={mapContainer}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "12px"
      }}
    />
  );
}