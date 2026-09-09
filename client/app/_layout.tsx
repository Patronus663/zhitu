import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import Toast from 'react-native-toast-message';
import { Provider } from '@/components/Provider';

import '../global.css';

LogBox.ignoreLogs([
  "TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found",
  // 添加其它想暂时忽略的错误或警告信息
]);

export default function RootLayout() {
  return (
    <Provider>
      <Stack
        screenOptions={{
          animation: 'slide_from_right',
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          headerShown: false
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="question-entry" />
        <Stack.Screen name="question-edit" />
        <Stack.Screen name="plan-create" />
        <Stack.Screen name="task-detail" />
        <Stack.Screen name="my-questions" />
        <Stack.Screen name="question-detail" />
        <Stack.Screen name="my-plans" />
        <Stack.Screen name="plan-detail" />
      </Stack>
      <Toast />
    </Provider>
  );
}
