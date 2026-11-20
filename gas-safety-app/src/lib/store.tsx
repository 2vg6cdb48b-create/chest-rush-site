import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  emptyData,
  engineerDetailsOf,
  exampleRecord,
  newRecord,
  parseAppData,
  recordNumber,
  renewalOf,
} from './records';
import type { AppData, Engineer, GasRecord } from './types';

const STORAGE_KEY = 'gas-safety-records/data/v1';

type StoreValue = {
  loaded: boolean;
  data: AppData;
  engineer: Engineer;
  records: GasRecord[];
  getRecord: (id: string) => GasRecord | undefined;
  /** Creates a draft with the next record number and returns its id. */
  createRecord: () => string;
  /** Creates next year's record for the same property and returns its id. */
  renewRecord: (id: string) => string | null;
  saveRecord: (record: GasRecord) => void;
  /** Changes a record from its latest saved state, so quick successive edits aren't lost. */
  updateRecord: (id: string, change: (r: GasRecord) => GasRecord) => void;
  /** Marks a record as issued now. */
  issueRecord: (id: string) => void;
  deleteRecord: (id: string) => void;
  saveEngineer: (engineer: Engineer) => void;
  markBackedUp: () => void;
  /** Notes that the landlord has been emailed about the next check. */
  markReminded: (id: string) => void;
  addExample: () => string;
  replaceAll: (data: AppData) => void;
  clearAll: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        try {
          setData(parseAppData(JSON.parse(raw)));
        } catch (error) {
          console.warn('Could not read saved records', error);
        }
      })
      .catch((error) => console.warn('Could not load saved records', error))
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch((error) =>
      console.warn('Could not save records', error),
    );
  }, [data, loaded]);

  const value = useMemo<StoreValue>(() => {
    const byId = new Map(data.records.map((r) => [r.id, r]));

    // Each new record takes the next number; the counter only goes up.
    const takeNumber = (d: AppData) => ({
      number: recordNumber(d.engineer),
      engineer: { ...d.engineer, nextRecordNumber: d.engineer.nextRecordNumber + 1 },
    });

    const insert = (make: (number: string) => GasRecord) => {
      const { number } = takeNumber(data);
      const record = make(number);
      setData((d) => {
        const next = takeNumber(d);
        return {
          ...d,
          engineer: next.engineer,
          // New records are signed with your saved signature automatically.
          records: [
            {
              ...record,
              number: next.number,
              engineerSignature: record.engineerSignature ?? d.engineer.signature,
            },
            ...d.records,
          ],
        };
      });
      return record.id;
    };

    return {
      loaded,
      data,
      engineer: data.engineer,
      records: data.records,
      getRecord: (id) => byId.get(id),
      createRecord: () => insert(newRecord),
      renewRecord: (id) => {
        const old = byId.get(id);
        return old ? insert((n) => renewalOf(old, n)) : null;
      },
      saveRecord: (record) =>
        setData((d) => ({
          ...d,
          records: d.records.map((r) =>
            r.id === record.id ? { ...record, updatedAt: Date.now() } : r,
          ),
        })),
      updateRecord: (id, change) =>
        setData((d) => ({
          ...d,
          records: d.records.map((r) => (r.id === id ? { ...change(r), updatedAt: Date.now() } : r)),
        })),
      issueRecord: (id) =>
        setData((d) => ({
          ...d,
          records: d.records.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: 'issued',
                  issuedAt: Date.now(),
                  updatedAt: Date.now(),
                  engineerDetails: engineerDetailsOf(d.engineer),
                }
              : r,
          ),
        })),
      deleteRecord: (id) =>
        setData((d) => ({ ...d, records: d.records.filter((r) => r.id !== id) })),
      saveEngineer: (engineer) => setData((d) => ({ ...d, engineer })),
      markReminded: (id) =>
        setData((d) => ({
          ...d,
          records: d.records.map((r) => (r.id === id ? { ...r, remindedAt: Date.now() } : r)),
        })),
      markBackedUp: () =>
        setData((d) => ({ ...d, engineer: { ...d.engineer, lastBackupAt: Date.now() } })),
      addExample: () => insert(exampleRecord),
      replaceAll: (next) => setData(next),
      clearAll: () => setData((d) => ({ ...emptyData(), engineer: d.engineer })),
    };
  }, [data, loaded]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
