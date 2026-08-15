import { useState } from 'react';
import { Link, Redirect } from 'expo-router';
import { useAuth } from '../../src/auth/AuthProvider';
import { AppButton, AppInput, AppLogo, AppText, AuthScreen, Card } from '../../src/ui/components';

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
  return <AuthScreen><Card><AppLogo /><AppText variant="heading" className="mt-xl">Crear cuenta</AppText><AppText variant="bodySecondary" muted className="mt-sm">Empieza a ordenar tu día.</AppText><AppInput label="Nombre" value={name} onChangeText={setName} placeholder="Tu nombre" returnKeyType="next" editable={!loading} /><AppInput label="Correo electrónico" value={email} onChangeText={setEmail} placeholder="tu@email.com" autoCapitalize="none" keyboardType="email-address" returnKeyType="next" editable={!loading} /><AppInput label="Contraseña" value={password} onChangeText={setPassword} placeholder="Mínimo 8 caracteres" secureTextEntry returnKeyType="go" onSubmitEditing={() => void submit()} editable={!loading} error={error} /><AppButton title="Crear cuenta" loading={loading} onPress={() => void submit()} disabled={!name.trim() || !email.trim() || !password} /><Link href="/auth/login"><AppText variant="bodySecondary" className="text-center mt-md">Volver a iniciar sesión</AppText></Link></Card></AuthScreen>;
}
