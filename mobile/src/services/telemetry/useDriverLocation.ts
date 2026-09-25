import { useEffect, useRef } from 'react';
import { locationTrackingService } from './LocationTrackingService';

export function useDriverLocation() {
  const isTrackingRef = useRef(false);

  useEffect(() => {
    // Cleanup on unmount if we want to tie tracking strictly to the component lifecycle,
    // though typically driver location runs globally as long as they are 'online'.
    return () => {
      // Opt to leave background tracking running unless explicitly stopped
    };
  }, []);

  const startTracking = async () => {
    if (!isTrackingRef.current) {
      await locationTrackingService.startTracking();
      isTrackingRef.current = true;
    }
  };

  const stopTracking = async () => {
    if (isTrackingRef.current) {
      await locationTrackingService.stopTracking();
      isTrackingRef.current = false;
    }
  };

  const getCurrentPosition = async () => {
    return await locationTrackingService.getCurrentPosition();
  };

  return {
    startTracking,
    stopTracking,
    getCurrentPosition
  };
}
