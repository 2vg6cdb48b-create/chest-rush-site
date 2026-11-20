import { Platform } from 'react-native';

export type ProductInfo = {
  name: string;
  brand: string;
  imageUrl: string;
  /** Short facts such as size or category, for the notes field. */
  details: string[];
  source: string;
};

const TIMEOUT_MS = 8000;

// The Open Food Facts family of free databases share one API. Products Facts covers
// general goods, the others cover groceries, toiletries and pet food.
const OPEN_FACTS = [
  { host: 'world.openproductsfacts.org', source: 'Open Products Facts' },
  { host: 'world.openfoodfacts.org', source: 'Open Food Facts' },
  { host: 'world.openbeautyfacts.org', source: 'Open Beauty Facts' },
  { host: 'world.openpetfoodfacts.org', source: 'Open Pet Food Facts' },
];

const FIELDS = [
  'product_name',
  'product_name_en',
  'generic_name',
  'brands',
  'quantity',
  'categories',
  'image_front_url',
  'image_url',
].join(',');

function clean(text: unknown): string {
  return typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : '';
}

function firstOf(list: string, n: number): string[] {
  return list
    .split(',')
    .map((s) => s.replace(/^[a-z]{2}:/, '').trim())
    .filter(Boolean)
    .slice(0, n);
}

async function fetchJson(url: string, signal: AbortSignal): Promise<any> {
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fromOpenFacts(code: string, host: string, source: string, signal: AbortSignal) {
  const data = await fetchJson(
    `https://${host}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`,
    signal,
  );
  const p = data?.product;
  if (data?.status !== 1 || !p) throw new Error('not found');
  const name = clean(p.product_name) || clean(p.product_name_en) || clean(p.generic_name);
  if (!name) throw new Error('no name');
  const brand = firstOf(clean(p.brands), 1)[0] ?? '';
  const details = [clean(p.quantity), ...firstOf(clean(p.categories), 2)].filter(Boolean);
  return {
    name,
    brand,
    imageUrl: clean(p.image_front_url) || clean(p.image_url),
    details,
    source,
  } satisfies ProductInfo;
}

/** UPCitemdb's free tier has wide coverage of general goods. Browsers can't call it, only the app. */
async function fromUpcItemDb(code: string, signal: AbortSignal): Promise<ProductInfo> {
  const data = await fetchJson(
    `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`,
    signal,
  );
  const item = data?.items?.[0];
  const name = clean(item?.title);
  if (!name) throw new Error('not found');
  const images: string[] = Array.isArray(item.images) ? item.images : [];
  return {
    name,
    brand: clean(item.brand),
    imageUrl: images.find((u) => u.startsWith('https://')) ?? '',
    details: [clean(item.size), clean(item.category).split('>').pop()?.trim() ?? ''].filter(Boolean),
    source: 'UPCitemdb',
  };
}

/** Resolves the first database's answer, or rejects if none has the product. */
function firstFound<T>(tasks: Promise<T>[]): Promise<T> {
  return new Promise((resolve, reject) => {
    let failed = 0;
    for (const t of tasks) {
      t.then(resolve, () => {
        failed += 1;
        if (failed === tasks.length) reject(new Error('not found'));
      });
    }
  });
}

export type LookupResult =
  | { status: 'found'; product: ProductInfo }
  | { status: 'not-found' }
  | { status: 'offline' };

/** Looks a barcode up in free online product databases. */
export async function lookupProduct(barcode: string): Promise<LookupResult> {
  const code = barcode.trim();
  if (!/^\d{6,14}$/.test(code)) return { status: 'not-found' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let reachedAny = false;
  const track = <T,>(p: Promise<T>) =>
    p.then(
      (v) => {
        reachedAny = true;
        return v;
      },
      (e) => {
        if (!(e instanceof TypeError) && e?.name !== 'AbortError') reachedAny = true;
        throw e;
      },
    );

  try {
    const tasks = OPEN_FACTS.map((db) => track(fromOpenFacts(code, db.host, db.source, controller.signal)));
    try {
      return { status: 'found', product: await firstFound(tasks) };
    } catch {
      // Try the next source.
    }
    if (Platform.OS !== 'web') {
      try {
        return { status: 'found', product: await track(fromUpcItemDb(code, controller.signal)) };
      } catch {
        // Not found there either.
      }
    }
    return reachedAny ? { status: 'not-found' } : { status: 'offline' };
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
