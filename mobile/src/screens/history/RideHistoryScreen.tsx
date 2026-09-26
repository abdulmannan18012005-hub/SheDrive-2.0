import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { RideHistoryCard } from './RideHistoryCard';

interface RideHistoryScreenProps {
  navigation: any;
  authToken: string;
}

const FILTERS = ['All', 'Completed', 'Cancelled', 'This Week', 'This Month'];

export const RideHistoryScreen: React.FC<RideHistoryScreenProps> = ({ navigation, authToken }) => {
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchHistory = useCallback(async (pageNum = 1, isRefresh = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      
      let url = `http://localhost:3000/api/v1/rides/history?page=${pageNum}&limit=10`;
      
      if (activeFilter === 'Completed') url += '&status=completed';
      if (activeFilter === 'Cancelled') url += '&status=cancelled';
      if (activeFilter === 'This Week') {
        const start = new Date();
        start.setDate(start.getDate() - 7);
        url += `&startDate=${start.toISOString()}`;
      }
      if (activeFilter === 'This Month') {
        const start = new Date();
        start.setMonth(start.getMonth() - 1);
        url += `&startDate=${start.toISOString()}`;
      }
      if (searchQuery) url += `&searchQuery=${encodeURIComponent(searchQuery)}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();

      if (res.ok) {
        if (isRefresh || pageNum === 1) {
          setRides(data.rides || []);
        } else {
          setRides(prev => [...prev, ...(data.rides || [])]);
        }
        setHasMore(data.pagination.page < data.pagination.totalPages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authToken, activeFilter, searchQuery]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(1);
      fetchHistory(1, true);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, activeFilter, fetchHistory]);

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchHistory(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchHistory(nextPage);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search location, name, plate..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={item => item}
          style={styles.filtersList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, activeFilter === item && styles.filterChipActive]}
              onPress={() => setActiveFilter(item)}
            >
              <Text style={[styles.filterText, activeFilter === item && styles.filterTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading && page === 1 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#E91E63" />
        </View>
      ) : rides.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No ride history found</Text>
          <Text style={styles.emptySubtitle}>Try adjusting your filters or search.</Text>
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <RideHistoryCard
              ride={item}
              onPress={() => navigation.navigate('RideDetailHistory', { rideId: item.id })}
            />
          )}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading && page > 1 ? <ActivityIndicator style={{ margin: 16 }} color="#E91E63" /> : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#334155',
    marginBottom: 12,
  },
  filtersList: {
    flexGrow: 0,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#E91E63', // Deep Pink
  },
  filterText: {
    color: '#64748b',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  }
});
