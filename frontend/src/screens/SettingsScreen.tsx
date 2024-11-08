// src/screens/SettingsScreen.tsx
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import {
  List,
  Text,
  Divider,
  RadioButton,
  Portal,
  Dialog,
  Button,
  useTheme,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { NavigationProp } from '@react-navigation/native';

interface SettingsScreenProps {
  navigation: NavigationProp<any>;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const [campus, setCampus] = useState('신촌');
  const [showCampusDialog, setShowCampusDialog] = useState(false);
  
  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const handleBack = () => {
    navigation.goBack();
  };

  const handleCampusChange = (newCampus: string) => {
    setCampus(newCampus);
    setShowCampusDialog(false);
  };

  const openURL = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('URL을 열 수 없습니다:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={handleBack}
        />
        <Text variant="headlineSmall" style={styles.headerTitle}>설정</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView>
        {/* 기본 설정 섹션 */}
        <List.Section>
          <List.Subheader>기본 설정</List.Subheader>
          <List.Item
            title="캠퍼스 설정"
            description={campus}
            left={props => <List.Icon {...props} icon="school" />}
            onPress={() => setShowCampusDialog(true)}
          />
        </List.Section>

        <Divider />

        {/* 정보 섹션 */}
        <List.Section>
          <List.Subheader>앱 정보</List.Subheader>
          <List.Item
            title="앱 버전"
            description={`v${appVersion}`}
            left={props => <List.Icon {...props} icon="information" />}
          />
          <List.Item
            title="개인정보 처리방침"
            left={props => <List.Icon {...props} icon="shield-account" />}
            onPress={() => openURL('https://yonsei.ac.kr/privacy-policy')}
          />
          <List.Item
            title="서비스 이용약관"
            left={props => <List.Icon {...props} icon="file-document" />}
            onPress={() => openURL('https://yonsei.ac.kr/terms-of-service')}
          />
        </List.Section>

        <Divider />

        {/* 지원 섹션 */}
        <List.Section>
          <List.Subheader>지원</List.Subheader>
          <List.Item
            title="문의/건의"
            description="개선사항이나 문의사항을 보내주세요"
            left={props => <List.Icon {...props} icon="message-text" />}
            onPress={() => openURL('mailto:support@yonsei.ac.kr')}
          />
        </List.Section>
      </ScrollView>

      {/* 캠퍼스 선택 다이얼로그 */}
      <Portal>
        <Dialog visible={showCampusDialog} onDismiss={() => setShowCampusDialog(false)}>
          <Dialog.Title>캠퍼스 선택</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group onValueChange={handleCampusChange} value={campus}>
              <RadioButton.Item label="신촌캠퍼스" value="신촌" />
              <RadioButton.Item label="원주캠퍼스" value="원주" />
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowCampusDialog(false)}>취소</Button>
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
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontWeight: '500',
  },
  headerRight: {
    width: 48, // 좌우 균형을 맞추기 위한 더미 뷰
  },
  version: {
    textAlign: 'center',
    marginVertical: 20,
    color: '#666',
  },
});

export default SettingsScreen;