import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';

interface DriverRatingModalProps {
  visible: boolean;
  passengerName: string;
  onSubmit: (rating: number, tags: string[]) => Promise<void>;
  onSkip: () => void;
}

const TAGS = ['Polite & Respectful', 'On Time at Pickup', 'Pleasant Trip', 'Delayed at Pickup'];

export const DriverRatingModal: React.FC<DriverRatingModalProps> = ({
  visible,
  passengerName,
  onSubmit,
  onSkip
}) => {
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleRating = (value: number) => {
    setRating(value);
    setSelectedTags([]);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit(rating, selectedTags);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Rate Passenger</Text>
          <Text style={styles.subtitle}>How was your ride with {passengerName}?</Text>

          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => handleRating(star)}>
                <Text style={[styles.star, { color: star <= rating ? '#F59E0B' : '#cbd5e1' }]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>

          {rating > 0 && (
            <View style={styles.tagsContainer}>
              {TAGS.map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tag, selectedTags.includes(tag) && styles.tagSelected]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextSelected]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, rating === 0 && styles.submitBtnDisabled]}
            disabled={rating === 0 || loading}
            onPress={handleSubmit}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Rating</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={onSkip} disabled={loading}>
            <Text style={styles.skipBtnText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  star: {
    fontSize: 48,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  tagSelected: {
    borderColor: '#14b8a6', // Teal 500
    backgroundColor: '#f0fdfa',
  },
  tagText: {
    color: '#64748b',
  },
  tagTextSelected: {
    color: '#14b8a6',
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#14b8a6',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitBtnDisabled: {
    backgroundColor: '#5eead4',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  skipBtn: {
    paddingVertical: 12,
  },
  skipBtnText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  }
});
