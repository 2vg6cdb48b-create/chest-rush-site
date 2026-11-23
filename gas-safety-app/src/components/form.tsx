import { useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { Radius, Spacing, useTheme } from '@/constants/theme';
import { formatUkDate, parseUkDate, todayIso } from '@/lib/records';
import type { Address } from '@/lib/types';

import { Choice } from './controls';

export function Field({
  label,
  hint,
  error,
  right,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  const c = useTheme();
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: c.text }]}>{label}</Text>
        {right}
      </View>
      {children}
      {!!error && <Text style={[styles.error, { color: c.out }]}>{error}</Text>}
      {!error && !!hint && <Text style={[styles.hint, { color: c.textSecondary }]}>{hint}</Text>}
    </View>
  );
}

export function Input(props: TextInputProps) {
  const c = useTheme();
  return (
    <TextInput
      placeholderTextColor={c.textSecondary}
      {...props}
      style={[styles.input, { backgroundColor: c.field, color: c.text }, props.style]}
    />
  );
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
} & Omit<TextInputProps, 'value' | 'onChangeText' | 'onChange'>) {
  return (
    <Field label={label} hint={hint}>
      <Input value={value} onChangeText={onChange} {...rest} />
    </Field>
  );
}

/** Number with a unit, e.g. 20.5 mbar. Kept as text so "20." can be typed. */
export function NumberField({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const c = useTheme();
  return (
    <Field label={label}>
      <View style={[styles.numberWrap, { backgroundColor: c.field }]}>
        <TextInput
          value={value}
          onChangeText={(t) => onChange(t.replace(',', '.').replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          placeholder="–"
          placeholderTextColor={c.textSecondary}
          style={[styles.numberInput, { color: c.text }]}
        />
        {!!unit && <Text style={[styles.unit, { color: c.textSecondary }]}>{unit}</Text>}
      </View>
    </Field>
  );
}

/** Date typed as DD/MM/YYYY, with a Today button. Stored as YYYY-MM-DD. */
export function DateField({
  label,
  value,
  onChange,
  hint,
  allowEmpty,
  todayButton,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  hint?: string;
  allowEmpty?: boolean;
  /** Show a "Today" shortcut, for the date of the check. */
  todayButton?: boolean;
}) {
  const c = useTheme();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? formatUkDate(value);
  const invalid = draft !== null && draft.trim() !== '' && !parseUkDate(draft);

  const commit = (text: string) => {
    if (!text.trim() && allowEmpty) {
      onChange('');
      setDraft(null);
      return;
    }
    const iso = parseUkDate(text);
    if (iso) {
      onChange(iso);
      setDraft(null);
    }
  };

  return (
    <Field label={label} hint={hint} error={invalid ? 'Use day/month/year, e.g. 07/03/2027' : ''}>
      <View style={styles.inline}>
        <Input
          value={shown}
          placeholder="DD/MM/YYYY"
          keyboardType="numbers-and-punctuation"
          onChangeText={(t) => {
            setDraft(t);
            if (parseUkDate(t)) onChange(parseUkDate(t)!);
            else if (!t.trim() && allowEmpty) onChange('');
          }}
          onBlur={() => draft !== null && commit(draft)}
          style={{ flex: 1, minWidth: 0 }}
        />
        {todayButton && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setDraft(null);
              onChange(todayIso());
            }}
            style={({ pressed }) => [styles.todayButton, { backgroundColor: c.primarySoft, opacity: pressed ? 0.6 : 1 }]}>
            <Text style={{ color: c.primary, fontWeight: '600', fontSize: 15 }}>Today</Text>
          </Pressable>
        )}
      </View>
    </Field>
  );
}

export function AddressFields({
  value,
  onChange,
}: {
  value: Address;
  onChange: (a: Address) => void;
}) {
  const set = (k: keyof Address) => (v: string) => onChange({ ...value, [k]: v });
  return (
    <>
      <TextField
        label="Address"
        value={value.line1}
        onChange={set('line1')}
        placeholder="House number and street"
        autoCapitalize="words"
        textContentType="streetAddressLine1"
      />
      <Input
        value={value.line2}
        onChangeText={set('line2')}
        placeholder="Flat, building or area (optional)"
        autoCapitalize="words"
        textContentType="streetAddressLine2"
      />
      <View style={styles.inline}>
        <Input
          value={value.town}
          onChangeText={set('town')}
          placeholder="Town"
          autoCapitalize="words"
          textContentType="addressCity"
          style={{ flex: 3, minWidth: 0 }}
        />
        <Input
          value={value.postcode}
          onChangeText={(t) => set('postcode')(t.toUpperCase())}
          placeholder="Postcode"
          autoCapitalize="characters"
          textContentType="postalCode"
          style={{ flex: 2, minWidth: 0 }}
        />
      </View>
    </>
  );
}

const PASS_FAIL = [
  { value: 'pass', label: 'Pass' },
  { value: 'fail', label: 'Fail' },
  { value: 'na', label: 'N/A' },
] as const;
const YES_NO_NA = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'na', label: 'N/A' },
] as const;
const YES_NO = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
] as const;

const goodBad = (v: string) => (v === 'pass' || v === 'yes' ? 'good' : v === 'fail' || v === 'no' ? 'bad' : 'neutral');

/** A labelled Pass / Fail / N/A question. */
export function CheckRow<T extends string>({
  label,
  kind,
  value,
  onChange,
  hint,
  neutral,
}: {
  label: string;
  kind: 'passFail' | 'yesNoNa' | 'yesNo';
  value: T | '';
  onChange: (v: T) => void;
  hint?: string;
  /** For questions where "No" isn't a failure. */
  neutral?: boolean;
}) {
  const options = (kind === 'passFail' ? PASS_FAIL : kind === 'yesNoNa' ? YES_NO_NA : YES_NO) as unknown as {
    value: T;
    label: string;
  }[];
  return (
    <Field label={label} hint={hint}>
      <Choice options={options} value={value} onChange={onChange} tone={neutral ? undefined : goodBad} />
    </Field>
  );
}

/** Tappable suggestions under a text field. */
export function Suggestions({
  options,
  value,
  onPick,
}: {
  options: string[];
  value: string;
  onPick: (v: string) => void;
}) {
  const c = useTheme();
  if (options.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.suggestions}>
      {options.map((opt) => {
        const active = opt.toLowerCase() === value.trim().toLowerCase();
        return (
          <Pressable
            key={opt}
            onPress={() => onPick(opt)}
            style={[styles.suggestion, { backgroundColor: active ? c.primary : c.primarySoft }]}>
            <Text style={{ color: active ? c.primaryText : c.primary, fontSize: 14, fontWeight: '600' }}>
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export const formStyles = StyleSheet.create({
  group: { gap: Spacing.lg },
});

const styles = StyleSheet.create({
  field: { gap: Spacing.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  label: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  hint: { fontSize: 13, lineHeight: 18 },
  error: { fontSize: 13, fontWeight: '600' },
  input: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 17,
    minHeight: 46,
  },
  inline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  numberWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    minHeight: 46,
  },
  numberInput: { flex: 1, minWidth: 0, fontSize: 18, fontWeight: '600', paddingVertical: Spacing.sm },
  unit: { fontSize: 15, marginLeft: Spacing.xs },
  todayButton: {
    minHeight: 46,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  suggestions: { gap: Spacing.sm },
  suggestion: { borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: 6 },
});
