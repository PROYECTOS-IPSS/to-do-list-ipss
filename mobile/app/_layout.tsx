import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../src/ui/tokens';
import { AuthProvider } from '../src/auth/AuthProvider';

export default function RootLayout() {
  return <SafeAreaProvider><StatusBar style="light" backgroundColor={colors.background} /><AuthProvider><Stack screenOptions={{ headerShown: false }} /></AuthProvider></SafeAreaProvider>;
}
