export interface Admin {
  id: string;
  username: string;
  isActive: boolean;
  failedLoginAttempts: number;
  lockUntil: Date | null;
  lastLoginAt?: Date | null;
  lastLoginIp?: string | null;
  passwordChangedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminPayload {
  sub: string;
  username: string;
  role: 'admin';
}

export interface DashboardStats {
  totalEntries: number;
  publishedEntries: number;
  shadowHiddenEntries: number;
  removedEntries: number;
  totalReports: number;
  totalHelpful: number;
  reportsToday: number;
  submissionsToday: number;
}
