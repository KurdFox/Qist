export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  idNumber: string;
  emoji?: string;
  createdAt: string;
  createdBy: string;
}

export interface Loan {
  id: string;
  customerId: string;
  itemName: string;
  totalAmount: number;
  downPayment: number;
  remainingAmount: number;
  monthsCount: number;
  monthlyInstallment: number;
  startDate: string;
  status: 'active' | 'completed';
  createdAt: string;
  createdBy: string;
}

export interface Installment {
  id: string;
  loanId: string;
  customerId: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid';
  paidAt?: string;
  createdBy: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
