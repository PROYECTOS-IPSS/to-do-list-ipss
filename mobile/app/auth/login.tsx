import { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import { Link, Redirect } from 'expo-router';
import { useAuth } from '../../src/auth/AuthProvider';

export default function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  if (user) return <Redirect href="/" />;
  return <View><Text>Login</Text><TextInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" /><TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry /><Button title="Login" onPress={() => void login(email, password).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Login failed.'))} />{error && <Text>{error}</Text>}<Link href="/auth/register">Create account</Link></View>;
}
