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
  const [loading, setLoading] = useState(false);
  if (user) return <Redirect href="/" />;
  const submit = async () => {
    if (loading) return;
    setLoading(true); setError(undefined);
    try { await register(name, email, password); }
    catch { setError('No se pudo crear la cuenta. Comprueba los datos e inténtalo nuevamente.'); }
    finally { setLoading(false); }
  };
  return <View><Text>Register</Text><TextInput value={name} onChangeText={setName} placeholder="Name" editable={!loading} /><TextInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" editable={!loading} /><TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry editable={!loading} /><Button title={loading ? 'Registering...' : 'Register'} onPress={() => void submit()} disabled={loading || !name.trim() || !email.trim() || !password} />{error && <Text>{error}</Text>}<Link href="/auth/login">Back to login</Link></View>;
}
