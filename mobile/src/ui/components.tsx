import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, type ImageProps, type PressableProps, type TextInputProps, type TextProps, type ViewProps } from 'react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
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
    <View className="h-12 w-12 rounded-large bg-primarySoft border border-primaryHighlight items-center justify-center"><AppText variant="title" className="text-primaryHighlight">TD</AppText></View>
    {!compact && <View><AppText variant="title">Task desk</AppText><AppText variant="caption" muted>Organiza lo importante</AppText></View>}
  </View>;
}

export function AppImage({ uri, token, className = 'w-full h-52 rounded-medium', ...props }: Omit<ImageProps, 'source'> & { uri: string; token?: string; className?: string }) {
  return <Image {...props} source={{ uri, ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}) }} className={className} resizeMode={props.resizeMode ?? 'cover'} />;
}
type AuthenticatedImageProps = {
  identity: string;
  localUri?: string;
  remoteUri?: string;
  token?: string;
  className?: string;
  accessibilityLabel?: string;
};

export function AuthenticatedImage({ identity, localUri, remoteUri, token, className, accessibilityLabel }: AuthenticatedImageProps) {
  const firstSource = localUri ? 'local' : remoteUri && token ? 'remote' : undefined;
  const [source, setSource] = useState<'local' | 'remote' | undefined>(firstSource);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(firstSource ? 'loading' : 'error');
  const [retryVersion, setRetryVersion] = useState(0);
  const retrying = useRef(false);
  const failed = useRef(new Set<'local' | 'remote'>());

  useEffect(() => {
    failed.current.clear();
    retrying.current = false;
    const next = localUri ? 'local' : remoteUri && token ? 'remote' : undefined;
    setSource(next);
    setStatus(next ? 'loading' : 'error');
    setRetryVersion(0);
  }, [identity, localUri, remoteUri, token]);

  const handleError = () => {
    if (!source) return;
    failed.current.add(source);
    const fallback = source === 'local' && remoteUri && token && !failed.current.has('remote')
      ? 'remote'
      : source === 'remote' && localUri && !failed.current.has('local') ? 'local' : undefined;
    retrying.current = false;
    setSource(fallback);
    setStatus(fallback ? 'loading' : 'error');
  };
  const retry = () => {
    if (retrying.current) return;
    const next = localUri ? 'local' : remoteUri && token ? 'remote' : undefined;
    if (!next) return;
    retrying.current = true;
    failed.current.clear();
    setSource(next);
    setStatus('loading');
    setRetryVersion((current) => current + 1);
  };
  const uri = source === 'local' ? localUri : remoteUri;

  return <View>
    {uri && status !== 'error' && <AppImage
      key={`${identity}-${source}-${retryVersion}`}
      testID={`image-${identity}`}
      uri={uri}
      token={source === 'remote' ? token : undefined}
      accessibilityLabel={accessibilityLabel}
      className={className}
      onLoadStart={() => setStatus('loading')}
      onLoad={() => { retrying.current = false; setStatus('ready'); }}
      onError={handleError}
    />}
    {status === 'loading' && <View className="absolute inset-0 items-center justify-center"><ActivityIndicator color={colors.primary} /></View>}
    {status === 'error' && <StateMessage title="No se pudo cargar la imagen." tone="error" actionTitle={localUri || (remoteUri && token) ? 'Reintentar' : undefined} onAction={localUri || (remoteUri && token) ? retry : undefined} />}
  </View>;
}

type BadgeTone = 'neutral' | 'success' | 'warning' | 'error' | 'accent';
export function AppBadge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const toneClasses = { neutral: 'bg-surfaceMuted border-border text-textMuted', success: 'bg-successSoft border-success text-success', warning: 'bg-warningSoft border-warning text-warning', error: 'bg-errorSoft border-error text-error', accent: 'bg-primarySoft border-primaryHighlight text-primaryHighlight' } as const;
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
  const toneClasses = { success: 'bg-successSoft border-success text-success', error: 'bg-errorSoft border-error text-error', info: 'bg-infoSoft border-info text-info', warning: 'bg-warningSoft border-warning text-warning' } as const;
  const [background, border, text] = toneClasses[tone].split(' ');
  return <View accessibilityRole={tone === 'error' ? 'alert' : 'none'} accessibilityLiveRegion="polite" className={`rounded-medium border px-lg py-md mb-md ${background} ${border}`}>
    <AppText variant="bodySecondary" className={`${text} flex-shrink`}>{message}</AppText>
  </View>;
}

type AppButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'destructive' | 'ghost';
  size?: 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
};

const buttonVariants = {
  primary: 'bg-primary',
  secondary: 'bg-surfaceMuted border border-border',
  danger: 'bg-error',
  destructive: 'bg-error',
  ghost: 'bg-transparent border border-border'
} as const;

const buttonTextVariants = {
  primary: 'text-textOnPrimary',
  secondary: 'text-primaryHighlight',
  danger: 'text-textOnPrimary',
  destructive: 'text-textOnPrimary',
  ghost: 'text-text'
} as const;

export function AppButton({ title, loading = false, variant = 'primary', size = 'md', fullWidth = false, disabled, className = '', ...props }: AppButtonProps) {
  const isDisabled = disabled || loading;
  const padding = size === 'lg' ? 'px-lg py-md' : 'px-lg py-sm';
  return <Pressable
    {...props}
    accessibilityRole="button"
    accessibilityState={{ disabled: isDisabled, busy: loading }}
    disabled={isDisabled}
    hitSlop={4}
    className={`min-h-[44px] border border-transparent focus:border-focus rounded-small ${padding} items-center justify-center my-xs active:opacity-80 ${fullWidth ? 'w-full' : ''} ${buttonVariants[variant]} ${isDisabled ? 'bg-disabledSurface border-disabledSurface opacity-100' : ''} ${className}`}
  >
    {loading ? <ActivityIndicator color={isDisabled ? colors.disabledText : variant === 'primary' || variant === 'danger' || variant === 'destructive' ? colors.textOnPrimary : colors.primaryHighlight} /> : <AppText variant="button" className={isDisabled ? 'text-disabledText' : buttonTextVariants[variant]}>{title}</AppText>}
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
    <TextInput {...props} accessibilityLabel={props.accessibilityLabel ?? label} placeholderTextColor={colors.textMuted} className={`text-body text-text bg-surface border border-borderStrong rounded-small px-md py-md min-h-[48px] focus:border-focus ${props.multiline ? 'min-h-[96px] pt-md' : ''} ${props.editable === false ? 'bg-disabledSurface text-disabledText' : ''} ${error ? 'border-error focus:border-error' : ''} ${className}`} />
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
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} accessibilityViewIsModal>
    <View className="flex-1 items-center justify-center bg-overlay px-xl">
      <View className="w-full rounded-large border border-border bg-surface p-xl shadow-medium">
        <AppText variant="heading" accessibilityRole="header">{title}</AppText>
        <AppText variant="bodySecondary" muted className="mt-sm">{description}</AppText>
        <View className="flex-row gap-sm justify-end mt-xl"><AppButton title="Cancelar" variant="ghost" onPress={onCancel} disabled={loading} className="flex-1" /><AppButton title={confirmLabel} variant="destructive" loading={loading} onPress={onConfirm} className="flex-1" /></View>
      </View>
    </View>
  </Modal>;
}
export function AuthScreen({ children }: { children: ReactNode }) {
  return <Screen><KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView className="flex-1" keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} contentContainerClassName="grow"><View className="grow justify-center py-xxl">{children}</View></ScrollView></KeyboardAvoidingView></Screen>;
}
export function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthScreen><View className="w-full max-w-xl self-center rounded-large border border-border bg-surface p-lg shadow-small">{children}</View></AuthScreen>;
}
export function Card({ children, className = '', accessibilityRole, accessibilityLiveRegion }: Pick<ViewProps, 'accessibilityRole' | 'accessibilityLiveRegion'> & { children: ReactNode; className?: string }) {
  return <View accessibilityRole={accessibilityRole} accessibilityLiveRegion={accessibilityLiveRegion} className={`bg-surfaceElevated border border-border rounded-large p-lg mb-md shadow-small ${className}`}>{children}</View>;
}
export function TaskSummary({ total, pending, completed }: { total: number; pending: number; completed: number }) {
  return <View accessibilityRole="summary" className="flex-row rounded-large border border-border bg-surfaceMuted p-md mb-md">
    <View className="flex-1 items-center border-r border-border"><AppText variant="heading">{pending}</AppText><AppText variant="caption" muted>Pendientes</AppText></View>
    <View className="flex-1 items-center border-r border-border"><AppText variant="heading">{completed}</AppText><AppText variant="caption" muted>Completadas</AppText></View>
    <View className="flex-1 items-center"><AppText variant="heading">{total}</AppText><AppText variant="caption" muted>Total</AppText></View>
  </View>;
}

