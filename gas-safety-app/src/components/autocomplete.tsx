import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, useTheme } from '@/constants/theme';

import { Field, Input } from './form';
import { Icon } from './icon';

/** Best matches first: names starting with what's typed, then names containing it. */
export function rankMatches(options: string[], query: string, limit: number): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return options.slice(0, limit);
  const starts: string[] = [];
  const wordStarts: string[] = [];
  const contains: string[] = [];
  for (const opt of options) {
    const o = opt.toLowerCase();
    if (o === q) continue;
    if (o.startsWith(q)) starts.push(opt);
    else if (o.split(/[\s\-+]/).some((w) => w.startsWith(q))) wordStarts.push(opt);
    else if (o.includes(q)) contains.push(opt);
  }
  return [...starts, ...wordStarts, ...contains].slice(0, limit);
}

/** A text box with a list of suggestions underneath while you type. Anything can still be typed. */
export function Autocomplete({
  label,
  value,
  onChange,
  options,
  placeholder,
  hint,
  recent,
  maxShown = 6,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  hint?: string;
  /** Options you've used before, marked with a clock. */
  recent?: Set<string>;
  maxShown?: number;
}) {
  const c = useTheme();
  const [open, setOpen] = useState(false);
  const matches = open ? rankMatches(options, value, maxShown) : [];

  return (
    <Field label={label} hint={hint}>
      <Input
        value={value}
        onChangeText={(t) => {
          onChange(t);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // Wait a moment so a tap on a suggestion lands before the list closes.
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        placeholder={placeholder}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
      />
      {matches.length > 0 && (
        <View
          accessibilityRole="menu"
          style={[styles.list, { backgroundColor: c.card, borderColor: c.border }]}>
          {matches.map((m, i) => (
            <Pressable
              key={m}
              accessibilityRole="menuitem"
              onPress={() => {
                onChange(m);
                setOpen(false);
              }}
              style={({ pressed }) => [
                styles.item,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
                pressed && { backgroundColor: c.primarySoft },
              ]}>
              {recent?.has(m) ? (
                <Icon ios="clock.arrow.circlepath" md="history" size={16} color={c.textSecondary} />
              ) : (
                <Icon ios="magnifyingglass" md="search" size={16} color={c.textSecondary} />
              )}
              <Text style={[styles.itemText, { color: c.text }]} numberOfLines={1}>
                {m}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </Field>
  );
}

const styles = StyleSheet.create({
  list: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    marginTop: -Spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
  },
  itemText: { fontSize: 16, flex: 1 },
});
