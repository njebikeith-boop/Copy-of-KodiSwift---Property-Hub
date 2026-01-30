
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  PROPERTY_MANAGER = 'PROPERTY_MANAGER',
  ACCOUNTANT = 'ACCOUNTANT',
  LANDLORD = 'LANDLORD'
}

export enum PropertyCategory {
  RENTAL = 'RENTAL',
  LEASE = 'LEASE',
  SALE = 'SALE'
}

export enum PenaltyType {
  NONE = 'NONE',
  STATIC = 'STATIC',
  PERCENTAGE = 'PERCENTAGE'
}

export enum PenaltyAppliedOn {
  RENT = 'RENT',
  TOTAL_DUE = 'TOTAL_DUE'
}

export type UserStatus = 'PENDING' | 'VERIFIED' | 'TRASHED';

// Added UserPermissions interface for role-based access control
export interface UserPermissions {
  [key: string]: boolean;
}

export interface User {
  id: string;
  name: string;
  role: UserRole | null;
  email: string;
  phone?: string;
  status: UserStatus;
  isLocked?: boolean; 
  jobDescription?: string;
  balance?: number;
  // Added permissions property to User interface
  permissions?: UserPermissions;
}

export interface RoleBlueprint {
  id: string;
  roleName: string;
  selectedModules: {
    moduleId: string;
    access: 'READ_ONLY' | 'EDITING';
    status: 'ACTIVE' | 'NULL';
  }[];
  jobDescription: string;
}

export interface PropertyMedia {
  id: string;
  url: string;
  type: 'IMAGE' | 'VIDEO';
}

export interface Property {
  id: string;
  name: string;
  location: string;
  totalUnits: number;
  category: PropertyCategory;
  description?: string;
  price?: number;
  isManaged?: boolean;
  approvalStatus?: 'APPROVED' | 'PENDING_ACTION' | 'PENDING_DELETE' | 'ARCHIVED';
  ownerId?: string;
  isPaymentChangeEnabled?: boolean;
  defaultDueDateDay?: number;
  penaltyType?: PenaltyType;
  penaltyValue?: number;
  penaltyAppliedOn?: PenaltyAppliedOn;
  archivedAt?: string;
  media?: PropertyMedia[];
}

export interface Unit {
  id: string;
  propertyId: string;
  unitNumber: string;
  type: string;
  isOccupied: boolean;
  currentReading?: number;
  // Added previousReading for utility billing tracking
  previousReading?: number;
  rentAmount?: number;
}

export interface Tenant {
  id: string;
  name: string;
  phoneNumber: string;
  // Added supplemental contact and profile fields for Tenant onboarding
  altPhoneNumber?: string;
  email: string;
  idNumber: string;
  paymentCode: string;
  status?: UserStatus;
  createdAt?: string;
  occupation?: string;
  nextOfKin?: string;
  idCopyUrl?: string;
  agreementUrl?: string;
  vacationNoticeUrl?: string;
  tenancyStartDate?: string;
  tenancyEndDate?: string;
}

export interface Lease {
  id: string;
  unitId: string;
  tenantId: string;
  rentAmount: number;
  // Added deposit management properties to Lease interface
  depositAmount?: number;
  startDate: string;
  endDate?: string;
  status: 'Active' | 'Terminated' | 'Pending';
  isRefunded?: boolean;
  depositExpenses?: number;
  depositReceipts?: string[];
}

export enum InvoiceStatus {
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  OVERDUE = 'OVERDUE',
  DUE = 'DUE'
}

export interface Invoice {
  id: string;
  leaseId: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  period: string;
  status: InvoiceStatus;
  rentAmount?: number;
  utilityAmount?: number;
  overdueAmount?: number;
  penaltyAmount?: number;
}

// Added PaymentCategory type for transaction auditing
export type PaymentCategory = 'RENT' | 'UTILITY' | 'DEPOSIT' | 'UNALLOCATED';

// Added PaymentSplit interface for multi-category reconciliation
export interface PaymentSplit {
  id: string;
  category: PaymentCategory;
  amount: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  reference: string;
  paidAt: string;
  status: 'Matched' | 'Unmatched';
  isHeld?: boolean;
  holdReason?: string;
  // Added splits to support complex payment allocation
  splits?: PaymentSplit[];
}

// Added RequestActionType for system workflow identification
export type RequestActionType = 
  | 'PROPERTY_ACTIVATE' 
  | 'PROPERTY_UPDATE' 
  | 'DELETE' 
  | 'WITHDRAW_FUNDS' 
  | 'ASSIGN_ROLE'
  | string;

export interface SystemRequest {
  id: string;
  // Updated actionType to use RequestActionType
  actionType: RequestActionType;
  requestedByUserId: string;
  requestedByUserName: string;
  targetId: string;
  targetType: string;
  payload: any;
  createdAt: string;
}

export interface CustomerRequest {
  id: string;
  type: 'TOUR' | 'QUERY';
  name: string;
  email: string;
  phone?: string;
  propertyName?: string;
  message: string;
  status: 'NEW' | 'CONTACTED' | 'RESOLVED';
  createdAt: string;
}

// Added Landlord interface for property owner profiles
export interface Landlord {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  idNumber: string;
  verifiedStatus: 'VERIFIED' | 'PENDING' | 'REJECTED' | string;
}

// Added FinancialStatementEntry for ledger history tracking
export interface FinancialStatementEntry {
  id: string;
  userId: string;
  date: string;
  description: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
}

// Added MaintenanceRecord for service audit trail
export interface MaintenanceRecord {
  id: string;
  date: string;
  propertyId: string;
  unitId: string;
  serviceDescription: string;
  provider: string;
  cost: number;
  status: 'Completed' | 'Pending';
}
