import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
  Keyboard,
  InteractionManager,
  BackHandler
} from 'react-native';
import { IconButton, Portal, Dialog } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationProp } from '@react-navigation/native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import ChatService from '../services/FrontendChatService';
import { Message } from '../types/frontendTypes';
import { debounce } from 'lodash';
import { useKeyboard } from '@react-native-community/hooks';

interface ChatScreenProps {
  navigation: NavigationProp<any>;
}

const INITIAL_MESSAGE = "안녕하세요! 연세대학교 AI 도우미입니다. 어떤 것이 궁금하신가요?";
const BATCH_SIZE = 20;
const MAX_INPUT_LENGTH = 500;
const TYPING_DEBOUNCE_TIME = 300;

const ChatScreen: React.FC<ChatScreenProps> = ({ navigation }) => {
  // 상태 관리
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [showRetryDialog, setShowRetryDialog] = useState(false);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [inputHeight, setInputHeight] = useState(40);

  // refs
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const chatService = useRef(ChatService.getInstance());
  const retryCount = useRef(0);
  const maxRetries = 3;

  // 키보드 관리
  const keyboard = useKeyboard();
  
  // 초기 메시지 설정
  useEffect(() => {
    const initialMessage: Message = {
      id: 'initial',
      text: INITIAL_MESSAGE,
      isUser: false,
      timestamp: new Date()
    };
    setMessages([initialMessage]);
  }, []);

  // 네트워크 상태 모니터링
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(!!state.isConnected);
      if (!state.isConnected) {
        Alert.alert(
          '네트워크 오류',
          '인터넷 연결이 불안정합니다. 연결을 확인해주세요.',
          [{ text: '확인' }]
        );
      }
    });
  
    return () => unsubscribe();
  }, []);

  // 앱 종료 방지
  useEffect(() => {
    const backAction = () => {
      if (messages.length > 1) {
        Alert.alert(
          '채팅 종료',
          '대화를 종료하시겠습니까?',
          [
            { text: '취소', style: 'cancel' },
            { 
              text: '종료', 
              style: 'destructive',
              onPress: () => navigation.goBack()
            }
          ]
        );
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [messages.length, navigation]);
  // 메시지 전송 처리
  const handleSend = async () => {
    if (inputText.trim() === '' || isLoading || !isConnected) return;
  
    const messageText = inputText.trim();
    const originalInput = messageText; // 원본 메시지 저장
    
    try {
      setIsLoading(true);
      setInputText('');  // 입력창 초기화
      
      // 사용자 메시지 추가
      const userMessage: Message = {
        id: Date.now().toString(),
        text: messageText,
        isUser: true,
        timestamp: new Date(),
        status: 'sending'
      };
  
      setMessages(prev => [...prev, userMessage]);
      scrollToBottom();
  
      const response = await chatService.current.processMessage(messageText);
      
      // 성공적으로 전송된 경우 상태 업데이트
      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id 
          ? { ...msg, status: 'sent' } 
          : msg
      ));
  
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: typeof response.text === 'string' 
          ? response.text 
          : '응답을 처리할 수 없습니다.',
        isUser: false,
        timestamp: new Date(),
        status: 'sent'
      };
  
      setMessages(prev => [...prev, aiMessage]);
      retryCount.current = 0;
  
    } catch (error) {
      console.error('Message processing error:', error);
      
      // 에러 발생 시 입력 내용 복구
      setInputText(originalInput);
      
      // 에러 메시지 표시
      const errorMessage = error instanceof Error 
        ? error.message 
        : '알 수 없는 오류가 발생했습니다.';
  
      // 실패한 메시지 상태 업데이트
      setMessages(prev => prev.map(msg => 
        msg.text === messageText && msg.isUser 
          ? { ...msg, status: 'error' } 
          : msg
      ));
  
      if (retryCount.current < maxRetries) {
        retryCount.current++;
        setFailedMessage(messageText);
        setShowRetryDialog(true);
      } else {
        Alert.alert('오류', '여러 번의 시도에도 메시지 전송에 실패했습니다.');
        retryCount.current = 0;
      }
  
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  // 재시도 다이얼로그 처리
  const handleRetry = async () => {
    setShowRetryDialog(false);
    if (failedMessage) {
      setInputText(failedMessage);
      setFailedMessage(null);
      await handleSend();
    }
  };

  // 새로고침 처리
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      await chatService.current.clearHistory();
      setMessages([{
        id: 'initial',
        text: INITIAL_MESSAGE,
        isUser: false,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Refresh error:', error);
      Alert.alert('오류', '대화 내용을 초기화하는데 실패했습니다.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // 설정 화면 이동
  const handleSettingsPress = () => {
    navigation.navigate('Settings');
  };

  // 스크롤 최적화
  const scrollToBottom = () => {
    InteractionManager.runAfterInteractions(() => {
      if (flatListRef.current && messages.length > 0) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    });
  };

  // 타이핑 디바운스 처리
  const debouncedTyping = useMemo(
    () => debounce((text: string) => {
      setIsTyping(text.length > 0);
    }, TYPING_DEBOUNCE_TIME),
    []
  );

  // 입력 처리
  const handleInputChange = (text: string) => {
    if (text.length <= MAX_INPUT_LENGTH) {
      setInputText(text);
      debouncedTyping(text);
    }
  };

  // 메시지 렌더링
  const renderMessage = useCallback(({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageBubble,
        item.isUser ? styles.userMessage : styles.aiMessage,
        item.error && styles.errorMessage,
      ]}
    >
      <Text style={[
        styles.messageText,
        item.isUser ? styles.userMessageText : styles.aiMessageText,
        item.error && styles.errorMessageText,
      ]}>
        {item.text}
      </Text>
      <Text style={[
        styles.timestamp,
        item.isUser ? styles.userTimestamp : styles.aiTimestamp,
      ]}>
        {item.timestamp.toLocaleTimeString()}
      </Text>
    </View>
  ), []);

  return (
    <SafeAreaView style={styles.container}>
      {/* 상단 배너 */}
      <View style={styles.banner}>
        <Text style={styles.bannerText}>연세 AI</Text>
        <IconButton
          icon="cog"
          size={24}
          iconColor="#fff"
          style={styles.settingsButton}
          onPress={handleSettingsPress}
        />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={scrollToBottom}
        onLayout={scrollToBottom}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#00205B']}
          />
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.inputContainer}
      >
        <TextInput
          ref={inputRef}
          style={[styles.input, { height: Math.max(40, inputHeight) }]}
          value={inputText}
          onChangeText={handleInputChange}
          placeholder="연세대학교에 대해 물어보세요"
          placeholderTextColor="#666"
          multiline
          maxLength={MAX_INPUT_LENGTH}
          editable={!isLoading && isConnected}
          onContentSizeChange={(event) => {
            setInputHeight(Math.min(100, event.nativeEvent.contentSize.height));
          }}
        />
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#00205B" />
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || !isConnected) && styles.sendButtonDisabled
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || !isConnected}
          >
            <Text style={styles.sendButtonText}>전송</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>

      {/* 재시도 다이얼로그 */}
      <Portal>
        <Dialog visible={showRetryDialog} onDismiss={() => setShowRetryDialog(false)}>
          <Dialog.Title>메시지 전송 실패</Dialog.Title>
          <Dialog.Content>
            <Text>메시지 전송에 실패했습니다. 다시 시도하시겠습니까?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <TouchableOpacity onPress={() => setShowRetryDialog(false)}>
              <Text style={styles.dialogButtonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleRetry}>
              <Text style={styles.dialogButtonText}>재시도</Text>
            </TouchableOpacity>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  banner: {
    height: 65,
    backgroundColor: '#00205B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  bannerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  settingsButton: {
    position: 'absolute',
    right: 8,
  },
  messageList: {
    padding: 16,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#00205B',
    marginLeft: '20%',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    marginRight: '20%',
  },
  errorMessage: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  aiMessageText: {
    color: '#000',
  },
  errorMessageText: {
    color: '#c62828',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  aiTimestamp: {
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    fontSize: 16,
    color: '#000',
    maxHeight: 100,
    minHeight: 40,
  },
  loadingContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    backgroundColor: '#00205B',
    borderRadius: 20,
    paddingHorizontal: 20,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dialogButtonText: {
    color: '#00205B',
    fontSize: 16,
    fontWeight: '500',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
});

export default ChatScreen;