type SegmentOption<T extends string> = { value: T; label: string; accessibilityLabel?: string };
export function SegmentedControl<T extends string>({ value, options, onChange, disabled = false }: { value: T; options: readonly SegmentOption<T>[]; onChange: (value: T) => void; disabled?: boolean }) {
  return <View accessibilityRole="tablist" className="flex-row gap-xs mb-md">
    {options.map((option) => <Pressable key={option.value} accessibilityRole="tab" accessibilityLabel={option.accessibilityLabel ?? option.label} accessibilityState={{ selected: value === option.value, disabled }} disabled={disabled} onPress={() => onChange(option.value)} className={`min-h-[44px] flex-1 items-center justify-center rounded-small border px-sm py-sm ${value === option.value ? 'bg-primary border-primary' : 'bg-surfaceMuted border-border'}`}>
      <AppText variant="label" className={value === option.value ? 'text-textOnPrimary' : 'text-text'}>{option.label}</AppText>
    </Pressable>)}
  </View>;
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
    <View className="flex-row items-start justify-between gap-sm"><AppText variant="title" className="flex-1">{title}</AppText><AppText variant="caption" className={completed ? 'text-success' : 'text-warning'}>{completed ? 'Completada' : 'Pendiente'}</AppText></View>
    {description && <AppText variant="bodySecondary" muted className="mt-xs">{description}</AppText>}
    {(dateLabel || locationLabel) && <AppText variant="caption" muted className="mt-xs">{[dateLabel, locationLabel].filter(Boolean).join(' · ')}</AppText>}
    {imageUrl && <AppImage uri={imageUrl} token={imageToken} accessibilityLabel={`Fotografía de ${title}`} className="w-full h-40 rounded-medium mt-sm" />}
    <AppButton title="Ver detalles" variant="secondary" onPress={onOpen} accessibilityLabel={`Ver detalles de ${title}`} className="mt-md" />
    <View className="flex-row gap-xs mt-md"><AppButton title={completed ? 'Reabrir' : 'Completar'} loading={toggleLoading} onPress={onToggle} disabled={disabled} className="flex-1" /><AppButton title="Editar" variant="ghost" onPress={onEdit} disabled={disabled} className="flex-1" /><AppButton title="Eliminar" variant="destructive" loading={deleteLoading} onPress={onDelete} disabled={disabled} className="flex-1" /></View>
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
  return <Card accessibilityRole={tone === 'error' ? 'alert' : undefined} accessibilityLiveRegion="polite" className={toneClass}>
    <AppText variant="bodySecondary" className={textClass}>{title}</AppText>
    {actionTitle && onAction && <AppButton title={actionTitle} variant="secondary" onPress={onAction} className="self-start mt-sm" />}
  </Card>;
}
type DetailSectionProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: 'surface' | 'flat';
  children: ReactNode;
};

export function DetailSection({ title, description, action, variant = 'surface', children }: DetailSectionProps) {
  return <View className={`${variant === 'surface' ? 'rounded-large border border-border bg-surfaceElevated p-lg shadow-small' : ''} mb-md`}>
    <View className="flex-row items-start justify-between gap-md">
      <View className="flex-1">
        <AppText variant="title" accessibilityRole="header">{title}</AppText>
        {description && <AppText variant="caption" muted className="mt-xs">{description}</AppText>}
      </View>
      {action}
    </View>
    <View className="mt-md">{children}</View>
  </View>;
}

export function MetadataRow({ label, value }: { label: string; value: string }) {
  return <View className="flex-row items-start justify-between gap-md border-b border-border py-sm last:border-b-0">
    <AppText variant="caption" muted>{label}</AppText>
    <AppText variant="bodySecondary" className="flex-1 text-right">{value}</AppText>
  </View>;
}

type AttachmentSectionProps = {
  title: string;
  description: string;
  addTitle: string;
  addLoading?: boolean;
  onAdd: () => void;
  disabled?: boolean;
  emptyTitle: string;
  children: ReactNode;
};

export function AttachmentSection({ title, description, addTitle, addLoading = false, onAdd, disabled = false, emptyTitle, children }: AttachmentSectionProps) {
  return <DetailSection title={title} description={description} action={<AppButton title={addLoading ? 'Guardando...' : addTitle} variant="secondary" onPress={onAdd} loading={addLoading} disabled={disabled} />}>
    {children || <InlineEmptyState title={emptyTitle} />}
  </DetailSection>;
}

