/** A drawn signature, stored as SVG path data so it stays sharp on the PDF. */
export type Signature = {
  paths: string[];
  width: number;
  height: number;
};

export type PassFail = 'pass' | 'fail' | 'na';
export type YesNo = 'yes' | 'no';
export type YesNoNa = 'yes' | 'no' | 'na';

/** Classification under the Gas Industry Unsafe Situations Procedure (IGEM/G/11). */
export type Classification = 'none' | 'AR' | 'ID';

export type FlueType = 'RS' | 'OF' | 'FL' | 'na';

export type Appliance = {
  id: string;
  location: string;
  type: string;
  make: string;
  model: string;
  /** Owned by the landlord. Tenants' own appliances get a visual check only. */
  landlordsAppliance: YesNo;
  inspected: YesNo;
  flueType: FlueType | '';
  /** Operating (burner) pressure in mbar. */
  operatingPressure: string;
  /** Heat input in kW. */
  heatInput: string;
  /** Combustion analyser readings at high fire (maximum rate). */
  coPpm: string;
  co2Percent: string;
  /** CO/CO2 ratio as shown on the analyser at high fire. */
  ratioHigh: string;
  /** Combustion analyser readings at low fire (minimum rate). */
  coLowPpm: string;
  co2LowPercent: string;
  ratioLow: string;
  safetyDevices: PassFail | '';
  ventilation: YesNoNa | '';
  flueVisual: PassFail | '';
  /** Spillage / flue flow test. */
  fluePerformance: PassFail | '';
  serviced: YesNo | '';
  coAlarmFitted: YesNoNa | '';
  coAlarmTested: YesNoNa | '';
  safeToUse: YesNo | '';
  defects: string;
  classification: Classification;
  warningNoticeIssued: YesNo | '';
  warningLabelAttached: YesNo | '';
  remedialAction: string;
};

export type Address = {
  line1: string;
  line2: string;
  town: string;
  postcode: string;
};

export type GasRecord = {
  id: string;
  /** Your own record number, e.g. "LGSR-0012". */
  number: string;
  status: 'draft' | 'issued';
  /** Dates are stored as YYYY-MM-DD. */
  checkDate: string;
  nextDueDate: string;
  /** Due date on the previous record for this property, used for the 10–12 month rule. */
  previousDueDate: string;
  property: Address;
  tenantName: string;
  landlordIsAgent: boolean;
  landlordName: string;
  landlordAddress: Address;
  landlordPhone: string;
  landlordEmail: string;
  /** When a managing agent is recorded above: the landlord who owns the property (optional). */
  ownerName: string;
  ownerAddress: Address;
  appliances: Appliance[];
  tightnessTest: PassFail | '';
  ecvAccessible: YesNo | '';
  bonding: YesNoNa | '';
  pipeworkVisual: PassFail | '';
  installationDefects: string;
  installationRemedial: string;
  installationClassification: Classification;
  notes: string;
  engineerSignature: Signature | null;
  /** Your details as they were when the record was issued, so old records don't change. */
  engineerDetails: EngineerDetails | null;
  receivedByName: string;
  receivedByRole: 'Tenant' | 'Landlord' | 'Agent' | 'Homeowner' | '';
  receivedBySignature: Signature | null;
  issuedAt: number | null;
  /** When you last emailed the landlord that the next check is due. */
  remindedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type Engineer = {
  name: string;
  companyName: string;
  address: Address;
  phone: string;
  email: string;
  /** Gas Safe registration number (business). */
  gasSafeNumber: string;
  /** Engineer's licence / ID card number. */
  licenceNumber: string;
  signature: Signature | null;
  recordPrefix: string;
  nextRecordNumber: number;
  /** When a backup file was last saved (ms), or null if never. */
  lastBackupAt: number | null;
  /** Phone alerts 30 and 7 days before each property's next check is due. */
  remindersOn: boolean;
  /** Light or dark look; 'system' follows the phone. */
  appearance: 'system' | 'light' | 'dark';
  invoicePrefix: string;
  nextInvoiceNumber: number;
  /** VAT registration number, printed on invoices that charge VAT. */
  vatNumber: string;
  /** VAT choice for new invoices. */
  defaultVatRate: VatRate;
  /** Days the customer has to pay. */
  paymentDays: number;
  bankAccountName: string;
  bankSortCode: string;
  bankAccountNumber: string;
  /** Printed in the notes box of new invoices. */
  invoiceNote: string;
  /** Your usual price for a gas safety record, used when invoicing one. */
  gasSafetyPrice: string;
  /** 'custom' is the branded navy and orange layout; 'classic' is a plain black and white document. */
  invoiceStyle: 'custom' | 'classic';
};

/** 'none' means not VAT registered, so no VAT is shown or charged. */
export type VatRate = 'none' | '20' | '5' | '0';

export type InvoiceItem = {
  id: string;
  description: string;
  /** Kept as text so "1." or "" can be typed. */
  quantity: string;
  /** Pounds, e.g. "70" or "18.50". */
  unitPrice: string;
};

export type Invoice = {
  id: string;
  /** Your own invoice number, e.g. "INV-0024". */
  number: string;
  status: 'draft' | 'sent' | 'paid';
  customerName: string;
  customerAddress: Address;
  customerEmail: string;
  customerPhone: string;
  /** Where the work was done, if different from the customer's address (optional). */
  jobAddress: Address;
  /** The customer's order or PO number, or your own reference (optional). */
  reference: string;
  /** The gas safety record this invoice was made from, if any. */
  recordId: string | null;
  /** Dates are stored as YYYY-MM-DD. */
  invoiceDate: string;
  workDate: string;
  dueDate: string;
  items: InvoiceItem[];
  /** Percentage off the subtotal, e.g. "10". Empty or "0" means no discount. */
  discountPercent: string;
  vatRate: VatRate;
  notes: string;
  sentAt: number | null;
  paidAt: number | null;
  createdAt: number;
  updatedAt: number;
};

/** The parts of your details printed on a record. */
export type EngineerDetails = Pick<
  Engineer,
  'name' | 'companyName' | 'address' | 'phone' | 'email' | 'gasSafeNumber' | 'licenceNumber'
>;

export type AppData = {
  version: 1;
  engineer: Engineer;
  records: GasRecord[];
  invoices: Invoice[];
};
