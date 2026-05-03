// src/screens/shared/ChatScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import {
  sendMessage,
  fetchChatMessages,
  createChat,
} from '../../services/database';
import { colors } from '../../constants/colors';

export default function ChatScreen({ route, navigation }) {
  const { applicationId, otherUser, jobTitle, otherUserName, currentUserId } = route.params;

  // ── FIX: resolve UID from all available sources ──────────────────────────
  const { user, userProfile, resolvedUid } = useAuth();
  const myUid = currentUserId || resolvedUid || user?.uid || userProfile?.uid;

  const [messages, setMessages]   = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading]     = useState(true);
  const [sending, setSending]     = useState(false);
  const [chatId, setChatId]       = useState(null);

  const flatListRef  = useRef(null);
  const inputRef     = useRef(null);
  const fadeAnim     = useRef(new Animated.Value(0)).current;
  const slideAnim    = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (!myUid) {
      Alert.alert('Error', 'Unable to initialize chat. Please log in again.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      setLoading(false);
      return;
    }
    initializeChat();
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

  const initializeChat = async () => {
    try {
      console.log('Initializing chat for application:', applicationId);
      const chatResult = await createChat(applicationId, [myUid, otherUser]);
      if (chatResult.success) {
        console.log('Chat created/found with ID:', chatResult.chatId);
        setChatId(chatResult.chatId);
        await loadMessages(chatResult.chatId);
      } else {
        console.error('Failed to create chat:', chatResult.error);
        Alert.alert('Error', 'Failed to initialize chat');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      Alert.alert('Error', 'Failed to initialize chat');
      setLoading(false);
    }
  };

  const loadMessages = async (targetChatId) => {
    try {
      const result = await fetchChatMessages(targetChatId);
      if (result.success) {
        const formatted = result.messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp?.toDate
            ? msg.timestamp.toDate()
            : new Date(msg.timestamp),
        }));
        setMessages(formatted);
      } else {
        Alert.alert('Error', 'Failed to load messages');
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const sendNewMessage = async () => {
    if (!newMessage.trim() || !chatId || !myUid) return;
    setSending(true);
    const msgText = newMessage.trim();
    setNewMessage('');
    try {
      const messageData = {
        senderId:   myUid,                           // ← FIX: was user.uid
        senderName: userProfile?.name || 'User',
        message:    msgText,
      };
      const result = await sendMessage(chatId, messageData);
      if (result.success) {
        await loadMessages(chatId);
      } else {
        Alert.alert('Error', 'Failed to send message');
        setNewMessage(msgText); // restore on failure
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      setNewMessage(msgText);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      return ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const today     = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    try {
      if (ts.toDateString() === today.toDateString())     return 'Today';
      if (ts.toDateString() === yesterday.toDateString()) return 'Yesterday';
      return ts.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  // Group messages by date
  const groupedMessages = () => {
    const sorted = [...messages].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
    const groups = [];
    let lastDate  = null;
    sorted.forEach((msg) => {
      const dateLabel = formatDate(msg.timestamp);
      if (dateLabel !== lastDate) {
        groups.push({ type: 'date', label: dateLabel, id: `date-${dateLabel}` });
        lastDate = dateLabel;
      }
      groups.push({ ...msg, type: 'message' });
    });
    return groups;
  };

  const renderItem = ({ item }) => {
    if (item.type === 'date') {
      return (
        <View style={styles.dateSeparator}>
          <View style={styles.dateLine} />
          <Text style={styles.dateLabel}>{item.label}</Text>
          <View style={styles.dateLine} />
        </View>
      );
    }

    const isMe = item.senderId === myUid;            // ← FIX: was user.uid

    return (
      <View style={[styles.bubbleWrapper, isMe ? styles.bubbleWrapperMe : styles.bubbleWrapperThem]}>
        {!isMe && (
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarSmallText}>
              {(otherUserName || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
            {item.message}
          </Text>
          <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeThem]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  const getInitials = (name = '') =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.avatarSkeleton} />
            <View>
              <View style={styles.skeletonLine} />
              <View style={[styles.skeletonLine, { width: 80, marginTop: 4 }]} />
            </View>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingBody}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Setting up your chat…</Text>
        </View>
      </View>
    );
  }

  // ─── Main ───────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(otherUserName)}</Text>
          </View>
          <View>
            <Text style={styles.headerName} numberOfLines={1}>{otherUserName}</Text>
            <Text style={styles.headerSub} numberOfLines={1}>{jobTitle}</Text>
          </View>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* ── Messages ── */}
      <Animated.View style={[styles.listContainer, { opacity: fadeAnim }]}>
        <FlatList
          ref={flatListRef}
          data={groupedMessages()}
          renderItem={renderItem}
          keyExtractor={(item) => item.id || item.id}
          inverted
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Text style={styles.emptyIconText}>💬</Text>
              </View>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyBody}>
                Start a conversation with {otherUserName}
              </Text>
            </View>
          }
        />
      </Animated.View>

      {/* ── Input bar ── */}
      <Animated.View
        style={[styles.inputBar, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message…"
          placeholderTextColor="#aaa"
          multiline
          maxLength={500}
          editable={!sending}
          returnKeyType="send"
          onSubmitEditing={sendNewMessage}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!newMessage.trim() || sending) && styles.sendBtnDisabled]}
          onPress={sendNewMessage}
          disabled={!newMessage.trim() || sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendBtnIcon}>↑</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

// ─── Theme ───────────────────────────────────────────────────────────────────
const ACCENT   = '#4F63D2';
const ACCENT_L = '#EEF0FB';
const BG       = '#F7F8FC';
const WHITE    = '#FFFFFF';
const BORDER   = '#ECEEF5';
const TEXT     = '#1A1D2E';
const MUTED    = '#8A8FA8';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },

  // ── Header ──
  header: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    paddingHorizontal: 12,
    paddingTop:       Platform.OS === 'ios' ? 54 : 16,
    paddingBottom:    12,
    backgroundColor:  WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width:            40,
    height:           40,
    alignItems:       'center',
    justifyContent:   'center',
    borderRadius:     20,
    backgroundColor:  BG,
  },
  backBtnText: {
    fontSize:   26,
    color:      ACCENT,
    lineHeight: 30,
    marginTop:  -2,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
    flex:          1,
    marginHorizontal: 8,
  },
  avatar: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: ACCENT,
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarText: {
    color:      WHITE,
    fontSize:   15,
    fontWeight: '700',
  },
  avatarSmall: {
    width:           30,
    height:          30,
    borderRadius:    15,
    backgroundColor: ACCENT,
    alignItems:      'center',
    justifyContent:  'center',
    marginRight:     6,
    alignSelf:       'flex-end',
    marginBottom:    4,
  },
  avatarSmallText: {
    color:      WHITE,
    fontSize:   12,
    fontWeight: '700',
  },
  headerName: {
    fontSize:   16,
    fontWeight: '700',
    color:      TEXT,
  },
  headerSub: {
    fontSize:   12,
    color:      MUTED,
    marginTop:  1,
  },

  // ── Loading ──
  loadingContainer: {
    flex:            1,
    backgroundColor: WHITE,
  },
  loadingBody: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            12,
  },
  loadingText: {
    fontSize: 15,
    color:    MUTED,
  },
  avatarSkeleton: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: BORDER,
  },
  skeletonLine: {
    width:           120,
    height:          12,
    borderRadius:    6,
    backgroundColor: BORDER,
  },

  // ── Messages ──
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical:   12,
  },

  // ── Date separator ──
  dateSeparator: {
    flexDirection:  'row',
    alignItems:     'center',
    marginVertical: 16,
    gap:            8,
  },
  dateLine: {
    flex:            1,
    height:          1,
    backgroundColor: BORDER,
  },
  dateLabel: {
    fontSize:   11,
    color:      MUTED,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // ── Bubbles ──
  bubbleWrapper: {
    flexDirection:  'row',
    marginBottom:   4,
    maxWidth:       '80%',
  },
  bubbleWrapperMe: {
    alignSelf:     'flex-end',
    flexDirection: 'row-reverse',
  },
  bubbleWrapperThem: {
    alignSelf: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical:   9,
    borderRadius:      18,
    maxWidth:          '100%',
  },
  bubbleMe: {
    backgroundColor: ACCENT,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: WHITE,
    borderBottomLeftRadius: 4,
    borderWidth:     1,
    borderColor:     BORDER,
  },
  bubbleText: {
    fontSize:   15,
    lineHeight: 21,
  },
  bubbleTextMe: {
    color: WHITE,
  },
  bubbleTextThem: {
    color: TEXT,
  },
  bubbleTime: {
    fontSize:  10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  bubbleTimeMe: {
    color: 'rgba(255,255,255,0.65)',
  },
  bubbleTimeThem: {
    color: MUTED,
  },

  // ── Empty ──
  emptyState: {
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width:           72,
    height:          72,
    borderRadius:    36,
    backgroundColor: ACCENT_L,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    16,
  },
  emptyIconText: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize:   18,
    fontWeight: '700',
    color:      TEXT,
    marginBottom: 6,
  },
  emptyBody: {
    fontSize:   14,
    color:      MUTED,
    textAlign:  'center',
    lineHeight: 20,
  },

  // ── Input bar ──
  inputBar: {
    flexDirection:   'row',
    alignItems:      'flex-end',
    paddingHorizontal: 12,
    paddingVertical:  10,
    paddingBottom:   Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: WHITE,
    borderTopWidth:  1,
    borderTopColor:  BORDER,
    gap:             8,
  },
  input: {
    flex:              1,
    minHeight:         42,
    maxHeight:         120,
    backgroundColor:   BG,
    borderRadius:      21,
    paddingHorizontal: 16,
    paddingVertical:   10,
    fontSize:          15,
    color:             TEXT,
    borderWidth:       1,
    borderColor:       BORDER,
  },
  sendBtn: {
    width:           42,
    height:          42,
    borderRadius:    21,
    backgroundColor: ACCENT,
    alignItems:      'center',
    justifyContent:  'center',
  },
  sendBtnDisabled: {
    backgroundColor: BORDER,
  },
  sendBtnIcon: {
    color:      WHITE,
    fontSize:   20,
    fontWeight: '700',
    lineHeight: 24,
  },
});