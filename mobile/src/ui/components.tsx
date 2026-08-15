import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, type ImageProps, type PressableProps, type TextInputProps, type TextProps } from 'react-native';
import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from './tokens';
type TextVariant = 'display' | 'heading' | 'title' | 'body' | 'bodySecondary' | 'caption' | 'label' | 'button';

type AppTextProps = TextProps & {
  variant?: TextVariant;
  muted?: boolean;
  className?: string;
};

const textVariants: Record<TextVariant, string> = {
  display: 'text-display font-bold',
  heading: 'text-heading font-bold',
  title: 'text-title font-bold',
  body: 'text-body font-normal',
  bodySecondary: 'text-bodySecondary font-normal',
  caption: 'text-caption font-normal',
  label: 'text-label font-semibold',
  button: 'text-button font-bold'
};

export function AppText({ variant = 'body', muted = false, className = '', ...props }: AppTextProps) {
  return <Text {...props} className={`text-text ${textVariants[variant]} ${muted ? 'text-textSecondary' : ''} ${className}`} />;
}

export function AppLogo({ compact = false }: { compact?: boolean }) {
  return <View className="flex-row items-center gap-sm">
    <View className="h-12 w-12 rounded-large bg-primarySoft border border-primary items-center justify-center"><AppText variant="title" className="text-primary">TD</AppText></View>
    {!compact && <View><AppText variant="title">Task desk</AppText><AppText variant="caption" muted>Organiza lo importante</AppText></View>}
  </View>;
}

export function AppImage({ uri, token, className = 'w-full h-52 rounded-medium', ...props }: Omit<ImageProps, 'source'> & { uri: string; token?: string; className?: string }) {
  return <Image {...props} source={{ uri, ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}) }} className={className} resizeMode={props.resizeMode ?? 'cover'} />;
}

type BadgeTone = 'neutral' | 'success' | 'warning' | 'error' | 'accent';
export function AppBadge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const toneClasses = { neutral: 'bg-secondary border-border text-textSecondary', success: 'bg-success/15 border-success text-success', warning: 'bg-warning/15 border-warning text-warning', error: 'bg-error/15 border-error text-error', accent: 'bg-primarySoft border-primary text-primary' } as const;
  const [background, border, text] = toneClasses[tone].split(' ');
  return <View className={`self-start flex-row items-center rounded-pill border px-md py-xs ${background} ${border}`}><AppText variant="caption" className={text}>{label}</AppText></View>;
}

export function AppHeader({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return <View className="flex-row items-center justify-between mb-lg">
    <View className="flex-row items-center gap-md flex-1"><AppLogo compact />{onBack && <AppButton title="‹" variant="ghost" onPress={onBack} accessibilityLabel="Volver" className="min-h-10 min-w-10 px-sm py-sm" />}<AppText variant="title" className="flex-1">{title}</AppText></View>
    {right}
  </View>;
}

type FeedbackTone = 'success' | 'error' | 'info' | 'warning';
export function AppFeedback({ message, tone = 'info' }: { message?: string; tone?: FeedbackTone }) {
  if (!message) return null;
  const toneClasses = { success: 'bg-success/15 border-success text-success', error: 'bg-error/15 border-error text-error', info: 'bg-primarySoft border-primary text-primary', warning: 'bg-warning/15 border-warning text-warning' } as const;
  const [background, border, text] = toneClasses[tone].split(' ');
  return <View accessibilityRole="alert" className={`flex-row items-center rounded-medium border px-lg py-md mb-md ${background} ${border}`}><AppText variant="bodySecondary" className={text}>{message}</AppText></View>;
}

type AppButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
};

const buttonVariants = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  danger: 'bg-error',
  ghost: 'bg-transparent border border-border'
} as const;

const buttonTextVariants = {
  primary: 'text-surface',
  secondary: 'text-primary',
  danger: 'text-surface',
  ghost: 'text-text'
} as const;

export function AppButton({ title, loading = false, variant = 'primary', disabled, className = '', ...props }: AppButtonProps) {
  const isDisabled = disabled || loading;
  return <Pressable
    {...props}
    accessibilityRole="button"
    accessibilityState={{ disabled: isDisabled, busy: loading }}
    disabled={isDisabled}
    hitSlop={4}
    className={`min-h-[44px] rounded-medium px-lg py-md items-center justify-center my-xs active:opacity-80 ${buttonVariants[variant]} ${isDisabled ? 'opacity-50' : ''} ${className}`}
  >
    {loading ? <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? colors.surface : colors.primary} /> : <AppText variant="button" className={buttonTextVariants[variant]}>{title}</AppText>}
  </Pressable>;
}

type AppInputProps = TextInputProps & {
  label: string;
  error?: string;
  className?: string;
};

