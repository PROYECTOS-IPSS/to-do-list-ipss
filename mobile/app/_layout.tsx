import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/auth/AuthProvider';
import { colors } from '../src/ui/tokens';

export default function RootLayout() {
  return <SafeAreaProvider><StatusBar style="light" /><AuthProvider><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} /></AuthProvider></SafeAreaProvider>;
}
