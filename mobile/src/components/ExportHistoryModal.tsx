import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';

interface ExportHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  authToken: string;
}

export const ExportHistoryModal: React.FC<ExportHistoryModalProps> = ({ visible, onClose, authToken }) => {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('This Year');
  const [format, setFormat] = useState('CSV');

  const RANGES = ['Last 7 Days', 'Last 30 Days', 'This Year', 'All Time'];
  const FORMATS = ['CSV Spreadsheet', 'Text Summary'];

  const handleExport = async () => {
    setLoading(true);
    try {
      if (format === 'Text Summary') {
        const res = await fetch(`http://localhost:3000/api/v1/rides/export/summary`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        Alert.alert("Export Summary", `Total Trips: ${data.total_trips}\nTotal Spent: PKR ${data.total_spent}\nAverage Fare: PKR ${data.avg_fare.toFixed(2)}`);
      } else {
        // CSV Export
        let url = `http://localhost:3000/api/v1/rides/export/csv`;
        if (dateRange !== 'All Time') {
          const start = new Date();
          if (dateRange === 'Last 7 Days') start.setDate(start.getDate() - 7);
          if (dateRange === 'Last 30 Days') start.setDate(start.getDate() - 30);
          if (dateRange === 'This Year') start.setMonth(0, 1);
          url += `?startDate=${start.toISOString()}`;
        }

        const fileUri = `file:///dummy/shedrive-trips-export.csv`;
        Alert.alert("Success", `Export simulated! Check your files at ${fileUri}.`);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Export History</Text>
          <Text style={styles.subtitle}>Select the date range and format for your ride history export.</Text>

          <Text style={styles.sectionLabel}>Date Range</Text>
          <View style={styles.pillContainer}>
            {RANGES.map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.pill, dateRange === r && styles.pillActive]}
                onPress={() => setDateRange(r)}
              >
                <Text style={[styles.pillText, dateRange === r && styles.pillTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Format</Text>
          <View style={styles.pillContainer}>
            {FORMATS.map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.pill, format === f.split(' ')[0] && styles.pillActive]}
                onPress={() => setFormat(f.split(' ')[0])}
              >
                <Text style={[styles.pillText, format === f.split(' ')[0] && styles.pillTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportBtn} onPress={handleExport} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.exportText}>Generate & Download</Text>}
            </TouchableOpacity>
          </View>
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
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  pillText: {
    color: '#475569',
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelText: {
    color: '#334155',
    fontSize: 16,
    fontWeight: 'bold',
  },
  exportBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#E91E63',
    alignItems: 'center',
  },
  exportText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
