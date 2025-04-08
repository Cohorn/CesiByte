
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapProps {
  locations?: {
    id: string;
    lat: number;
    lng: number;
    type: 'restaurant' | 'user' | 'courier';
    name: string;
  }[];
  center?: [number, number];
  height?: string;
  // Props for Register.tsx
  lat?: number;
  lng?: number;
  onLocationSelected?: (lat: number, lng: number, address: string) => void;
  onLoad?: () => void;
}

const Map: React.FC<MapProps> = ({ 
  locations = [], 
  center, 
  height = '400px',
  lat,
  lng,
  onLocationSelected,
  onLoad
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapInitialized, setMapInitialized] = useState(false);
  const mapboxToken = 'pk.eyJ1IjoiYXplcGllMCIsImEiOiJjbTh3eHYxdnYwMDZlMmxzYjRsYnM5bDcyIn0.vuT0Pi1Q_2QEdwkULIs_vQ';

  // France's approximate center coordinates
  const FRANCE_CENTER: [number, number] = [2.2137, 46.2276];
  
  // Create clickable map marker functionality for Register page
  useEffect(() => {
    if (!map.current || !mapInitialized || !onLocationSelected) return;
    
    // Add click event for location selection
    const clickMarker = new mapboxgl.Marker({ color: '#3898ff', draggable: true });
    
    // If lat/lng are provided, show marker at that position
    if (lat && lng && typeof lat === 'number' && typeof lng === 'number') {
      clickMarker.setLngLat([lng, lat]).addTo(map.current);
    }
    
    // Set up click handler for map
    const handleMapClick = async (e: mapboxgl.MapMouseEvent) => {
      const coordinates = e.lngLat;
      
      // Place or move marker
      clickMarker.setLngLat([coordinates.lng, coordinates.lat]).addTo(map.current!);
      
      // Get address using reverse geocoding
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates.lng},${coordinates.lat}.json?access_token=${mapboxToken}`
        );
        const data = await response.json();
        const address = data.features[0]?.place_name || 'Unknown location';
        
        // Call the callback function with coordinates and address
        onLocationSelected(coordinates.lat, coordinates.lng, address);
      } catch (error) {
        console.error('Error fetching address:', error);
        onLocationSelected(coordinates.lat, coordinates.lng, 'Address not found');
      }
    };
    
    map.current.on('click', handleMapClick);
    
    // Set up drag end handler for the marker
    clickMarker.on('dragend', async () => {
      const lngLat = clickMarker.getLngLat();
      
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lngLat.lng},${lngLat.lat}.json?access_token=${mapboxToken}`
        );
        const data = await response.json();
        const address = data.features[0]?.place_name || 'Unknown location';
        
        // Call the callback function with coordinates and address
        onLocationSelected(lngLat.lat, lngLat.lng, address);
      } catch (error) {
        console.error('Error fetching address:', error);
        onLocationSelected(lngLat.lat, lngLat.lng, 'Address not found');
      }
    });
    
    return () => {
      map.current?.off('click', handleMapClick);
      clickMarker.remove();
    };
  }, [lat, lng, mapInitialized, onLocationSelected, mapboxToken]);

  // Initialize map only once
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
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
          try {
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
          } catch (error) {
            console.error('Error adding 3D buildings layer:', error);
            // Continue without 3D buildings
          }
        }
        
        setMapInitialized(true);
        
        // Call onLoad callback if provided
        if (onLoad) {
          onLoad();
        }
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
    } catch (error) {
      console.error('Error initializing map:', error);
      // Set mapInitialized to true to prevent further initialization attempts
      setMapInitialized(true);
    }
  }, []); 

  // Update markers when locations or center changes and map is initialized
  useEffect(() => {
    if (!map.current || !mapInitialized || locations.length === 0) return;

    try {
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
    } catch (error) {
      console.error('Error updating map markers:', error);
    }
  }, [locations, center, mapInitialized]);

  return (
    <div ref={mapContainer} style={{ width: '100%', height }} />
  );
};

export default Map;
