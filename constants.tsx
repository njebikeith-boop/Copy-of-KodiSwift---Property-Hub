
import { Property, Unit, Tenant, Lease, Invoice, InvoiceStatus, Payment, UserRole, User, PropertyCategory, Landlord } from './types';

export const CURRENT_USER: User = {
  id: 'u-keith',
  name: 'Njebi Keith',
  role: UserRole.SUPER_ADMIN,
  email: 'assignment.post001@gmail.com',
  status: 'VERIFIED',
  jobDescription: 'System owner with total security clearance.'
};

export const KENYAN_COUNTIES = [
  "Mombasa", "Kwale", "Kilifi", "Tana River", "Lamu", "Taita Taveta",
  "Garissa", "Wajir", "Mandera", "Marsabit", "Isiolo", "Meru",
  "Tharaka-Nithi", "Embu", "Kitui", "Machakos", "Makueni", "Nyandarua",
  "Nyeri", "Kirinyaga", "Murang'a", "Kiambu", "Turkana", "West Pokot",
  "Samburu", "Trans-Nzoia", "Uasin Gishu", "Elgeyo-Marakwet", "Nandi",
  "Baringo", "Laikipia", "Nakuru", "Narok", "Kajiado", "Kericho",
  "Bomet", "Kakamega", "Vihiga", "Bungoma", "Busia", "Siaya",
  "Kisumu", "Homa Bay", "Migori", "Kisii", "Nyamira", "Nairobi"
];

export const MOCK_LANDLORDS: Landlord[] = [
  { id: 'lnd1', name: 'Dr. Samuel Gichuru', email: 'samuel.gichuru@owners.com', phoneNumber: '0711111111', idNumber: '12345678', verifiedStatus: 'VERIFIED' },
  { id: 'lnd2', name: 'Alice Mutoni', email: 'alice.mutoni@invest.ke', phoneNumber: '0722222222', idNumber: '87654321', verifiedStatus: 'VERIFIED' },
  { id: 'lnd3', name: 'Westside Holdings Ltd', email: 'admin@westside.co.ke', phoneNumber: '020-555-000', idNumber: 'CPR/2022/99', verifiedStatus: 'VERIFIED' }
];

export const MOCK_PROPERTIES: Property[] = [
  { 
    id: 'p1', name: 'Zinnia Apartments', location: 'Nairobi', totalUnits: 12, category: PropertyCategory.RENTAL, isManaged: true, description: 'Modern units with premium finishes.', ownerId: 'lnd1', defaultDueDateDay: 10
  },
  { 
    id: 'p2', name: 'Valley View Heights', location: 'Kiambu', totalUnits: 24, category: PropertyCategory.RENTAL, isManaged: true, description: 'Scenic views of the valley.', ownerId: 'lnd2', defaultDueDateDay: 10
  }
];

export const MOCK_TENANTS: Tenant[] = [
  { id: 't1', name: 'Jane Wambui', phoneNumber: '0712345678', email: 'jane@example.com', idNumber: '33445566', paymentCode: 'KS-1001' },
  { id: 't2', name: 'John Doe', phoneNumber: '0722334455', email: 'john@example.com', idNumber: '22112233', paymentCode: 'KS-1002' },
];

export const MOCK_UNITS: Unit[] = [
  // Fixed property name from previousReading to correctly match Unit interface
  { id: 'u101', propertyId: 'p1', unitNumber: 'A1', type: '2 Bedroom', isOccupied: true, previousReading: 120, currentReading: 145 },
  { id: 'u102', propertyId: 'p1', unitNumber: 'A2', type: '1 Bedroom', isOccupied: true, previousReading: 85, currentReading: 110 },
];

export const MOCK_LEASES: Lease[] = [
  // Fixed property name from depositAmount to correctly match Lease interface
  { id: 'l1', unitId: 'u101', tenantId: 't1', rentAmount: 45000, depositAmount: 45000, startDate: '2023-01-01', status: 'Active' },
  { id: 'l2', unitId: 'u102', tenantId: 't2', rentAmount: 30000, depositAmount: 30000, startDate: '2023-05-15', status: 'Active' },
];

export const MOCK_INVOICES: Invoice[] = [
  { id: 'inv1', leaseId: 'l1', amount: 48000, rentAmount: 45000, utilityAmount: 3000, overdueAmount: 0, paidAmount: 48000, dueDate: '2024-05-05', period: 'May 2024', status: InvoiceStatus.PAID },
];

export const MOCK_PAYMENTS: Payment[] = [
  { id: 'pay1', invoiceId: 'inv1', amount: 48000, method: 'M-Pesa', reference: 'QWERT12345', paidAt: '2024-05-01', status: 'Matched' },
];