export function AppInput({ label, error, className = '', ...props }: AppInputProps) {
  return <View className="gap-xs mb-md">
    <AppText variant="label">{label}</AppText>
    <TextInput {...props} accessibilityLabel={props.accessibilityLabel ?? label} placeholderTextColor={colors.textSecondary} className={`text-body text-text bg-surface border border-border rounded-medium px-md py-md min-h-[48px] focus:border-primary ${props.editable === false ? 'opacity-60 bg-background' : ''} ${error ? 'border-error focus:border-error' : ''} ${className}`} />
    {error && <AppText variant="caption" className="text-error">{error}</AppText>}
  </View>;
}

export function Screen({ children }: { children: ReactNode }) {
  return <SafeAreaView edges={['top', 'right', 'bottom', 'left']} className="flex-1 bg-background p-lg">{children}</SafeAreaView>;
}


type AppConfirmModalProps = {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function AppConfirmModal({ visible, title, description, confirmLabel = 'Confirmar', loading = false, onCancel, onConfirm }: AppConfirmModalProps) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View className="flex-1 items-center justify-center bg-overlay px-xl">
      <View className="w-full rounded-xl border border-border bg-surfaceElevated p-xl shadow-medium">
        <AppText variant="heading">{title}</AppText>
        <AppText variant="bodySecondary" muted className="mt-sm">{description}</AppText>
        <View className="flex-row gap-sm justify-end mt-xl"><AppButton title="Cancelar" variant="ghost" onPress={onCancel} disabled={loading} className="flex-1" /><AppButton title={confirmLabel} variant="danger" loading={loading} onPress={onConfirm} className="flex-1" /></View>
      </View>
    </View>
  </Modal>;
}
export function AuthScreen({ children }: { children: ReactNode }) {
  return <Screen><KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView className="flex-1" keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} contentContainerClassName="grow"><View className="grow justify-center py-xxl">{children}</View></ScrollView></KeyboardAvoidingView></Screen>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={`bg-surfaceElevated border border-border rounded-large p-lg mb-md shadow-small ${className}`}>{children}</View>;
}

type TaskCardProps = {
  title: string;
  description?: string | null;
  dateLabel?: string;
  imageUrl?: string;
  imageToken?: string;
  completed: boolean;
  locationLabel?: string;
  onOpen: () => void;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  toggleLoading?: boolean;
  deleteLoading?: boolean;
  disabled?: boolean;
};

export function TaskCard({ title, description, dateLabel, imageUrl, imageToken, completed, locationLabel, onOpen, onToggle, onEdit, onDelete, toggleLoading = false, deleteLoading = false, disabled = false }: TaskCardProps) {
  return <Card className="p-md">
    <View className="flex-row items-start justify-between gap-sm"><Pressable accessibilityRole="button" accessibilityLabel={`Abrir tarea ${title}`} onPress={onOpen} className="flex-1"><AppText variant="title">{completed ? '✓ ' : ''}{title}</AppText></Pressable><AppText variant="caption" className={completed ? 'text-success' : 'text-warning'}>{completed ? 'Completada' : 'Pendiente'}</AppText></View>
    {imageUrl && <AppImage uri={imageUrl} token={imageToken} className="w-full h-40 rounded-medium mt-sm" />}
    {description && <AppText variant="bodySecondary" muted className="mt-xs">{description}</AppText>}
    {(dateLabel || locationLabel) && <AppText variant="caption" muted className="mt-xs">{[dateLabel, locationLabel].filter(Boolean).join(' · ')}</AppText>}
    <AppButton title="Ver detalles" variant="secondary" onPress={onOpen} accessibilityLabel={`Ver detalles de ${title}`} className="mt-md" />
    <View className="flex-row gap-xs mt-md"><AppButton title={completed ? 'Reabrir' : 'Completar'} loading={toggleLoading} onPress={onToggle} disabled={disabled} className="flex-1" /><AppButton title="Editar" variant="ghost" onPress={onEdit} disabled={disabled} className="flex-1" /><AppButton title="Eliminar" variant="danger" loading={deleteLoading} onPress={onDelete} disabled={disabled} className="flex-1" /></View>
  </Card>;
}

type StateMessageProps = {
  title: string;
  actionTitle?: string;
  onAction?: () => void;
  tone?: 'neutral' | 'error' | 'success';
};

export function StateMessage({ title, actionTitle, onAction, tone = 'neutral' }: StateMessageProps) {
  const toneClass = tone === 'error' ? 'border-error' : tone === 'success' ? 'border-success' : '';
  const textClass = tone === 'error' ? 'text-error' : tone === 'success' ? 'text-success' : '';
  return <Card className={toneClass}>
    <AppText variant="bodySecondary" className={textClass}>{title}</AppText>
    {actionTitle && onAction && <AppButton title={actionTitle} variant="secondary" onPress={onAction} className="self-start mt-sm" />}
  </Card>;
}
