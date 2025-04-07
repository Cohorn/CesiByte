
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
  const renderCountRef = useRef(0);

  // France's approximate center coordinates
  const FRANCE_CENTER: [number, number] = [2.2137, 46.2276];

  // Initialize map only once, using a true ref pattern to avoid re-creating the map
  useEffect(() => {
    // This effect should run ONLY ONCE
    if (!mapContainer.current || map.current) return;

    console.log('Initializing map', renderCountRef.current++);
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

    // Add navigation control
    map.current.addControl(new mapboxgl.NavigationControl());

    // Mark map as initialized when fully loaded
    map.current.on('load', () => {
      try {
        console.log('Map loaded');
        // Add 3D building layer if style has them
        const currentMap = map.current;
        if (currentMap && currentMap.getStyle().layers) {
          if (currentMap.getStyle().layers.some(layer => layer.id === 'building')) {
            currentMap.addLayer({
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
      } catch (error) {
        console.error('Error adding 3D building layer:', error);
      }
      
      setMapInitialized(true);
    });

    // Proper cleanup function
    return () => {
      console.log('Cleaning up map');
      if (markersRef.current.length > 0) {
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];
      }
      
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // Empty dependency array ensures this runs only once

  // Update markers separately whenever locations or center changes
  // Only run when map is initialized and locations/center change
  useEffect(() => {
    if (!map.current || !mapInitialized) return;
    
    console.log('Updating markers', locations.length);
    
    // Remove existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    
    // Set up bounds to fit all markers
    const bounds = new mapboxgl.LngLatBounds();
    const markers: mapboxgl.Marker[] = [];
    
    // Filter to valid locations only
    const validLocations = locations.filter(loc => 
      loc && 
      typeof loc.lat === 'number' && 
      typeof loc.lng === 'number' && 
      !isNaN(loc.lat) && 
      !isNaN(loc.lng) && 
      loc.lat !== 0 && 
      loc.lng !== 0
    );
    
    console.log('Valid locations:', validLocations.length);
    
    // Skip if no valid locations
    if (validLocations.length === 0) {
      // If center is provided, use it instead
      if (center && map.current) {
        try {
          console.log('Flying to center', center);
          map.current.flyTo({
            center: center,
            zoom: 9,
            essential: true,
            duration: 1000 // Smooth transition
          });
        } catch (error) {
          console.error('Error flying to center:', error);
        }
      }
      return;
    }
    
    // Add markers for valid locations
    validLocations.forEach(location => {
      try {
        const { lat, lng, type, name } = location;
        
        const popupContent = document.createElement('div');
        popupContent.innerText = name;
        
        // Different colors for different types
        const marker = new mapboxgl.Marker({ 
          color: type === 'restaurant' ? '#F00' : type === 'user' ? '#00F' : '#0F0' 
        })
          .setLngLat([lng, lat])
          .setPopup(new mapboxgl.Popup().setDOMContent(popupContent))
          .addTo(map.current!);
          
        markers.push(marker);
        bounds.extend([lng, lat]);
      } catch (error) {
        console.error('Error adding marker:', error);
      }
    });
    
    // Store markers for later cleanup
    markersRef.current = markers;
    
    // Fit map to bounds or center
    if (validLocations.length > 0 && !bounds.isEmpty() && map.current) {
      try {
        console.log('Fitting to bounds');
        map.current.fitBounds(bounds, { 
          padding: 50,
          maxZoom: 15,
          duration: 1000 // Smooth transition
        });
      } catch (error) {
        console.error('Error fitting map to bounds:', error);
      }
    } 
    // Or use provided center
    else if (center && map.current) {
      try {
        console.log('Flying to center', center);
        map.current.flyTo({
          center: center,
          zoom: 9,
          essential: true,
          duration: 1000 // Smooth transition
        });
      } catch (error) {
        console.error('Error flying to center:', error);
      }
    }
    
  }, [locations, center, mapInitialized]); // Dependencies include locations and center

  return (
    <div ref={mapContainer} style={{ width: '100%', height }} />
  );
};

export default Map;
