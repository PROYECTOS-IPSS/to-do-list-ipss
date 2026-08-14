import { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import { Link, Redirect } from 'expo-router';
import { useAuth } from '../../src/auth/AuthProvider';

export default function Register() {
  const { user, register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  if (user) return <Redirect href="/" />;
  return <View><Text>Register</Text><TextInput value={name} onChangeText={setName} placeholder="Name" /><TextInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" /><TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry /><Button title="Register" onPress={() => void register(name, email, password).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Registration failed.'))} />{error && <Text>{error}</Text>}<Link href="/auth/login">Back to login</Link></View>;
}