export function InlineEmptyState({ title }: { title: string }) {
  return <View className="rounded-medium border border-dashed border-border bg-surfaceMuted px-md py-lg">
    <AppText variant="bodySecondary" muted>{title}</AppText>
  </View>;
}

export function LocationPanel({ location, emptyTitle, children }: { location?: { latitude: number; longitude: number; accuracy: number }; emptyTitle: string; children?: ReactNode }) {
  return <DetailSection title="Ubicación" description="Referencia guardada con esta tarea." action={children}>
    {location ? <View className="gap-xs"><MetadataRow label="Coordenadas" value={`${location.latitude}, ${location.longitude}`} /><MetadataRow label="Precisión" value={`${location.accuracy} m`} /></View> : <InlineEmptyState title={emptyTitle} />}
  </DetailSection>;
}

export function DangerZone({ children }: { children: ReactNode }) {
  return <View className="rounded-large border border-error bg-errorSoft p-lg mb-md">
    <AppText variant="title" className="text-error">Zona destructiva</AppText>
    <AppText variant="bodySecondary" muted className="mt-xs">Estas acciones no se pueden deshacer.</AppText>
    <View className="mt-md">{children}</View>
  </View>;
}
type ExampleBoxProps<T> = {
  title: string;
  items: readonly T[];
  keyForItem: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  emptyContent?: ReactNode;
  accessibilityLabel?: string;
  maxHeight?: number;
};

export function ExampleBox<T>({ title, items, keyForItem, renderItem, emptyContent, accessibilityLabel, maxHeight = 360 }: ExampleBoxProps<T>) {
  return <View accessibilityLabel={accessibilityLabel} className="rounded-large border border-primary bg-surfaceElevated p-md">
    <AppText variant="label" accessibilityRole="header" className="mb-sm">{title}</AppText>
    <ScrollView accessibilityLabel={`${accessibilityLabel ?? title} desplazable`} nestedScrollEnabled style={{ maxHeight }} contentContainerClassName="gap-sm pb-md" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
      {items.length ? items.map((item) => <View key={keyForItem(item)}>{renderItem(item)}</View>) : emptyContent}
    </ScrollView>
  </View>;
}

type SelectableRowProps = {
  title: string;
  description?: string | null;
  statusLabel: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
};

export function SelectableRow({ title, description, statusLabel, selected, disabled = false, onPress }: SelectableRowProps) {
  return <Pressable
    accessibilityRole="checkbox"
    accessibilityLabel={`${title}. ${statusLabel}`}
    accessibilityState={{ checked: selected, disabled }}
    disabled={disabled}
    onPress={onPress}
    className={`rounded-medium border p-md ${selected ? 'border-primary bg-primarySoft' : 'border-border bg-surfaceMuted'} ${disabled ? 'opacity-60' : 'active:opacity-80'}`}
  >
    <View className="flex-row items-start gap-md">
      <View className={`mt-xs h-5 w-5 rounded-small border-2 ${selected ? 'border-primary bg-primary' : 'border-borderStrong bg-surface'}`} accessibilityElementsHidden />
      <View className="flex-1">
        <AppText variant="label">{title}</AppText>
        {description && <AppText variant="bodySecondary" muted className="mt-xs">{description}</AppText>}
        <AppText variant="caption" className={`mt-sm ${disabled ? 'text-textMuted' : selected ? 'text-primaryHighlight' : 'text-textSecondary'}`}>{statusLabel}</AppText>
      </View>
    </View>
  </Pressable>;
}

export function ResultSummary({ received, valid, imported, selectable }: { received: number; valid: number; imported: number; selectable: number }) {
  return <View accessibilityRole="summary" className="flex-row flex-wrap rounded-large border border-border bg-surfaceMuted p-md mb-md">
    <View className="w-1/2 p-xs"><AppText variant="heading">{received}</AppText><AppText variant="caption" muted>Recibidas</AppText></View>
    <View className="w-1/2 p-xs"><AppText variant="heading">{valid}</AppText><AppText variant="caption" muted>Válidas</AppText></View>
    <View className="w-1/2 p-xs"><AppText variant="heading">{imported}</AppText><AppText variant="caption" muted>Ya importadas</AppText></View>
    <View className="w-1/2 p-xs"><AppText variant="heading">{selectable}</AppText><AppText variant="caption" muted>Disponibles</AppText></View>
  </View>;
}
