import { useState } from 'react';
import { Link, Redirect } from 'expo-router';
import { useAuth } from '../../src/auth/AuthProvider';
import { AppButton, AppFeedback, AppInput, AppLogo, AppText, AuthLayout } from '../../src/ui/components';
import { firstValidationMessage, loginSchema, validationFieldErrors } from '../../src/services/auth.schemas';

export default function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  if (user) return <Redirect href="/" />;
  const submit = async () => {
    if (loading) return;
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) { setFieldErrors(validationFieldErrors(result.error)); setError(firstValidationMessage(result.error)); return; }
    setLoading(true); setError(undefined); setFieldErrors({});
    try { await login(result.data.email, result.data.password); }
    catch { setError('No se pudo iniciar sesión. Comprueba tus datos e inténtalo nuevamente.'); }
    finally { setLoading(false); }
  };
  return <AuthLayout><AppLogo /><AppText variant="heading" className="mt-xl">Bienvenido de nuevo</AppText><AppText variant="bodySecondary" muted className="mt-sm">Organiza tus tareas con claridad.</AppText><AppInput label="Correo electrónico" value={email} onChangeText={(value) => { setEmail(value); setFieldErrors((current) => ({ ...current, email: '' })); }} placeholder="tu@email.com" autoCapitalize="none" keyboardType="email-address" returnKeyType="next" editable={!loading} error={fieldErrors.email} /><AppInput label="Contraseña" value={password} onChangeText={(value) => { setPassword(value); setFieldErrors((current) => ({ ...current, password: '' })); }} placeholder="Tu contraseña" secureTextEntry returnKeyType="go" onSubmitEditing={() => void submit()} editable={!loading} error={fieldErrors.password} /><AppFeedback message={error} tone="error" /><AppButton title="Iniciar sesión" loading={loading} onPress={() => void submit()} disabled={!email.trim() || !password} /><Link href="/auth/register"><AppText variant="bodySecondary" className="text-center mt-md text-primaryHighlight">Crear cuenta</AppText></Link></AuthLayout>;
}
