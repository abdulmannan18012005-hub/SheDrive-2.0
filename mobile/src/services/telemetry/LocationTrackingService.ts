import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { apiClient as api } from '../apiClient';

const LOCATION_TASK_NAME = 'BACKGROUND_LOCATION_TASK';

// Define the background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      const location = locations[0];
      try {
        await api.post('/telemetry/location', {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          heading: location.coords.heading || 0,
          speed: location.coords.speed || 0,
        });
      } catch (err) {
        console.error('Failed to post background location', err);
      }
    }
  }
});

class LocationTrackingService {
  private isTracking = false;

  async startTracking() {
    if (this.isTracking) return;
    
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.warn('Foreground location permission not granted');
      return;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.warn('Background location permission not granted');
      return;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (!isRegistered) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10,
        timeInterval: 5000,
        deferredUpdatesInterval: 5000,
        pausesUpdatesAutomatically: true,
        showsBackgroundLocationIndicator: true,
      });
      this.isTracking = true;
    }
  }

  async stopTracking() {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      this.isTracking = false;
    }
  }

  async getCurrentPosition() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    try {
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      return location;
    } catch (err) {
      console.error('Error getting current position:', err);
      return null;
    }
  }
}

export const locationTrackingService = new LocationTrackingService();
