// Live Web Ride Tracking Logic - Phase 17
(function() {
  const BACKEND_URL = window.getWebsiteBackendBaseUrl ? window.getWebsiteBackendBaseUrl() : 'http://localhost:3016';
  let map = null;
  let pickupMarker = null;
  let dropoffMarker = null;
  let driverMarker = null;
  let driverIconElement = null;
  
  let currentTargetLat = null;
  let currentTargetLng = null;
  let currentHeading = 0;
  
  let animationFrameId = null;
  let lastFrameTime = null;

  // Extract share token from URL path or search query parameter (?token=...)
  function getShareToken() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('token')) return urlParams.get('token');
    const pathSegments = window.location.pathname.split('/');
    const trackIndex = pathSegments.indexOf('track');
    if (trackIndex !== -1 && pathSegments[trackIndex + 1]) {
      return pathSegments[trackIndex + 1];
    }
    return null;
  }

  const token = getShareToken();
  if (!token) {
    showError('Tracking token is missing from the URL.');
    return;
  }

  function showError(msg) {
    const loader = document.getElementById('loadingState');
    if (loader) loader.style.display = 'none';
    const err = document.getElementById('errorState');
    if (err) err.style.display = 'block';
    const errMsg = document.getElementById('errorMessage');
    if (errMsg && msg) errMsg.innerText = msg;
  }

  function initMap(lat, lng) {
    if (map) return;
    map = L.map('trackMap', { zoomControl: true, attributionControl: false }).setView([lat, lng], 14);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.webp', {
      maxZoom: 19
    }).addTo(map);
  }

  function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
  }

  function animateDriverMarker(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;
    const delta = (timestamp - lastFrameTime) / 1000.0;
    lastFrameTime = timestamp;

    if (driverMarker && currentTargetLat !== null && currentTargetLng !== null) {
      const currentPos = driverMarker.getLatLng();
      
      // If we're far away, snap (distance > 0.05 approx 5km)
      const latDiff = Math.abs(currentTargetLat - currentPos.lat);
      const lngDiff = Math.abs(currentTargetLng - currentPos.lng);
      
      if (latDiff > 0.05 || lngDiff > 0.05) {
        driverMarker.setLatLng([currentTargetLat, currentTargetLng]);
      } else {
        // Lerp smoothly over time (assume ~5 seconds to catch up)
        const lerpFactor = Math.min(delta * 2.0, 1.0);
        const newLat = lerp(currentPos.lat, currentTargetLat, lerpFactor);
        const newLng = lerp(currentPos.lng, currentTargetLng, lerpFactor);
        driverMarker.setLatLng([newLat, newLng]);
      }
      
      // Update rotation
      if (driverIconElement) {
        driverIconElement.style.transform = `rotate(${currentHeading}deg)`;
        driverIconElement.style.transition = 'transform 0.5s ease-out';
      }
    }
    
    animationFrameId = requestAnimationFrame(animateDriverMarker);
  }

  let isPolling = true;

  async function fetchTripData() {
    if (!isPolling) return;
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/rides/public-track/${token}`);
      if (!res.ok) {
        showError('This tracking link has expired or was revoked by the passenger.');
        isPolling = false;
        return;
      }

      const data = await res.json();
      
      const loader = document.getElementById('loadingState');
      if (loader) loader.style.display = 'none';
      const card = document.getElementById('trackingCard');
      if (card) card.style.display = 'block';

      // Update text elements
      const pickupEl = document.getElementById('pickupLabel');
      if (pickupEl) pickupEl.innerText = data.pickup.address || 'Pickup Point';
      
      const dropoffEl = document.getElementById('dropoffLabel');
      if (dropoffEl) dropoffEl.innerText = data.dropoff.address || 'Destination';
      
      const fareEl = document.getElementById('currentFareText');
      if (fareEl) fareEl.innerText = 'Hidden (Privacy)';

      const dName = document.getElementById('driverName');
      if (dName) dName.innerText = `${data.driver_first_name} ⭐ ${Number(data.driver_rating).toFixed(2)}`;
      
      const dVeh = document.getElementById('driverVehicle');
      if (dVeh) dVeh.innerText = `${data.vehicle.color} ${data.vehicle.make} ${data.vehicle.model} • ${data.vehicle.plate_number}`;

      // Status label
      const statusMap = {
        'accepted': '🚗 Driver Navigating to Pickup',
        'arrived': '📍 Driver Arrived at Pickup',
        'in_progress': '🏎️ Trip in Progress to Destination',
        'completed': '✅ Trip Completed Safely',
        'cancelled': '❌ Trip Cancelled'
      };
      const statusEl = document.getElementById('rideStatusText');
      if (statusEl) statusEl.innerText = statusMap[data.status] || 'Live Ride in Progress';

      if (data.status === 'completed' || data.status === 'cancelled') {
        isPolling = false;
      }

      // Initialize map with pickup coordinates
      initMap(data.pickup.latitude, data.pickup.longitude);

      // Render pickup marker
      if (!pickupMarker) {
        pickupMarker = L.marker([data.pickup.latitude, data.pickup.longitude], {
          icon: L.divIcon({ html: '<span style="font-size:24px;">🟢</span>', className: '', iconSize: [28, 28], iconAnchor: [14, 14] })
        }).addTo(map).bindPopup('Pickup Point');
      }

      // Render dropoff marker
      if (!dropoffMarker) {
        dropoffMarker = L.marker([data.dropoff.latitude, data.dropoff.longitude], {
          icon: L.divIcon({ html: '<span style="font-size:24px;">🔴</span>', className: '', iconSize: [28, 28], iconAnchor: [14, 14] })
        }).addTo(map).bindPopup('Destination');
      }

      // Render moving driver marker
      const loc = data.driver_live_location;
      if (loc && loc.latitude && loc.longitude) {
        currentTargetLat = loc.latitude;
        currentTargetLng = loc.longitude;
        currentHeading = loc.heading || 0;

        if (!driverMarker) {
          const iconHtml = `<div id="driverIconWrap" style="font-size:26px; display:flex; justify-content:center; align-items:center; width:100%; height:100%;">⬆️</div>`;
          driverMarker = L.marker([loc.latitude, loc.longitude], {
            icon: L.divIcon({ html: iconHtml, className: '', iconSize: [30, 30], iconAnchor: [15, 15] })
          }).addTo(map).bindPopup('Driver Location');
          
          setTimeout(() => {
            driverIconElement = document.getElementById('driverIconWrap');
          }, 100);
          
          // Start animation loop
          if (!animationFrameId) {
             animationFrameId = requestAnimationFrame(animateDriverMarker);
          }
        }
      }

    } catch (e) {
      console.error('Tracking poll error:', e);
    }
  }

  fetchTripData();
  // Poll every 12 seconds per directive
  setInterval(fetchTripData, 12000);
})();
