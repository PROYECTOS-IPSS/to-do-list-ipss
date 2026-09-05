import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/auth/AuthProvider';

export default function RootLayout() {
  return <SafeAreaProvider><StatusBar style="dark" /><AuthProvider><Stack screenOptions={{ headerShown: false }} /></AuthProvider></SafeAreaProvider>;
}
