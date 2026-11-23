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
import { invoiceFromRecord, invoiceNumber, newInvoice } from './invoices';
import type { AppData, Engineer, GasRecord, Invoice } from './types';

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
  invoices: Invoice[];
  getInvoice: (id: string) => Invoice | undefined;
  /** Creates a draft invoice with the next number and returns its id. */
  createInvoice: () => string;
  /** Creates an invoice for a gas safety record, filled in from it, and returns its id. */
  invoiceRecord: (recordId: string) => string | null;
  updateInvoice: (id: string, change: (i: Invoice) => Invoice) => void;
  /** Marks an invoice as sent (if it was a draft). */
  markInvoiceSent: (id: string) => void;
  setInvoicePaid: (id: string, paid: boolean) => void;
  deleteInvoice: (id: string) => void;
  replaceAll: (data: AppData) => void;
  clearAll: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData);
  const [loaded, setLoaded] = useState(false);

  // Set when the saved data couldn't be read, so an empty app never saves over it.
  const [readFailed, setReadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // In a browser, ask for this site's storage to be kept rather than cleared when space is short.
    (globalThis as any).navigator?.storage?.persist?.().catch?.(() => {});
    AsyncStorage.getItem(STORAGE_KEY)
      .then(async (raw) => {
        if (cancelled || !raw) return;
        try {
          setData(parseAppData(JSON.parse(raw)));
        } catch (error) {
          // Keep a copy of whatever was there before anything new is saved.
          console.warn('Could not read saved records', error);
          await AsyncStorage.setItem(`${STORAGE_KEY}/unreadable-${Date.now()}`, raw).catch(() => {});
        }
      })
      .catch((error) => {
        console.warn('Could not load saved records', error);
        if (!cancelled) setReadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded || readFailed) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch((error) =>
      console.warn('Could not save records', error),
    );
  }, [data, loaded, readFailed]);

  const value = useMemo<StoreValue>(() => {
    const byId = new Map(data.records.map((r) => [r.id, r]));
    const invoiceById = new Map(data.invoices.map((i) => [i.id, i]));

    // Invoices are numbered in order, like records; the counter only goes up.
    const insertInvoice = (make: (number: string) => Invoice) => {
      const invoice = make(invoiceNumber(data.engineer));
      setData((d) => ({
        ...d,
        engineer: { ...d.engineer, nextInvoiceNumber: d.engineer.nextInvoiceNumber + 1 },
        invoices: [{ ...invoice, number: invoiceNumber(d.engineer) }, ...d.invoices],
      }));
      return invoice.id;
    };

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
      invoices: data.invoices,
      getInvoice: (id) => invoiceById.get(id),
      createInvoice: () => insertInvoice((n) => newInvoice(n, data.engineer)),
      invoiceRecord: (recordId) => {
        const r = byId.get(recordId);
        return r ? insertInvoice((n) => invoiceFromRecord(r, n, data.engineer)) : null;
      },
      updateInvoice: (id, change) =>
        setData((d) => ({
          ...d,
          invoices: d.invoices.map((i) => (i.id === id ? { ...change(i), updatedAt: Date.now() } : i)),
        })),
      markInvoiceSent: (id) =>
        setData((d) => ({
          ...d,
          invoices: d.invoices.map((i) =>
            i.id === id && i.status === 'draft' ? { ...i, status: 'sent', sentAt: Date.now(), updatedAt: Date.now() } : i,
          ),
        })),
      setInvoicePaid: (id, paid) =>
        setData((d) => ({
          ...d,
          invoices: d.invoices.map((i) =>
            i.id === id
              ? {
                  ...i,
                  status: paid ? 'paid' : 'sent',
                  paidAt: paid ? Date.now() : null,
                  sentAt: i.sentAt ?? Date.now(),
                  updatedAt: Date.now(),
                }
              : i,
          ),
        })),
      deleteInvoice: (id) => setData((d) => ({ ...d, invoices: d.invoices.filter((i) => i.id !== id) })),
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
