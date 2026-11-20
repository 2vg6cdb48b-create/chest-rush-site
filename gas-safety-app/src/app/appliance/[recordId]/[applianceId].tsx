import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Autocomplete } from '@/components/autocomplete';
import { Button, Card, Choice, SectionLabel } from '@/components/controls';
import { CheckRow, Field, Input, NumberField, Suggestions, TextField, formStyles } from '@/components/form';
import { MaxContentWidth, Radius, Spacing, useTheme } from '@/constants/theme';
import { catalogueFor, kindOf } from '@/data/appliances';
import { applianceHasFault, applianceProblems, coRatio } from '@/lib/records';
import { useStore } from '@/lib/store';
import type { Appliance, Classification, FlueType } from '@/lib/types';
import { confirm } from '@/lib/ui';

const TYPES = ['Boiler', 'Combi boiler', 'Fire', 'Cooker', 'Hob', 'Oven', 'Water heater', 'Warm air heater', 'Back boiler'];
const LOCATIONS = ['Kitchen', 'Utility', 'Lounge', 'Dining room', 'Bathroom', 'Airing cupboard', 'Bedroom', 'Hall', 'Loft', 'Garage'];
const FLUES: { value: FlueType; label: string }[] = [
  { value: 'RS', label: 'Room sealed' },
  { value: 'OF', label: 'Open flue' },
  { value: 'FL', label: 'Flueless' },
];
const CLASSIFICATIONS: { value: Classification; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'AR', label: 'At Risk' },
  { value: 'ID', label: 'Imm. Dangerous' },
];

