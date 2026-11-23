import type { ComponentProps, ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Radius, Spacing, useTheme } from '@/constants/theme';
import { tap } from '@/lib/ui';

import { Icon } from './icon';

type IconProps = Pick<ComponentProps<typeof Icon>, 'ios' | 'md'>;

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, style]}>
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  style,
  compact,
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'plain';
  icon?: IconProps;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  disabled?: boolean;
}) {
  const c = useTheme();
  const bg = {
    primary: c.primary,
    secondary: c.primarySoft,
    danger: c.outSoft,
    plain: 'transparent',
  }[variant];
  const fg = {
    primary: c.primaryText,
    secondary: c.primary,
    danger: c.out,
    plain: c.primary,
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
        style,
      ]}>
      {icon && <Icon {...icon} size={compact ? 16 : 18} color={fg} />}
      <Text style={[styles.buttonText, compact && styles.buttonTextCompact, { color: fg }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function IconButton({
  label,
  onPress,
  icon,
  filled,
}: {
  label: string;
  onPress: () => void;
  icon: IconProps;
  filled?: boolean;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: filled ? c.primary : c.primarySoft, opacity: pressed ? 0.7 : 1 },
      ]}>
      <Icon {...icon} size={20} color={filled ? c.primaryText : c.primary} />
    </Pressable>
  );
}

/** A row of mutually exclusive options, e.g. Pass / Fail / N/A. */
export function Choice<T extends string>({
  options,
  value,
  onChange,
  tone,
}: {
  options: { value: T; label: string }[];
  value: T | '';
  onChange: (value: T) => void;
  /** Colours an option to show a good or bad answer. */
  tone?: (value: T) => 'good' | 'bad' | 'neutral';
}) {
  const c = useTheme();
  return (
    <View style={styles.choice} accessibilityRole="radiogroup">
      {options.map((opt) => {
        const active = opt.value === value;
        const t = tone?.(opt.value) ?? 'neutral';
        const activeBg = t === 'good' ? c.ok : t === 'bad' ? c.out : c.primary;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.label}
            onPress={() => {
              tap();
              onChange(opt.value);
            }}
            style={({ pressed }) => [
              styles.choiceOption,
              {
                backgroundColor: active ? activeBg : c.field,
                borderColor: active ? activeBg : c.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}>
            <Text
              style={[styles.choiceText, { color: active ? (t === 'neutral' ? c.primaryText : c.onStatus) : c.text }]}
              numberOfLines={1}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Badge({ label, tone }: { label: string; tone: 'good' | 'warn' | 'bad' | 'info' }) {
  const c = useTheme();
  const colors = {
    good: [c.okSoft, c.ok],
    warn: [c.lowSoft, c.low],
    bad: [c.outSoft, c.out],
    info: [c.primarySoft, c.primary],
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: colors[0] }]}>
      <Text style={[styles.badgeText, { color: colors[1] }]}>{label}</Text>
    </View>
  );
}

export function SearchField({
  value,
  onChangeText,
  placeholder,
  right,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  right?: ReactNode;
}) {
  const c = useTheme();
  return (
    <View style={[styles.search, { backgroundColor: c.card, borderColor: c.border }]}>
      <Icon ios="magnifyingglass" md="search" size={18} color={c.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textSecondary}
        style={[styles.searchInput, { color: c.text }]}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
        returnKeyType="search"
      />
      {right}
    </View>
  );
}

export function Chips({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  const c = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
      keyboardShouldPersistTaps="handled">
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.key)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? c.primary : c.card,
                borderColor: active ? c.primary : c.border,
              },
            ]}>
            <Text style={[styles.chipText, { color: active ? c.primaryText : c.text }]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  children,
}: {
  icon: IconProps;
  title: string;
  message: string;
  children?: ReactNode;
}) {
  const c = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: c.primarySoft }]}>
        <Icon {...icon} size={34} color={c.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: c.text }]}>{title}</Text>
      <Text style={[styles.emptyMessage, { color: c.textSecondary }]}>{message}</Text>
      {children}
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  const c = useTheme();
  return <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
  },
  button: {
    minHeight: 50,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  buttonCompact: {
    minHeight: 36,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
  },
  buttonText: { fontSize: 17, fontWeight: '600' },
  buttonTextCompact: { fontSize: 15 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choice: { flexDirection: 'row', gap: Spacing.xs },
  choiceOption: {
    flex: 1,
    minHeight: 40,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  choiceText: { fontSize: 15, fontWeight: '600' },
  badge: { borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    minHeight: 46,
  },
  searchInput: { flex: 1, fontSize: 17, paddingVertical: Spacing.sm },
  chips: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  chip: {
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
  },
  chipText: { fontSize: 15, fontWeight: '500' },
  empty: { alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  emptyMessage: { fontSize: 16, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.md },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
});
