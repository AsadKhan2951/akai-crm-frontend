export type Tone = 'neutral' | 'brand' | 'good' | 'warn' | 'bad';

export type OrderStatus =
  | 'DRAFT' | 'PENDING_APPROVAL' | 'PLACED' | 'CONFIRMED' | 'PICKED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';

export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'PROSPECT' | 'BLOCKED';
export type CustomerType =
  | 'AUTO_PARTS' | 'OIL_CHANGE' | 'CAR_WASH' | 'DETAILING' | 'PAINT_HARDWARE' | 'FUEL_STATION' | 'DISTRIBUTOR' | 'OTHER';

export interface Agent {
  id: string;
  name: string;
  beatLabel?: string | null;
}

export interface AgentStat extends Agent {
  revenue: number;
  orders: number;
  visitsPlanned: number;
  visitsDone: number;
  collected: number;
  collectionTarget: number;
  profilesComplete: number; // 0–100
}

export interface DataHealth {
  dealerCount: number;       // excludes internal accounts
  internalCount: number;
  totalRecords: number;
  completeProfiles: number;
  withAgent: number;
  areaVariants: number;
  areaVariantsAfterMerge: number;
  typeOther: number;
  typeSuggestions: number;
  duplicatesFlagged: number;
}

export interface AgeingBucket {
  bucket: '0_30' | '31_60' | '61_90' | '90_plus';
  amount: number;
  customers: number;
}

export interface OverdueRow {
  customerId: string;
  name: string;
  area: string | null;
  agentName: string | null;
  amount: number;
  daysOverdue: number;
}

export interface OpsSummary {
  revenueMtd: number;
  revenuePrevMonth: number;
  revenueTarget: number | null;
  ordersMtd: number;
  ordersPrevMonth: number;
  pendingApprovals: { count: number; amount: number; overLimit: number };
  activeCustomers: number;
  receivables: number;
  overdue30: { count: number; amount: number };
  overdue60: { count: number; amount: number };
  collectedMtd: number;
  collectionTarget: number | null;
  pendingDeposits: { count: number; amount: number };
  bouncedCheques: { count: number; amount: number };
  delivery: { confirmed: number; picked: number; dispatched: number; deliveredToday: number; failedToday: number; delayedRuns: number };
  deliveredMtd: number;
  revenueByMonth: { month: string; value: number }[]; // month = 'YYYY-MM'
  revenueByCategory: { name: string; nameUr?: string | null; value: number }[];
  topCustomers: { name: string; area: string | null; value: number }[];
  agents: AgentStat[];
  ageing: AgeingBucket[];
  topOverdue: OverdueRow[];
  dataHealth: DataHealth;
}

export interface ApprovalLine {
  name: string;
  nameUr?: string | null;
  qty: number;
  total: number;
}

export interface ApprovalOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  area: string | null;
  agentName: string | null;
  placedAt: string;
  total: number;
  balance: number;
  creditLimit: number;
  isFirstOrder: boolean;
  lines: ApprovalLine[];
}

export interface CustomerRow {
  id: string;
  name: string;
  area: string | null;
  type: CustomerType;
  typeSuggestion: CustomerType | null;
  status: CustomerStatus;
  agentId: string | null;
  agentName: string | null;
  balance: number;
  creditLimit: number;
  dataComplete: boolean;
  missing: ('phone' | 'address' | 'location')[];
  duplicateFlag: boolean;
  isInternal: boolean;
}

export type CustomerView = 'all' | 'incomplete' | 'unassigned' | 'duplicates' | 'internal';

export interface CollectionRow {
  id: string;
  customerName: string;
  reference: string | null;
  method: 'CASH' | 'CHEQUE' | 'TRANSFER' | string;
  collectedBy: string | null;
  collectedAt: string;
  amount: number;
  status: 'COLLECTED' | 'DEPOSITED' | 'CLEARED' | 'BOUNCED' | string;
}

export interface DeliveryRun {
  id: string;
  code: string;
  route: string | null;
  driver: string | null;
  vehicle: string | null;
  dropsDone: number;
  dropsTotal: number;
  status: 'PLANNED' | 'ON_ROUTE' | 'DELAYED' | 'COMPLETED' | string;
}

export const TEMPLATE_NAMES = [
  'order_confirmation', 'order_approved', 'order_rejected', 'order_status_change', 'quote_ready', 'quote_expiring',
  'payment_reminder', 'receipt', 'dispatch_notification', 'promotional_broadcast', 'followup_nudge',
] as const;
export type TemplateName = (typeof TEMPLATE_NAMES)[number];

export interface WhatsappTemplate {
  name: TemplateName;
  en: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  ur: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
}

export interface AdminSettings {
  approvalThreshold: number;
  blockOverCreditLimit: boolean;
  priceListNeedsApproval: boolean;
  dailyAiBudget: number;
  voiceRetentionMonths: number;
  companyNameEn: string;
  companyNameUr: string;
  westernNumerals: boolean;
  whatsappAssistantEnabled: boolean;
  whatsappOrderCeiling: number;
}
