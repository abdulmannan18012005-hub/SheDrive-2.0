import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';

interface PassengerRatingModalProps {
  visible: boolean;
  driverName: string;
  vehiclePlate: string;
  onSubmit: (rating: number, tags: string[], comment: string) => void;
  onSkip: () => void;
}

const POSITIVE_TAGS = ['Polite & Courteous', 'Smooth Driving', 'Clean Car', 'Followed Route', 'Great AC'];
const CONSTRUCTIVE_TAGS = ['Rash Driving', 'AC Not Working', 'Late Arrival', 'Unclean Vehicle'];

export const PassengerRatingModal: React.FC<PassengerRatingModalProps> = ({
  visible,
  driverName,
  vehiclePlate,
  onSubmit,
  onSkip
}) => {
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');

  const availableTags = rating >= 4 ? POSITIVE_TAGS : (rating > 0 ? CONSTRUCTIVE_TAGS : []);

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

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Rate Your Trip</Text>
          <Text style={styles.subtitle}>How was your ride with {driverName}?</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{vehiclePlate}</Text>
          </View>

          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => handleRating(star)}>
                <Text style={[styles.star, { color: star <= rating ? '#F59E0B' : '#cbd5e1' }]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>

          {rating > 0 && (
            <ScrollView style={styles.tagsScroll} contentContainerStyle={styles.tagsContainer}>
              {availableTags.map(tag => (
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
            </ScrollView>
          )}

          <TextInput
            style={styles.commentInput}
            placeholder="Any additional comments? (Optional)"
            placeholderTextColor="#94a3b8"
            multiline
            value={comment}
            onChangeText={setComment}
          />

          <TouchableOpacity
            style={[styles.submitBtn, rating === 0 && styles.submitBtnDisabled]}
            disabled={rating === 0}
            onPress={() => onSubmit(rating, selectedTags, comment)}
          >
            <Text style={styles.submitBtnText}>Submit Feedback</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={onSkip}>
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
    maxHeight: '90%',
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
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 24,
  },
  badgeText: {
    color: '#475569',
    fontWeight: 'bold',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  star: {
    fontSize: 48,
  },
  tagsScroll: {
    width: '100%',
    maxHeight: 120,
    marginBottom: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
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
    borderColor: '#E91E63',
    backgroundColor: '#fdf2f8',
  },
  tagText: {
    color: '#64748b',
  },
  tagTextSelected: {
    color: '#E91E63',
    fontWeight: '600',
  },
  commentInput: {
    width: '100%',
    height: 80,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
    marginBottom: 24,
    color: '#334155',
  },
  submitBtn: {
    backgroundColor: '#E91E63', // Deep Pink
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitBtnDisabled: {
    backgroundColor: '#f43f5e80',
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
