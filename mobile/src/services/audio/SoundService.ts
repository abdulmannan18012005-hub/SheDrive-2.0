// If expo-av or expo-haptics is available, use it.
// We fallback to simple mock console logging if not to avoid breaking builds.

export class SoundService {
  static async playDriverArrivedSound(): Promise<void> {
    try {
      // Mock logic for driver arrived chime
      console.log('🎵 [Audio] Playing: Driver Arrived');
      // e.g. await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.warn('Audio playback failed', err);
    }
  }

  static async playTripStartedSound(): Promise<void> {
    try {
      console.log('🎵 [Audio] Playing: Trip Started');
    } catch (err) {
      console.warn('Audio playback failed', err);
    }
  }

  static async playTripCompletedSound(): Promise<void> {
    try {
      console.log('🎵 [Audio] Playing: Trip Completed');
    } catch (err) {
      console.warn('Audio playback failed', err);
    }
  }
}
