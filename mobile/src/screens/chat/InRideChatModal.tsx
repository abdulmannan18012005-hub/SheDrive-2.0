import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useRideChat } from '../../hooks/useRideChat';

interface InRideChatModalProps {
  visible: boolean;
  onClose: () => void;
  rideId: string;
  authToken: string;
  userId: string;
  isPassenger: boolean;
  counterpartyName: string;
  counterpartyAvatar: string | null;
}

export const InRideChatModal: React.FC<InRideChatModalProps> = ({ 
  visible, onClose, rideId, authToken, userId, isPassenger, counterpartyName, counterpartyAvatar 
}) => {
  const { messages, sendMessage } = useRideChat(rideId, authToken, visible);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const QUICK_CHIPS_PASSENGER = [
    "Waiting at main gate",
    "Wearing black abaya",
    "Please turn on AC ❄️",
    "Coming down in 2 mins"
  ];

  const QUICK_CHIPS_DRIVER = [
    "I have arrived outside",
    "Traffic is slow, 3 mins away",
    "Please confirm building/gate number"
  ];

  const chips = isPassenger ? QUICK_CHIPS_PASSENGER : QUICK_CHIPS_DRIVER;

  useEffect(() => {
    if (visible && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages.length, visible]);

  const handleSend = async () => {
    if (inputText.trim().length === 0) return;
    const sent = await sendMessage(inputText);
    if (sent) {
      setInputText('');
    }
  };

  const handleChipTap = async (text: string) => {
    await sendMessage(text);
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.sender_id === userId;
    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowThem]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextThem]}>
            {item.message_text}
          </Text>
          <Text style={[styles.timestamp, isMe ? styles.timestampMe : styles.timestampThem]}>
            {new Date(parseInt(item.created_at)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        <View style={styles.header}>
          <View style={styles.headerProfile}>
            {counterpartyAvatar ? (
              <Image source={{ uri: counterpartyAvatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder} />
            )}
            <View>
              <Text style={styles.counterpartyName}>{counterpartyName}</Text>
              <Text style={styles.activeStatus}>🟢 Active Trip</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />

        <View style={styles.chipsContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={chips}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.chip} onPress={() => handleChipTap(item)}>
                <Text style={styles.chipText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    marginRight: 12,
  },
  counterpartyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  activeStatus: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
  },
  closeIcon: {
    fontSize: 20,
    color: '#64748b',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  messageRow: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowThem: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  bubbleMe: {
    backgroundColor: '#E91E63',
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: '#f1f5f9',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
  },
  messageTextMe: {
    color: '#fff',
  },
  messageTextThem: {
    color: '#0f172a',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timestampMe: {
    color: '#fbcfe8',
  },
  timestampThem: {
    color: '#94a3b8',
  },
  chipsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fff',
    paddingVertical: 8,
  },
  chip: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 8,
  },
  chipText: {
    color: '#334155',
    fontSize: 13,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
    marginRight: 12,
  },
  sendBtn: {
    backgroundColor: '#E91E63',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  sendBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});
