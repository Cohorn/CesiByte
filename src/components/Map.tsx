
import React, { useEffect, useRef } from 'react';
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
  const mapboxToken = 'pk.eyJ1IjoiYXplcGllMCIsImEiOiJjbTh3eHYxdnYwMDZlMmxzYjRsYnM5bDcyIn0.vuT0Pi1Q_2QEdwkULIs_vQ';

  // France's approximate center coordinates
  const FRANCE_CENTER: [number, number] = [2.2137, 46.2276];

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

    // Add 3D building layer if it exists in the style
    map.current.on('style.load', () => {
      if (map.current?.getStyle().layers) {
        const layers = map.current.getStyle().layers;
        
        // Add 3D buildings if the style supports it
        if (map.current.getStyle().layers?.find(layer => layer.id === 'building')) {
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
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [center]);

  useEffect(() => {
    if (!map.current) return;

    // Set up bounds to fit all markers
    const bounds = new mapboxgl.LngLatBounds();
    
    // Remove existing markers
    const markers = document.getElementsByClassName('mapboxgl-marker');
    while(markers[0]) {
      markers[0].remove();
    }

    // Add new markers
    locations.forEach(location => {
      const { lat, lng, type, name } = location;
      
      const popupContent = document.createElement('div');
      popupContent.innerText = name;

      const marker = new mapboxgl.Marker({ 
        color: type === 'restaurant' ? '#F00' : type === 'user' ? '#00F' : '#0F0' 
      })
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup().setDOMContent(popupContent))
        .addTo(map.current!);
        
      bounds.extend([lng, lat]);
    });

    // Fit map to bounds if we have locations
    if (locations.length > 0) {
      map.current.fitBounds(bounds, { 
        padding: 50,
        maxZoom: 15
      });
    }
  }, [locations]);

  return (
    <div ref={mapContainer} style={{ width: '100%', height }} />
  );
};

export default Map;
