
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapProps {
  locations: {
    id: string;
    lat: number;
    lng: number;
    type: 'restaurant' | 'user' | 'courier';
    name: string;
  }[];
  center?: [number, number];
  height?: string;
}

const Map: React.FC<MapProps> = ({ locations, center, height = '400px' }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapInitialized, setMapInitialized] = useState(false);
  const mapboxToken = 'pk.eyJ1IjoiYXplcGllMCIsImEiOiJjbTh3eHYxdnYwMDZlMmxzYjRsYnM5bDcyIn0.vuT0Pi1Q_2QEdwkULIs_vQ';

  // France's approximate center coordinates
  const FRANCE_CENTER: [number, number] = [2.2137, 46.2276];

  // Initialize map only once
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = mapboxToken;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11', // Use dark theme
      center: center || FRANCE_CENTER, // Default to France if no center provided
      zoom: center ? 9 : 5, // Zoom out more if showing all of France
      pitch: 45, // Add 3D perspective
      bearing: 0,
      antialias: true // Enables antialiasing for smoother edges
    });

    map.current.addControl(new mapboxgl.NavigationControl());

    // Mark map as initialized only after it's fully loaded
    map.current.on('load', () => {
      // Add 3D building layer if it exists in the style
      if (map.current && map.current.getStyle().layers) {
        // Check if 'building' layer exists before trying to add 3D buildings
        if (map.current.getStyle().layers.some(layer => layer.id === 'building')) {
          map.current.addLayer({
            'id': '3d-buildings',
            'source': 'composite',
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'],
            'type': 'fill-extrusion',
            'minzoom': 15,
            'paint': {
              'fill-extrusion-color': '#aaa',
              'fill-extrusion-height': [
                'interpolate', ['linear'], ['zoom'],
                15, 0,
                15.05, ['get', 'height']
              ],
              'fill-extrusion-base': [
                'interpolate', ['linear'], ['zoom'],
                15, 0,
                15.05, ['get', 'min_height']
              ],
              'fill-extrusion-opacity': 0.6
            }
          });
        }
      }
      
      setMapInitialized(true);
    });

    return () => {
      // Clean up markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // Empty dependency array to initialize map only once

  // Update markers when locations or center changes and map is initialized
  useEffect(() => {
    if (!map.current || !mapInitialized) return;

    // Remove existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    
    // Set up bounds to fit all markers
    const bounds = new mapboxgl.LngLatBounds();
    const markers: mapboxgl.Marker[] = [];

    // Add new markers only for valid locations
    const validLocations = locations.filter(loc => 
      loc && 
      typeof loc.lat === 'number' && 
      typeof loc.lng === 'number' && 
      !isNaN(loc.lat) && 
      !isNaN(loc.lng) && 
      loc.lat !== 0 && 
      loc.lng !== 0
    );

    // Add new markers
    validLocations.forEach(location => {
      const { lat, lng, type, name } = location;
      
      const popupContent = document.createElement('div');
      popupContent.innerText = name;

      const marker = new mapboxgl.Marker({ 
        color: type === 'restaurant' ? '#F00' : type === 'user' ? '#00F' : '#0F0' 
      })
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup().setDOMContent(popupContent))
        .addTo(map.current!);
        
      markers.push(marker);
      bounds.extend([lng, lat]);
    });

    // Store current markers for later cleanup
    markersRef.current = markers;

    // Fit map to bounds if we have valid locations
    if (validLocations.length > 0 && !bounds.isEmpty()) {
      map.current.fitBounds(bounds, { 
        padding: 50,
        maxZoom: 15
      });
    }
    // If center is provided, use it instead of fitting to bounds
    else if (center) {
      map.current.flyTo({
        center: center,
        zoom: 9,
        essential: true
      });
    }
  }, [locations, center, mapInitialized]);

  return (
    <div ref={mapContainer} style={{ width: '100%', height }} />
  );
};

export default Map;
