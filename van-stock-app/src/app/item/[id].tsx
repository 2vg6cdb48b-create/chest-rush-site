import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { BarcodeScanner } from '@/components/barcode-scanner';
import { Button, Card, SectionLabel, StatusBadge } from '@/components/controls';
import { Icon } from '@/components/icon';
import { ProductImage } from '@/components/product-image';
import { MaxContentWidth, Radius, Spacing, useTheme } from '@/constants/theme';
import { locationsOf, statusOf } from '@/lib/stock';
import { describeMovement, timeAgo } from '@/lib/history';
import { lookupProduct, type LookupResult, type ProductInfo } from '@/lib/product-lookup';
import { useStock, type ItemFields } from '@/lib/store';
import { confirm, notify, success, tap } from '@/lib/ui';

const COMMON_UNITS = ['pcs', 'm', 'boxes', 'packs', 'rolls', 'tubes', 'bags', 'L', 'kg'];

function parseNum(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN;
}

function numText(n: number): string {
  return String(Math.round(n * 100) / 100);
}

export default function ItemScreen() {
  const c = useTheme();
  const params = useLocalSearchParams<{ id: string; barcode?: string }>();
  const stock = useStock();
  const isNew = params.id === 'new';
  const existing = isNew ? undefined : stock.getItem(params.id);

  const [name, setName] = useState(existing?.name ?? '');
  const [quantity, setQuantity] = useState(existing ? numText(existing.quantity) : '0');
  const [minLevel, setMinLevel] = useState(existing ? numText(existing.minLevel) : '');
  const [fullLevel, setFullLevel] = useState(
    existing && existing.fullLevel > 0 ? numText(existing.fullLevel) : '',
  );
  const [unit, setUnit] = useState(existing?.unit ?? 'pcs');
  const [location, setLocation] = useState(existing?.location ?? '');
  const [partNumber, setPartNumber] = useState(existing?.partNumber ?? '');
  const [barcode, setBarcode] = useState(existing?.barcode ?? params.barcode ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [imageUrl, setImageUrl] = useState(existing?.imageUrl ?? '');
  const [scanning, setScanning] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  // A new item opened from a scan starts by looking its barcode up online.
  const [lookup, setLookup] = useState<Lookup>(() =>
    isNew && params.barcode ? { status: 'loading', code: params.barcode } : { status: 'idle' },
  );
  const lookupId = useRef(0);

  const applyProduct = (p: ProductInfo) => {
    // Add the brand in front unless the name already contains it ("Coca-Cola" vs "Coca Cola").
    const squash = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '');
    const withBrand = p.brand && !squash(p.name).includes(squash(p.brand)) ? `${p.brand} ${p.name}` : p.name;
    setName(withBrand);
    if (p.imageUrl) setImageUrl(p.imageUrl);
    if (p.details.length) setNotes((prev) => prev || p.details.join(' · '));
  };

  /** Shows a lookup's result. Fills in the form if the name was empty when the lookup started. */
  const showResult = (code: string, result: LookupResult, nameWasEmpty: boolean) => {
    if (result.status === 'found') {
      if (nameWasEmpty) applyProduct(result.product);
      setLookup({ status: 'found', code, product: result.product, applied: nameWasEmpty });
    } else {
      setLookup({ status: result.status, code });
    }
  };

  const startLookup = (code: string) => {
    const id = ++lookupId.current;
    const nameWasEmpty = name.trim() === '';
    setLookup({ status: 'loading', code });
    lookupProduct(code).then((result) => {
      if (id === lookupId.current) showResult(code, result, nameWasEmpty);
    });
  };

  // A new item opened from a scan: look the barcode up once, as the screen opens.
  const initialCode = isNew ? params.barcode : undefined;
  useEffect(() => {
    if (!initialCode) return;
    const id = ++lookupId.current;
    lookupProduct(initialCode).then((result) => {
      if (id === lookupId.current) showResult(initialCode, result, true);
    });
    // showResult only sets state, so it doesn't need to be a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  const locations = useMemo(() => locationsOf(stock.items), [stock.items]);
  const history = useMemo(
    () => (existing ? stock.movements.filter((m) => m.itemId === existing.id).slice(0, 8) : []),
    [existing, stock.movements],
  );

  if (!isNew && !existing) {
    return (
      <View style={[styles.missing, { backgroundColor: c.background }]}>
        <Stack.Screen options={{ title: 'Item' }} />
        <Text style={{ color: c.textSecondary, fontSize: 17 }}>This item has been deleted.</Text>
        <Button label="Close" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const qtyNum = parseNum(quantity);
  const minNum = parseNum(minLevel);
  const fullNum = parseNum(fullLevel);
  const errors = {
    name: name.trim() === '' ? 'Give the item a name' : '',
    quantity: qtyNum === null || Number.isNaN(qtyNum) ? 'Enter how many you have' : '',
    minLevel: Number.isNaN(minNum) ? 'Enter a number' : '',
    fullLevel: Number.isNaN(fullNum)
      ? 'Enter a number'
      : fullNum !== null && fullNum > 0 && minNum !== null && fullNum <= minNum
        ? 'Should be more than the restock level'
        : '',
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const previewStatus = statusOf({ quantity: qtyNum || 0, minLevel: minNum || 0 });

  const save = () => {
    if (hasErrors) {
      setShowErrors(true);
      return;
    }
    const fields: ItemFields = {
      name: name.trim(),
      quantity: qtyNum ?? 0,
      minLevel: minNum ?? 0,
      fullLevel: fullNum ?? 0,
      unit: unit.trim() || 'pcs',
      location: location.trim(),
      partNumber: partNumber.trim(),
      barcode: barcode.trim(),
      imageUrl,
      notes: notes.trim(),
    };
    const clash = fields.barcode ? stock.findByBarcode(fields.barcode) : undefined;
    if (clash && clash.id !== existing?.id) {
      notify('Barcode already used', `"${clash.name}" already has the barcode ${fields.barcode}.`);
      return;
    }
    if (existing) stock.updateItem(existing.id, fields);
    else stock.addItem(fields);
    success();
    router.back();
  };

  const remove = async () => {
    if (!existing) return;
    const ok = await confirm(
      'Delete item?',
      `"${existing.name}" will be removed from your van stock.`,
      'Delete',
      true,
    );
    if (!ok) return;
    stock.deleteItem(existing.id);
    router.back();
  };

  const step = (setter: (v: string) => void, current: string, delta: number) => {
    tap();
    const n = parseNum(current);
    const base = n === null || Number.isNaN(n) ? 0 : n;
    setter(numText(Math.max(0, base + delta)));
  };

  const onScanned = (code: string) => {
    setScanning(false);
    setBarcode(code);
    startLookup(code);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: isNew ? 'New item' : 'Edit item',
          headerLeft: () => <HeaderButton label="Cancel" onPress={() => router.back()} />,
          headerRight: () => <HeaderButton label="Save" bold onPress={save} />,
        }}
      />
      <ScrollView
        style={{ backgroundColor: c.background }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="automatic">
        <ProductPanel
          lookup={lookup}
          imageUrl={imageUrl}
          onUse={(p) => {
            applyProduct(p);
            setLookup((l) => (l.status === 'found' ? { ...l, applied: true } : l));
          }}
          onRemoveImage={() => setImageUrl('')}
        />
        <Card style={styles.group}>
          <Field label="Name" error={showErrors ? errors.name : ''}>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="e.g. 15mm copper elbow"
              autoFocus={isNew && !params.barcode}
              autoCapitalize="sentences"
              returnKeyType="done"
            />
          </Field>

          <Field
            label="In the van now"
            error={showErrors ? errors.quantity : ''}
            right={<StatusBadge status={previewStatus} />}>
            <NumberRow
              value={quantity}
              onChangeText={setQuantity}
              onStep={(d) => step(setQuantity, quantity, d)}
              unit={unit}
              large
            />
          </Field>

          <Field label="Unit">
            <Input value={unit} onChangeText={setUnit} placeholder="pcs" autoCapitalize="none" />
            <Suggestions options={COMMON_UNITS} value={unit} onPick={setUnit} />
          </Field>
        </Card>

        <SectionLabel>Restocking</SectionLabel>
        <Card style={styles.group}>
          <Field
            label="Restock when down to"
            hint="It shows on the Restock list at or below this."
            error={showErrors ? errors.minLevel : ''}>
            <NumberRow
              value={minLevel}
              placeholder="0"
              onChangeText={setMinLevel}
              onStep={(d) => step(setMinLevel, minLevel, d)}
              unit={unit}
            />
          </Field>
          <Field
            label="Full amount (optional)"
            hint="How many you like to carry. Used to work out how many to order."
            error={showErrors ? errors.fullLevel : ''}>
            <NumberRow
              value={fullLevel}
              placeholder="Not set"
              onChangeText={setFullLevel}
              onStep={(d) => step(setFullLevel, fullLevel, d)}
              unit={unit}
            />
          </Field>
        </Card>

        <SectionLabel>Details</SectionLabel>
        <Card style={styles.group}>
          <Field label="Where in the van">
            <Input
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Shelf 2, Front drawer"
              autoCapitalize="words"
            />
            <Suggestions options={locations} value={location} onPick={setLocation} />
          </Field>
          <Field label="Part number">
            <Input
              value={partNumber}
              onChangeText={setPartNumber}
              placeholder="Supplier code"
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </Field>
          <Field label="Barcode">
            <View style={styles.inline}>
              <Input
                value={barcode}
                onChangeText={setBarcode}
                placeholder="Scan or type"
                autoCapitalize="none"
                autoCorrect={false}
                style={{ flex: 1, minWidth: 0 }}
              />
              <Button
                label="Scan"
                variant="secondary"
                icon={{ ios: 'barcode.viewfinder', md: 'barcode_scanner' }}
                onPress={() => setScanning(true)}
              />
            </View>
            {/^\d{6,14}$/.test(barcode.trim()) && lookup.status !== 'loading' && (
              <Button
                label="Look up product online"
                variant="plain"
                compact
                icon={{ ios: 'magnifyingglass', md: 'search' }}
                onPress={() => startLookup(barcode.trim())}
                style={{ alignSelf: 'flex-start' }}
              />
            )}
          </Field>
          <Field label="Notes">
            <Input
              value={notes}
              onChangeText={setNotes}
              placeholder="Supplier, size, anything useful"
              multiline
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
          </Field>
        </Card>

        <Button label={isNew ? 'Add to van' : 'Save changes'} onPress={save} style={styles.save} />

        {existing && history.length > 0 && (
          <>
            <SectionLabel>Recent changes</SectionLabel>
            <Card style={{ paddingVertical: Spacing.sm }}>
              {history.map((m, i) => (
                <View
                  key={m.id}
                  style={[
                    styles.historyRow,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
                  ]}>
                  <Text style={[styles.historyText, { color: c.text }]}>{describeMovement(m)}</Text>
                  <Text style={[styles.historyTime, { color: c.textSecondary }]}>
                    {timeAgo(m.at)}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {existing && (
          <>
            <Text style={[styles.footnote, { color: c.textSecondary }]}>
              Added {new Date(existing.createdAt).toLocaleDateString()} · last changed{' '}
              {timeAgo(existing.updatedAt)}
            </Text>
            <Button
              label="Delete item"
              variant="danger"
              icon={{ ios: 'trash', md: 'delete' }}
              onPress={remove}
              style={styles.delete}
            />
          </>
        )}
      </ScrollView>
      <BarcodeScanner visible={scanning} onScanned={onScanned} onClose={() => setScanning(false)} />
    </>
  );
}

type Lookup =
  | { status: 'idle' }
  | { status: 'loading'; code: string }
  | { status: 'found'; code: string; product: ProductInfo; applied: boolean }
  | { status: 'not-found'; code: string }
  | { status: 'offline'; code: string };

/** Shows the product picture and what the online lookup found. */
function ProductPanel({
  lookup,
  imageUrl,
  onUse,
  onRemoveImage,
}: {
  lookup: Lookup;
  imageUrl: string;
  onUse: (p: ProductInfo) => void;
  onRemoveImage: () => void;
}) {
  const c = useTheme();
  if (lookup.status === 'idle' && !imageUrl) return null;

  if (lookup.status === 'loading') {
    return (
      <Card style={[styles.panel, styles.panelRow]}>
        <ActivityIndicator color={c.primary} />
        <Text style={[styles.panelText, { color: c.text }]}>Looking up {lookup.code}…</Text>
      </Card>
    );
  }

  if (lookup.status === 'not-found' || lookup.status === 'offline') {
    return (
      <Card style={[styles.panel, styles.panelRow]}>
        <Icon
          ios={lookup.status === 'offline' ? 'wifi.slash' : 'questionmark.circle'}
          md={lookup.status === 'offline' ? 'wifi_off' : 'help'}
          size={26}
          color={c.textSecondary}
        />
        <Text style={[styles.panelText, { color: c.textSecondary }]}>
          {lookup.status === 'offline'
            ? Platform.OS === 'web'
              ? 'Couldn’t reach the product databases. Check your connection. (The preview page inside Claude can’t look products up, but the iPhone app and the Van Stock website can.)'
              : 'Couldn’t reach the product databases. Check your signal, or fill the details in yourself.'
            : `No match for ${lookup.code} in the free product databases. Type the name below and it’ll be found next time you scan it.`}
        </Text>
      </Card>
    );
  }

  const product = lookup.status === 'found' ? lookup.product : null;
  const picture =
    product && !(lookup.status === 'found' && lookup.applied) ? product.imageUrl : imageUrl;
  return (
    <Card style={styles.panel}>
      <View style={styles.panelRow}>
        <ProductImage uri={picture} size={84} />
        <View style={{ flex: 1, gap: 2 }}>
          {product ? (
            <>
              <Text style={[styles.productName, { color: c.text }]} numberOfLines={3}>
                {product.name}
              </Text>
              {!!product.brand && (
                <Text style={[styles.panelText, { color: c.textSecondary }]}>{product.brand}</Text>
              )}
              {product.details.length > 0 && (
                <Text style={[styles.productDetails, { color: c.textSecondary }]} numberOfLines={2}>
                  {product.details.join(' · ')}
                </Text>
              )}
            </>
          ) : (
            <Text style={[styles.panelText, { color: c.textSecondary }]}>Product picture</Text>
          )}
        </View>
      </View>
      {lookup.status === 'found' && lookup.applied && (
        <Text style={[styles.productDetails, { color: c.ok }]}>
          Filled in from {lookup.product.source}. Check the details are right.
        </Text>
      )}
      <View style={styles.panelButtons}>
        {lookup.status === 'found' && !lookup.applied && (
          <Button label="Use these details" compact onPress={() => onUse(lookup.product)} />
        )}
        {!!imageUrl && (lookup.status !== 'found' || lookup.applied) && (
          <Button label="Remove picture" compact variant="plain" onPress={onRemoveImage} />
        )}
      </View>
    </Card>
  );
}

function HeaderButton({
  label,
  onPress,
  bold,
}: {
  label: string;
  onPress: () => void;
  bold?: boolean;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={10}
      style={styles.headerButton}>
      <Text style={{ color: c.primary, fontSize: 17, fontWeight: bold ? '700' : '400' }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Field({
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

function Input(props: TextInputProps) {
  const c = useTheme();
  return (
    <TextInput
      placeholderTextColor={c.textSecondary}
      {...props}
      style={[styles.input, { backgroundColor: c.field, color: c.text }, props.style]}
    />
  );
}

function NumberRow({
  value,
  onChangeText,
  onStep,
  unit,
  placeholder,
  large,
}: {
  value: string;
  onChangeText: (t: string) => void;
  onStep: (delta: number) => void;
  unit: string;
  placeholder?: string;
  large?: boolean;
}) {
  const c = useTheme();
  const size = large ? 52 : 44;
  return (
    <View style={styles.inline}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrease"
        onPress={() => onStep(-1)}
        style={({ pressed }) => [
          styles.roundButton,
          { width: size, height: size, backgroundColor: c.field, opacity: pressed ? 0.6 : 1 },
        ]}>
        <Icon ios="minus" md="remove" size={20} color={c.text} />
      </Pressable>
      <View style={[styles.numberWrap, { backgroundColor: c.field, height: size }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.textSecondary}
          keyboardType="decimal-pad"
          selectTextOnFocus
          style={[styles.numberInput, { color: c.text, fontSize: large ? 24 : 18 }]}
        />
        {!!unit && unit !== 'pcs' && value !== '' && (
          <Text style={[styles.numberUnit, { color: c.textSecondary }]}>{unit}</Text>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase"
        onPress={() => onStep(1)}
        style={({ pressed }) => [
          styles.roundButton,
          { width: size, height: size, backgroundColor: c.primarySoft, opacity: pressed ? 0.6 : 1 },
        ]}>
        <Icon ios="plus" md="add" size={20} color={c.primary} />
      </Pressable>
    </View>
  );
}

function Suggestions({
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
            <Text
              style={{
                color: active ? c.primaryText : c.primary,
                fontSize: 14,
                fontWeight: '600',
              }}>
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.lg,
    paddingBottom: 60,
  },
  group: { gap: Spacing.lg },
  field: { gap: Spacing.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  label: { fontSize: 15, fontWeight: '600' },
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
  roundButton: { borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  numberWrap: {
    flex: 1,
    borderRadius: Radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  numberInput: {
    flexShrink: 1,
    minWidth: 40,
    textAlign: 'center',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    paddingVertical: 0,
  },
  numberUnit: { fontSize: 15, marginLeft: Spacing.xs },
  suggestions: { gap: Spacing.sm },
  suggestion: { borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: 6 },
  save: { marginTop: Spacing.xl },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  historyText: { fontSize: 15, flex: 1 },
  historyTime: { fontSize: 14 },
  footnote: { fontSize: 13, textAlign: 'center', marginTop: Spacing.xl },
  delete: { marginTop: Spacing.md },
  headerButton: { paddingHorizontal: Spacing.xs },
  panel: { marginBottom: Spacing.lg, gap: Spacing.md },
  panelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  panelText: { fontSize: 15, lineHeight: 21, flex: 1 },
  productName: { fontSize: 17, fontWeight: '700' },
  productDetails: { fontSize: 13, lineHeight: 18 },
  panelButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
});
