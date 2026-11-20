export type StockItem = {
  id: string;
  name: string;
  /** Supplier or manufacturer part number. */
  partNumber: string;
  barcode: string;
  /** Product picture (from an online product lookup), or empty. */
  imageUrl: string;
  /** Where the item lives in the van, e.g. "Shelf 2" or "Left drawer". */
  location: string;
  /** Unit of measure, e.g. "pcs", "m", "box". */
  unit: string;
  quantity: number;
  /** Restock when the quantity is at or below this. */
  minLevel: number;
  /** The amount you like to carry. 0 means not set. */
  fullLevel: number;
  notes: string;
  createdAt: number;
  updatedAt: number;
};

export type MovementReason = 'used' | 'added' | 'restocked' | 'counted' | 'created' | 'deleted';

export type Movement = {
  id: string;
  itemId: string;
  itemName: string;
  unit: string;
  /** Positive when stock went up, negative when it went down. */
  change: number;
  newQuantity: number;
  reason: MovementReason;
  at: number;
};

export type StockData = {
  version: 1;
  items: StockItem[];
  movements: Movement[];
};

export type StockStatus = 'ok' | 'low' | 'out';
