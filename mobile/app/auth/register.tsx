import { useState } from 'react';
import { Link, Redirect } from 'expo-router';
import { useAuth } from '../../src/auth/AuthProvider';
import { AppButton, AppFeedback, AppInput, AppLogo, AppText, AuthLayout } from '../../src/ui/components';
import { firstValidationMessage, registerSchema, validationFieldErrors } from '../../src/services/auth.schemas';

export default function Register() {
  const { user, register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  if (user) return <Redirect href="/" />;
  const submit = async () => {
    if (loading) return;
    const result = registerSchema.safeParse({ name, email, password });
    if (!result.success) { setFieldErrors(validationFieldErrors(result.error)); setError(firstValidationMessage(result.error)); return; }
    setLoading(true); setError(undefined); setFieldErrors({});
    try { await register(result.data.name, result.data.email, result.data.password); }
    catch { setError('No se pudo crear la cuenta. Comprueba los datos e inténtalo nuevamente.'); }
    finally { setLoading(false); }
  };
  return <AuthLayout><AppLogo /><AppText variant="heading" className="mt-xl">Crear cuenta</AppText><AppText variant="bodySecondary" muted className="mt-sm">Empieza a ordenar tu día.</AppText><AppInput label="Nombre" value={name} onChangeText={(value) => { setName(value); setFieldErrors((current) => ({ ...current, name: '' })); }} placeholder="Tu nombre" returnKeyType="next" editable={!loading} error={fieldErrors.name} /><AppInput label="Correo electrónico" value={email} onChangeText={(value) => { setEmail(value); setFieldErrors((current) => ({ ...current, email: '' })); }} placeholder="tu@email.com" autoCapitalize="none" keyboardType="email-address" returnKeyType="next" editable={!loading} error={fieldErrors.email} /><AppInput label="Contraseña" value={password} onChangeText={(value) => { setPassword(value); setFieldErrors((current) => ({ ...current, password: '' })); }} placeholder="Mínimo 8 caracteres" secureTextEntry returnKeyType="go" onSubmitEditing={() => void submit()} editable={!loading} error={fieldErrors.password} /><AppFeedback message={error} tone="error" /><AppButton title="Crear cuenta" loading={loading} onPress={() => void submit()} disabled={!name.trim() || !email.trim() || !password} /><Link href="/auth/login"><AppText variant="bodySecondary" className="text-center mt-md text-primaryHighlight">Volver a iniciar sesión</AppText></Link></AuthLayout>;
}
