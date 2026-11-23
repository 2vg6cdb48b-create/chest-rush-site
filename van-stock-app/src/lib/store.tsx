import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  emptyData,
  makeMovement,
  MAX_MOVEMENTS,
  newId,
  parseStockData,
  sampleItems,
} from './stock';
import type { Movement, StockData, StockItem } from './types';

const STORAGE_KEY = 'van-stock/data/v1';
/** Taps on +/- for the same item within this window are merged into one history entry. */
const MERGE_WINDOW_MS = 2 * 60 * 1000;

export type ItemFields = Omit<StockItem, 'id' | 'createdAt' | 'updatedAt'>;

type StockContextValue = {
  loaded: boolean;
  items: StockItem[];
  movements: Movement[];
  data: StockData;
  getItem: (id: string) => StockItem | undefined;
  findByBarcode: (code: string) => StockItem | undefined;
  addItem: (fields: ItemFields) => string;
  updateItem: (id: string, fields: ItemFields) => void;
  adjust: (id: string, delta: number) => void;
  restock: (id: string) => void;
  deleteItem: (id: string) => void;
  replaceAll: (data: StockData) => void;
  addSamples: () => void;
  clearHistory: () => void;
  clearAll: () => void;
};

const StockContext = createContext<StockContextValue | null>(null);

function pushMovement(movements: Movement[], movement: Movement): Movement[] {
  return [movement, ...movements].slice(0, MAX_MOVEMENTS);
}

export function StockProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StockData>(emptyData);
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
          setData(parseStockData(JSON.parse(raw)));
        } catch (error) {
          // Keep a copy of whatever was there before anything new is saved.
          console.warn('Could not read saved stock', error);
          await AsyncStorage.setItem(`${STORAGE_KEY}/unreadable-${Date.now()}`, raw).catch(() => {});
        }
      })
      .catch((error) => {
        console.warn('Could not load saved stock', error);
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
      console.warn('Could not save stock', error),
    );
  }, [data, loaded, readFailed]);

  const addItem = useCallback((fields: ItemFields) => {
    const now = Date.now();
    const item: StockItem = { ...fields, id: newId(), createdAt: now, updatedAt: now };
    setData((d) => ({
      ...d,
      items: [...d.items, item],
      movements: pushMovement(d.movements, makeMovement(item, item.quantity, 'created', item.quantity)),
    }));
    return item.id;
  }, []);

  const updateItem = useCallback((id: string, fields: ItemFields) => {
    setData((d) => {
      const old = d.items.find((it) => it.id === id);
      if (!old) return d;
      const updated: StockItem = { ...old, ...fields, updatedAt: Date.now() };
      const change = updated.quantity - old.quantity;
      return {
        ...d,
        items: d.items.map((it) => (it.id === id ? updated : it)),
        movements:
          change !== 0
            ? pushMovement(d.movements, makeMovement(updated, change, 'counted', updated.quantity))
            : d.movements,
      };
    });
  }, []);

  const adjust = useCallback((id: string, delta: number) => {
    setData((d) => {
      const old = d.items.find((it) => it.id === id);
      if (!old) return d;
      const quantity = Math.max(0, old.quantity + delta);
      const change = quantity - old.quantity;
      if (change === 0) return d;
      const updated: StockItem = { ...old, quantity, updatedAt: Date.now() };
      const reason = change < 0 ? 'used' : 'added';
      const last = d.movements[0];
      let movements: Movement[];
      if (
        last &&
        last.itemId === id &&
        last.reason === reason &&
        Date.now() - last.at < MERGE_WINDOW_MS
      ) {
        movements = [
          { ...last, change: last.change + change, newQuantity: quantity, at: Date.now() },
          ...d.movements.slice(1),
        ];
      } else {
        movements = pushMovement(d.movements, makeMovement(updated, change, reason, quantity));
      }
      return { ...d, items: d.items.map((it) => (it.id === id ? updated : it)), movements };
    });
  }, []);

  const restock = useCallback((id: string) => {
    setData((d) => {
      const old = d.items.find((it) => it.id === id);
      if (!old || old.fullLevel <= old.quantity) return d;
      const updated: StockItem = { ...old, quantity: old.fullLevel, updatedAt: Date.now() };
      return {
        ...d,
        items: d.items.map((it) => (it.id === id ? updated : it)),
        movements: pushMovement(
          d.movements,
          makeMovement(updated, updated.quantity - old.quantity, 'restocked', updated.quantity),
        ),
      };
    });
  }, []);

  const deleteItem = useCallback((id: string) => {
    setData((d) => {
      const old = d.items.find((it) => it.id === id);
      if (!old) return d;
      return {
        ...d,
        items: d.items.filter((it) => it.id !== id),
        movements: pushMovement(d.movements, makeMovement(old, -old.quantity, 'deleted', 0)),
      };
    });
  }, []);

  const replaceAll = useCallback((next: StockData) => setData(next), []);

  const addSamples = useCallback(() => {
    setData((d) => ({ ...d, items: [...d.items, ...sampleItems()] }));
  }, []);

  const clearHistory = useCallback(() => setData((d) => ({ ...d, movements: [] })), []);
  const clearAll = useCallback(() => setData(emptyData()), []);

  const value = useMemo<StockContextValue>(() => {
    const byId = new Map(data.items.map((it) => [it.id, it]));
    return {
      loaded,
      data,
      items: data.items,
      movements: data.movements,
      getItem: (id) => byId.get(id),
      findByBarcode: (code) => {
        const c = code.trim();
        return c ? data.items.find((it) => it.barcode.trim() === c) : undefined;
      },
      addItem,
      updateItem,
      adjust,
      restock,
      deleteItem,
      replaceAll,
      addSamples,
      clearHistory,
      clearAll,
    };
  }, [
    data,
    loaded,
    addItem,
    updateItem,
    adjust,
    restock,
    deleteItem,
    replaceAll,
    addSamples,
    clearHistory,
    clearAll,
  ]);

  return <StockContext.Provider value={value}>{children}</StockContext.Provider>;
}

export function useStock(): StockContextValue {
  const ctx = useContext(StockContext);
  if (!ctx) throw new Error('useStock must be used inside StockProvider');
  return ctx;
}
