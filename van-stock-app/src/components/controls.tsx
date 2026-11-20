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
import { formatQty } from '@/lib/stock';
import type { StockStatus } from '@/lib/types';
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

/** − quantity + control. */
export function Stepper({
  value,
  unit,
  onChange,
  name,
  large,
}: {
  value: number;
  unit: string;
  onChange: (delta: number) => void;
  name: string;
  large?: boolean;
}) {
  const c = useTheme();
  const size = large ? 48 : 38;
  const press = (delta: number) => {
    tap();
    onChange(delta);
  };
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Use one ${name}`}
        disabled={value <= 0}
        hitSlop={4}
        onPress={() => press(-1)}
        style={({ pressed }) => [
          styles.stepButton,
          {
            width: size,
            height: size,
            backgroundColor: c.field,
            opacity: value <= 0 ? 0.35 : pressed ? 0.6 : 1,
          },
        ]}>
        <Icon ios="minus" md="remove" size={large ? 22 : 18} color={c.text} />
      </Pressable>
      <View
        accessible
        accessibilityLabel={`${formatQty(value, unit || 'pcs')} in stock`}
        style={[styles.stepValueWrap, { minWidth: large ? 72 : 46 }]}>
        <Text
          style={[styles.stepValue, { color: c.text, fontSize: large ? 28 : 18 }]}
          numberOfLines={1}
          adjustsFontSizeToFit>
          {formatQty(value, '')}
        </Text>
        {!!unit && unit !== 'pcs' && (
          <Text style={[styles.stepUnit, { color: c.textSecondary }]} numberOfLines={1}>
            {unit}
          </Text>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Add one ${name}`}
        hitSlop={4}
        onPress={() => press(1)}
        style={({ pressed }) => [
          styles.stepButton,
          { width: size, height: size, backgroundColor: c.primarySoft, opacity: pressed ? 0.6 : 1 },
        ]}>
        <Icon ios="plus" md="add" size={large ? 22 : 18} color={c.primary} />
      </Pressable>
    </View>
  );
}

export function StatusBadge({ status }: { status: StockStatus }) {
  const c = useTheme();
  if (status === 'ok') return null;
  const isOut = status === 'out';
  return (
    <View style={[styles.badge, { backgroundColor: isOut ? c.outSoft : c.lowSoft }]}>
      <Text style={[styles.badgeText, { color: isOut ? c.out : c.low }]}>
        {isOut ? 'OUT' : 'LOW'}
      </Text>
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
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  stepButton: { borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  stepValueWrap: { alignItems: 'center', maxWidth: 90 },
  stepValue: { fontWeight: '700', textAlign: 'center', fontVariant: ['tabular-nums'] },
  stepUnit: { fontSize: 11, marginTop: -2 },
  badge: { borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
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
