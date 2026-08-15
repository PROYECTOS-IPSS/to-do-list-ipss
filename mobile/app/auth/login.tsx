import { useState } from 'react';
import { Link, Redirect } from 'expo-router';
import { useAuth } from '../../src/auth/AuthProvider';
import { AppButton, AppInput, AppLogo, AppText, AuthScreen, Card } from '../../src/ui/components';

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
  return <AuthScreen><Card><AppLogo /><AppText variant="heading" className="mt-xl">Bienvenido de nuevo</AppText><AppText variant="bodySecondary" muted className="mt-sm">Organiza tus tareas con claridad.</AppText><AppInput label="Correo electrónico" value={email} onChangeText={setEmail} placeholder="tu@email.com" autoCapitalize="none" keyboardType="email-address" returnKeyType="next" editable={!loading} /><AppInput label="Contraseña" value={password} onChangeText={setPassword} placeholder="Tu contraseña" secureTextEntry returnKeyType="go" onSubmitEditing={() => void submit()} editable={!loading} error={error} /><AppButton title="Iniciar sesión" loading={loading} onPress={() => void submit()} disabled={!email.trim() || !password} /><Link href="/auth/register"><AppText variant="bodySecondary" className="text-center mt-md">Crear cuenta</AppText></Link></Card></AuthScreen>;
}
