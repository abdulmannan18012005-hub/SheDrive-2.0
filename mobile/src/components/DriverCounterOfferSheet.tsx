import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';

interface Props {
  baseFare: number;
  onSendCounter: (offer: number) => Promise<void>;
  onCancel: () => void;
}

export const DriverCounterOfferSheet: React.FC<Props> = ({ baseFare, onSendCounter, onCancel }) => {
  const [offer, setOffer] = useState<number>(baseFare + 50);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(10);

  useEffect(() => {
    if (!isSubmitted) return;
    if (timeLeft <= 0) {
      onCancel(); // Expired locally, close sheet
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isSubmitted, timeLeft, onCancel]);

  const handleSend = async () => {
    if (isSubmitted) return;
    try {
      await onSendCounter(offer);
      setIsSubmitted(true);
      setTimeLeft(10);
    } catch (err) {
      // Handle error (e.g. 1-counter limit reached)
      console.error(err);
      onCancel();
    }
  };

  const incrementOptions = [50, 100, 150];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Counter Offer</Text>
      
      {!isSubmitted ? (
        <>
          <View style={styles.inputContainer}>
            <Text style={styles.currencyPrefix}>PKR</Text>
            <TextInput 
              style={styles.offerInput}
              value={offer.toString()}
              keyboardType="numeric"
              onChangeText={(t) => setOffer(Number(t.replace(/[^0-9]/g, '')))}
            />
          </View>

          <View style={styles.chipsContainer}>
            {incrementOptions.map(inc => (
              <TouchableOpacity key={inc} style={styles.chip} onPress={() => setOffer(baseFare + inc)}>
                <Text style={styles.chipText}>+{inc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
              <Text style={styles.sendBtnText}>Send Counter</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.waitingContainer}>
          <Text style={styles.waitingText}>Counter submitted for PKR {offer}</Text>
          <Text style={styles.waitingSubtext}>Waiting for passenger...</Text>
          
          <View style={styles.timerBarBg}>
            <View style={[styles.timerBarFill, { width: `${(timeLeft / 10) * 100}%` }]} />
          </View>
          <Text style={styles.timerText}>{timeLeft}s left</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 10,
    minHeight: 250,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  currencyPrefix: {
    fontSize: 20,
    color: '#64748b',
    marginRight: 8,
    fontWeight: 'bold',
  },
  offerInput: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0f172a',
    borderBottomWidth: 2,
    borderBottomColor: '#E91E63',
    minWidth: 120,
    textAlign: 'center',
    paddingVertical: 4,
  },
  chipsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  chip: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  chipText: {
    color: '#334155',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sendBtn: {
    flex: 2,
    backgroundColor: '#E91E63',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  waitingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  waitingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  waitingSubtext: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
  },
  timerBarBg: {
    height: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 2,
    width: '100%',
    marginBottom: 8,
  },
  timerBarFill: {
    height: '100%',
    backgroundColor: '#E91E63',
    borderRadius: 2,
  },
  timerText: {
    fontSize: 14,
    color: '#94a3b8',
  }
});
