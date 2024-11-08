import React, { useState, useEffect } from 'react';
// screens/LoginScreen.tsx
import { View, StyleSheet, Image, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ScrollView, Alert } from 'react-native';
import {
  TextInput,
  Button,
  Text,
  RadioButton,
  Switch,
  Portal,
  Dialog,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FrontendChatService from '../services/FrontendChatService'
interface LoginScreenProps {
  navigation: NavigationProp<any>;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const [campusType, setCampusType] = useState<'신촌' | '원주'>('신촌');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [autoLogin, setAutoLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const validateInputs = () => {
    if (!studentId.trim()) {
      setError('학번을 입력해주세요.');
      return false;
    }
    if (!password.trim()) {
      setError('비밀번호를 입력해주세요.');
      return false;
    }
    if (studentId.length !== 10) {
      setError('올바른 학번 형식이 아닙니다.');
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    try {
      Keyboard.dismiss();
      setError(null);

      if (!validateInputs()) {
        return;
      }

      setIsLoading(true);

      // 자동 로그인 설정 저장
      if (autoLogin) {
        await AsyncStorage.setItem('autoLogin', 'true');
        await AsyncStorage.setItem('studentId', studentId);
        await AsyncStorage.setItem('campus', campusType);
      } else {
        await AsyncStorage.removeItem('autoLogin');
        await AsyncStorage.removeItem('studentId');
        await AsyncStorage.removeItem('campus');
      }

      // 임시 로그인 로직
      setTimeout(() => {
        setIsLoading(false);
        navigation.navigate('Chat');
      }, 1500);

    } catch (err) {
      setIsLoading(false);
      setError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
      console.error('Login error:', err);
    }
  };

  const handleCampusChange = async (newCampus: '신촌' | '원주') => {
    try {
      // 먼저 상태 업데이트
      setCampusType(newCampus);
      
      // AsyncStorage에 저장
      await AsyncStorage.setItem('selectedCampus', newCampus);
      
      // ChatService에도 캠퍼스 정보 업데이트
      const chatService = FrontendChatService.getInstance();
      chatService.setCampus(newCampus);
      
      console.log(`Campus changed to: ${newCampus}`);
      
    } catch (error) {
      console.error('Error saving campus selection:', error);
      
      // 저장 실패 시 이전 상태로 복구
      const previousCampus = await AsyncStorage.getItem('selectedCampus') || '신촌';
      setCampusType(previousCampus as '신촌' | '원주');
      
      // 사용자에게 에러 알림
      Alert.alert(
        '설정 저장 실패',
        '캠퍼스 설정을 저장하는데 실패했습니다. 다시 시도해주세요.',
        [{ text: '확인' }]
      );
    }
  };
  // 컴포넌트 마운트 시 저장된 캠퍼스 정보 불러오기
  useEffect(() => {
    const loadSavedCampus = async () => {
      try {
        const savedCampus = await AsyncStorage.getItem('selectedCampus');
        if (savedCampus) {
          setCampusType(savedCampus as '신촌' | '원주');
        }
      } catch (error) {
        console.error('Error loading saved campus:', error);
      }
    };
    
    loadSavedCampus();
  }, []);
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            {/* 로고 섹션 */}
            <View style={styles.logoSection}>
              <Image
                source={require('../../assets/yonsei-logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text variant="headlineMedium" style={styles.title}>
                연세 AI
              </Text>
            </View>

            {/* 캠퍼스 선택 섹션 */}
            <View style={styles.campusSection}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                캠퍼스 선택
              </Text>
              <RadioButton.Group
                onValueChange={(value) => handleCampusChange(value as '신촌' | '원주')}
                value={campusType}
              >
                <View style={styles.radioContainer}>
                  <RadioButton.Item
                    label="신촌캠퍼스"
                    value="신촌"
                    position="leading"
                    labelStyle={styles.radioLabel}
                  />
                  <RadioButton.Item
                    label="원주캠퍼스"
                    value="원주"
                    position="leading"
                    labelStyle={styles.radioLabel}
                  />
                </View>
              </RadioButton.Group>
            </View>

            {/* 입력 폼 섹션 */}
            <View style={styles.formSection}>
              <TextInput
                mode="outlined"
                label="학번"
                value={studentId}
                onChangeText={setStudentId}
                keyboardType="number-pad"
                maxLength={10}
                style={styles.input}
                error={!!error && error.includes('학번')}
              />
              <TextInput
                mode="outlined"
                label="비밀번호"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                style={styles.input}
                error={!!error && error.includes('비밀번호')}
              />

              <View style={styles.switchContainer}>
                <Switch
                  value={autoLogin}
                  onValueChange={setAutoLogin}
                  color={theme.colors.primary}
                />
                <Text style={styles.switchLabel}>자동 로그인</Text>
              </View>

              {error && (
                <Text style={styles.errorText}>
                  {error}
                </Text>
              )}

              <Button
                mode="contained"
                onPress={handleLogin}
                style={styles.loginButton}
                disabled={isLoading}
              >
                {isLoading ? '로그인 중...' : '로그인'}
              </Button>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <Portal>
        <Dialog visible={isLoading} dismissable={false}>
          <Dialog.Content style={styles.dialogContent}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>로그인 중입니다...</Text>
          </Dialog.Content>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    color: '#00205B',
    fontWeight: 'bold',
  },
  campusSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 8,
    color: '#333',
  },
  radioContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  radioLabel: {
    fontSize: 16,
  },
  formSection: {
    width: '100%',
  },
  input: {
    marginBottom: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  switchLabel: {
    marginLeft: 8,
    fontSize: 16,
  },
  loginButton: {
    paddingVertical: 8,
    marginTop: 8,
  },
  errorText: {
    color: '#B00020',
    marginBottom: 16,
    textAlign: 'center',
  },
  dialogContent: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});

export default LoginScreen;