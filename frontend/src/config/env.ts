import Constants from 'expo-constants';
import { Platform } from 'react-native';

// 여기에 본인 컴퓨터의 로컬 IP 주소를 입력하세요
const LOCAL_IP: string = '192.168.0.7'; // 예시 IP (실제 IP로 변경 필요)

const BACKEND_URL = Platform.select({
  ios: `http://${LOCAL_IP}:4000`,
  android: `http://${LOCAL_IP}:4000`,
  web: 'http://localhost:4000'
}) || `http://${LOCAL_IP}:4000`;

export const ENV = {
  openaiApiKey: Constants.expoConfig?.extra?.openaiApiKey ?? '',
  apiBaseUrl: BACKEND_URL,
  maxTokens: Constants.expoConfig?.extra?.maxTokens ?? 500,
  temperature: Constants.expoConfig?.extra?.temperature ?? 0.7,
};