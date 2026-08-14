import { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import { Link, Redirect } from 'expo-router';
import { useAuth } from '../../src/auth/AuthProvider';

export default function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  if (user) return <Redirect href="/" />;
  const submit = async () => {
    if (loading) return;
    setLoading(true); setError(undefined);
    try { await login(email, password); }
    catch { setError('No se pudo iniciar sesión. Comprueba tus datos e inténtalo nuevamente.'); }
    finally { setLoading(false); }
  };
  return <View><Text>Login</Text><TextInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" editable={!loading} /><TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry editable={!loading} /><Button title={loading ? 'Logging in...' : 'Login'} onPress={() => void submit()} disabled={loading || !email.trim() || !password} />{error && <Text>{error}</Text>}<Link href="/auth/register">Create account</Link></View>;
}
