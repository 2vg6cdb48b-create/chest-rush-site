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
  /** Combustion analyser readings. */
  coPpm: string;
  co2Percent: string;
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
  receivedByName: string;
  receivedByRole: 'Tenant' | 'Landlord' | 'Agent' | 'Homeowner' | '';
  receivedBySignature: Signature | null;
  issuedAt: number | null;
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
};

export type AppData = {
  version: 1;
  engineer: Engineer;
  records: GasRecord[];
};
