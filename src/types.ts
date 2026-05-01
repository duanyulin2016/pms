export type PassportStatus = 'IN_VAULT' | 'CHECKED_OUT';

export interface PassportLog {
  id: string;
  action: 'ENTRY' | 'CHECKOUT' | 'RETURN';
  timestamp: string;
  operator: string;
  borrowerName?: string;
  borrowerSignature?: string;
}

export interface PassportRecord {
  id: string;
  passportId: string;
  name: string;
  issueDate: string;
  expiryDate: string;
  entryTime: string;
  exitTime?: string;
  borrowerName?: string;
  borrowerSignature?: string;
  history?: PassportLog[];
  status: PassportStatus;
  operator: string;
}

export interface User {
  id: string;
  username: string; // 也是真实姓名
  phone: string;
  email: string;
  password?: string; // 只有本地存储包含
  role: 'admin' | 'staff';
  status: 'pending' | 'approved';
}

export interface UserActionLog {
  id: string;
  operatorId: string;
  operatorName: string;
  targetUserId: string;
  targetUserName: string;
  action: 'ROLE_CHANGE' | 'PASSWORD_RESET' | 'USER_DELETE' | 'USER_APPROVE';
  details: string;
  timestamp: string;
}