export default function ApplianceScreen() {
  const c = useTheme();
  const { recordId, applianceId } = useLocalSearchParams<{ recordId: string; applianceId: string }>();
  const store = useStore();
  const record = store.getRecord(recordId);
  const index = record?.appliances.findIndex((a) => a.id === applianceId) ?? -1;
  const a = index >= 0 ? record!.appliances[index] : undefined;

  // Makes and models from your other records, most used first, for the suggestions.
  const kind = kindOf(a?.type ?? '');
  const learned = (() => {
    const makes = new Map<string, { name: string; count: number }>();
    const models = new Map<string, Map<string, { name: string; count: number }>>();
    const add = (m: Map<string, { name: string; count: number }>, name: string) => {
      const key = name.toLowerCase();
      const cur = m.get(key);
      m.set(key, { name: cur?.name ?? name, count: (cur?.count ?? 0) + 1 });
    };
    for (const r of store.records) {
      for (const ap of r.appliances) {
        if (ap.id === applianceId) continue;
        // Only suggest makes used for the same kind of appliance (boilers for boilers, and so on).
        if (kind !== 'other' && kindOf(ap.type) !== kind) continue;
        const make = ap.make.trim();
        if (!make || /^unknown$/i.test(make)) continue;
        add(makes, make);
        const model = ap.model.trim();
        if (!model || /^unknown$/i.test(model)) continue;
        const forMake = models.get(make.toLowerCase()) ?? new Map();
        add(forMake, model);
        models.set(make.toLowerCase(), forMake);
      }
    }
    const sorted = (m: Map<string, { name: string; count: number }>) =>
      [...m.values()].sort((x, y) => y.count - x.count).map((v) => v.name);
    return {
      makes: sorted(makes),
      modelsFor: (make: string) => sorted(models.get(make.trim().toLowerCase()) ?? new Map()),
    };
  })();

  if (!record || !a) {
    return (
      <View style={[styles.missing, { backgroundColor: c.background }]}>
        <Text style={{ color: c.textSecondary, fontSize: 17 }}>This appliance has been removed.</Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const locked = record.status === 'issued';
  const patch = (p: Partial<Appliance>) =>
    store.updateRecord(record.id, (cur) => ({
      ...cur,
      appliances: cur.appliances.map((x) => (x.id === a.id ? { ...x, ...p } : x)),
    }));
  const fullCheck = a.landlordsAppliance === 'yes' && a.inspected === 'yes';
  const catalogue = catalogueFor(a.type);
  const unique = (list: string[]) => {
    const seen = new Set<string>();
    return list.filter((x) => !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase()));
  };
  const makeOptions = unique([...learned.makes, ...Object.keys(catalogue).sort()]);
  const catalogueMake = Object.keys(catalogue).find((k) => k.toLowerCase() === a.make.trim().toLowerCase());
  const learnedModels = learned.modelsFor(a.make);
  const modelOptions = unique([...learnedModels, ...(catalogueMake ? catalogue[catalogueMake] : [])]);
  const fault = applianceHasFault(a);
  const missing = applianceProblems(a);
  const ratio = coRatio(a.coPpm, a.co2Percent);

  const remove = async () => {
    const ok = await confirm('Remove this appliance?', 'It will be taken off this record.', 'Remove', true);
    if (!ok) return;
    store.updateRecord(record.id, (cur) => ({ ...cur, appliances: cur.appliances.filter((x) => x.id !== a.id) }));
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: `Appliance ${index + 1}` }} />
      <ScrollView
        style={{ backgroundColor: c.background }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="automatic">
        {locked && (
          <View style={[styles.note, { backgroundColor: c.okSoft }]}>
            <Text style={{ color: c.text, fontSize: 15, lineHeight: 21 }}>
              This record has been issued. To change it, go back and tap Edit record.
            </Text>
          </View>
        )}
        <View pointerEvents={locked ? 'none' : 'auto'} style={locked ? { opacity: 0.75 } : undefined}>
          <SectionLabel>Appliance</SectionLabel>
          <Card style={formStyles.group}>
            <Field label="Location">
              <Input value={a.location} onChangeText={(location) => patch({ location })} placeholder="e.g. Kitchen" autoCapitalize="words" />
              <Suggestions options={LOCATIONS} value={a.location} onPick={(location) => patch({ location })} />
            </Field>
            <Field label="Appliance type">
              <Input value={a.type} onChangeText={(type) => patch({ type })} placeholder="e.g. Combi boiler" autoCapitalize="sentences" />
              <Suggestions options={TYPES} value={a.type} onPick={(type) => patch({ type })} />
            </Field>
            <Autocomplete
              label="Make"
              value={a.make}
              onChange={(make) => patch({ make })}
              options={makeOptions}
              recent={new Set(learned.makes)}
              placeholder="Start typing the make (or Unknown)"
            />
            <Autocomplete
              label="Model"
              value={a.model}
              onChange={(model) => patch({ model })}
              options={modelOptions}
              recent={new Set(learnedModels)}
              placeholder={catalogueMake ? `e.g. ${catalogue[catalogueMake][0] ?? 'model'} (or Unknown)` : 'Model (or Unknown)'}
              hint={catalogueMake && catalogue[catalogueMake].length ? 'Pick the range, then add the output if you like, e.g. 30kW.' : undefined}
            />
            <CheckRow
              label="Landlord's appliance"
              kind="yesNo"
              neutral
              value={a.landlordsAppliance}
              onChange={(landlordsAppliance) =>
                patch({ landlordsAppliance, inspected: landlordsAppliance === 'no' ? 'no' : a.inspected })
              }
              hint={a.landlordsAppliance === 'no' ? "Tenant's own appliance: a visual check only. Record anything unsafe you see." : undefined}
            />
            <CheckRow label="Appliance inspected" kind="yesNo" neutral value={a.inspected} onChange={(inspected) => patch({ inspected })} />
            <Field label="Flue type">
              <Choice options={FLUES} value={a.flueType === 'na' ? '' : a.flueType} onChange={(flueType) => patch({ flueType })} />
            </Field>
          </Card>

          {fullCheck && (
            <>
              <SectionLabel>Readings</SectionLabel>
              <Card style={formStyles.group}>
                <Text style={[styles.help, { color: c.textSecondary }]}>
                  Operating pressure or heat input (or both where necessary). Combustion readings where the manufacturer asks for them.
                </Text>
                <View style={styles.inline}>
                  <View style={{ flex: 1 }}>
                    <NumberField label="Operating pressure" unit="mbar" value={a.operatingPressure} onChange={(operatingPressure) => patch({ operatingPressure })} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <NumberField label="Heat input" unit="kW" value={a.heatInput} onChange={(heatInput) => patch({ heatInput })} />
                  </View>
                </View>
                <View style={styles.inline}>
                  <View style={{ flex: 1 }}>
                    <NumberField label="CO" unit="ppm" value={a.coPpm} onChange={(coPpm) => patch({ coPpm })} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <NumberField label="CO₂" unit="%" value={a.co2Percent} onChange={(co2Percent) => patch({ co2Percent })} />
                  </View>
                </View>
                {!!ratio && (
                  <Text style={[styles.ratio, { color: c.text }]}>
                    CO/CO₂ ratio <Text style={{ fontWeight: '800' }}>{ratio}</Text>
                  </Text>
                )}
              </Card>

              <SectionLabel>Checks</SectionLabel>
              <Card style={formStyles.group}>
                <CheckRow label="Safety device(s) correct operation" kind="passFail" value={a.safetyDevices} onChange={(safetyDevices) => patch({ safetyDevices })} />
                <CheckRow label="Ventilation satisfactory" kind="yesNoNa" value={a.ventilation} onChange={(ventilation) => patch({ ventilation })} />
                <CheckRow label="Visual condition of flue / termination" kind="passFail" value={a.flueVisual} onChange={(flueVisual) => patch({ flueVisual })} />
                <CheckRow
                  label="Flue performance checks"
                  kind="passFail"
                  value={a.fluePerformance}
                  onChange={(fluePerformance) => patch({ fluePerformance })}
                  hint="Spillage and/or flue flow test where appropriate."
                />
                <CheckRow label="Appliance serviced" kind="yesNo" neutral value={a.serviced} onChange={(serviced) => patch({ serviced })} />
              </Card>
            </>
          )}

          <SectionLabel>CO alarm</SectionLabel>
          <Card style={formStyles.group}>
            <CheckRow label="CO alarm fitted" kind="yesNoNa" value={a.coAlarmFitted} onChange={(coAlarmFitted) => patch({ coAlarmFitted })} />
            <CheckRow label="CO alarm tested and working" kind="yesNoNa" value={a.coAlarmTested} onChange={(coAlarmTested) => patch({ coAlarmTested })} />
          </Card>

          <SectionLabel>Result</SectionLabel>
          <Card style={formStyles.group}>
            <CheckRow label="Appliance safe to use" kind="yesNo" value={a.safeToUse} onChange={(safeToUse) => patch({ safeToUse })} />
            {(fault || !!a.defects || !!a.remedialAction) && (
              <>
                <TextField
                  label="Gas safety defect(s) identified"
                  value={a.defects}
                  onChange={(defects) => patch({ defects })}
                  multiline
                  style={{ minHeight: 80, textAlignVertical: 'top' }}
                  hint="Only gas safety defects belong on this record. Put other faults on your job sheet or invoice."
                />
                <Field label="Classification (IGEM/G/11)">
                  <Choice options={CLASSIFICATIONS} value={a.classification} onChange={(classification) => patch({ classification })} />
                </Field>
                {a.classification !== 'none' && (
                  <View style={styles.inline}>
                    <View style={{ flex: 1 }}>
                      <CheckRow label="Warning notice issued" kind="yesNo" neutral value={a.warningNoticeIssued} onChange={(warningNoticeIssued) => patch({ warningNoticeIssued })} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <CheckRow label="Warning label attached" kind="yesNo" neutral value={a.warningLabelAttached} onChange={(warningLabelAttached) => patch({ warningLabelAttached })} />
                    </View>
                  </View>
                )}
                <TextField
                  label="Remedial action taken"
                  value={a.remedialAction}
                  onChange={(remedialAction) => patch({ remedialAction })}
                  multiline
                  style={{ minHeight: 70, textAlignVertical: 'top' }}
                  hint="If nothing was done, say so, e.g. “None – responsible person advised”."
                />
              </>
            )}
          </Card>
        </View>

        {missing.length > 0 && !locked && (
          <View style={[styles.note, { backgroundColor: c.lowSoft, marginTop: Spacing.xl }]}>
            <Text style={{ color: c.text, fontSize: 15, lineHeight: 21 }}>
              Still to fill in: {missing.join(', ')}.
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          <Button label="Done" onPress={() => router.back()} />
          {!locked && <Button label="Remove appliance" variant="danger" onPress={remove} />}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.lg,
    paddingBottom: 80,
  },
  inline: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  help: { fontSize: 14, lineHeight: 20 },
  ratio: { fontSize: 16 },
  note: { borderRadius: Radius.md, padding: Spacing.lg },
  actions: { gap: Spacing.sm, marginTop: Spacing.xl },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
});
