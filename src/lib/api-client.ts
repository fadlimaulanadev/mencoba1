// API Client untuk komunikasi dengan backend server
// Menghubungkan frontend React dengan database MySQL melalui API

// Backend selalu HTTP (tidak perlu HTTPS untuk API internal)
const API_BASE_URL = `http://${window.location.hostname}:3002/api`;

// Helper function untuk API calls
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ===== AUTH SERVICES =====
export async function loginUser(email: string, password: string) {
  const response = await apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  
  return response.user;
}

// ===== DASHBOARD SERVICES =====
export async function getDashboardStats(userId?: string, role?: string) {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);
  if (role) params.append('role', role);
  
  return apiCall(`/dashboard/stats?${params.toString()}`);
}

export async function getRecentActivities(limit = 10) {
  return apiCall(`/dashboard/activities?limit=${limit}`);
}

export async function getActivityLogs(filters?: {
  search?: string;
  role?: string;
  action?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.role) params.append('role', filters.role);
  if (filters?.action) params.append('action', filters.action);
  if (filters?.limit) params.append('limit', filters.limit.toString());
  
  return apiCall(`/activity-logs?${params.toString()}`);
}

export async function getActivityLogStats() {
  return apiCall('/activity-logs/stats');
}

export async function getWeeklyChartData(userId?: string, role?: string, supervisorId?: string) {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);
  if (role) params.append('role', role);
  if (supervisorId) params.append('supervisorId', supervisorId);
  
  return apiCall(`/dashboard/chart/weekly?${params.toString()}`);
}

export async function getMonthlyChartData(userId?: string, role?: string, supervisorId?: string) {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);
  if (role) params.append('role', role);
  if (supervisorId) params.append('supervisorId', supervisorId);
  
  return apiCall(`/dashboard/chart/monthly?${params.toString()}`);
}

export async function getDashboardStudents(role?: string, supervisorId?: string) {
  const params = new URLSearchParams();
  if (role) params.append('role', role);
  if (supervisorId) params.append('supervisorId', supervisorId);
  
  return apiCall(`/dashboard/students?${params.toString()}`);
}

// ===== USER SERVICES =====
export async function getAllUsers() {
  return apiCall('/users');
}

export async function createUser(userData: {
  badge: string;
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: string;
  university?: string;
  department?: string;
  supervisorId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return apiCall('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

export async function updateUser(userId: string, userData: {
  badge?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  password?: string;
  role?: string;
  university?: string;
  department?: string;
  supervisorId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return apiCall(`/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  });
}

export async function deleteUser(userId: string) {
  return apiCall(`/users/${userId}`, {
    method: 'DELETE',
  });
}

// ===== ATTENDANCE SERVICES =====
export async function getTodayAttendance(userId: string) {
  return apiCall(`/attendance/today/${userId}`);
}

export async function getOfficeLocation() {
  return apiCall('/attendance/office-location');
}

export async function checkIn(userId: string, latitude: number, longitude: number) {
  return apiCall('/attendance/checkin', {
    method: 'POST',
    body: JSON.stringify({ userId, latitude, longitude }),
  });
}

export async function checkOut(userId: string, latitude: number, longitude: number) {
  return apiCall('/attendance/checkout', {
    method: 'POST',
    body: JSON.stringify({ userId, latitude, longitude }),
  });
}

export async function getAttendanceHistory(userId: string, limit = 10) {
  return apiCall(`/attendance/history/${userId}?limit=${limit}`);
}

// ===== PROFILE SERVICES =====
export async function getUserProfile(userId: string) {
  const users = await getAllUsers();
  return users.find((user: any) => user.id === userId);
}

export async function updateUserProfile(userId: string, profileData: {
  name?: string;
  phone?: string;
  address?: string;
}) {
  return updateUser(userId, profileData);
}

export async function changePassword(userId: string, passwordData: {
  currentPassword: string;
  newPassword: string;
}) {
  return apiCall(`/users/${userId}/password`, {
    method: 'PUT',
    body: JSON.stringify(passwordData),
  });
}


// ===== LEAVE REQUEST SERVICES =====
export async function createLeaveRequest(data: {
  userId: string;
  startDate: string;
  endDate: string;
  type: string;
  reason: string;
  attachment?: File | null;
}) {
  const formData = new FormData();
  formData.append('userId', data.userId);
  formData.append('startDate', data.startDate);
  formData.append('endDate', data.endDate);
  formData.append('type', data.type);
  formData.append('reason', data.reason);
  if (data.attachment) {
    formData.append('attachment', data.attachment);
  }

  const response = await fetch(`${API_BASE_URL}/leave-requests`, {
    method: 'POST',
    body: formData, // Tidak perlu Content-Type header, browser akan set otomatis
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function getLeaveRequests(userId: string) {
  return apiCall(`/leave-requests/${userId}`);
}

export async function getAllLeaveRequests(supervisorId?: string, role?: string) {
  const params = new URLSearchParams();
  if (supervisorId) params.append('supervisorId', supervisorId);
  if (role) params.append('role', role);
  const query = params.toString();
  return apiCall(`/leave-requests${query ? `?${query}` : ''}`);
}

export async function updateLeaveRequestStatus(id: string, data: {
  status: 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  rejectedReason?: string;
}) {
  return apiCall(`/leave-requests/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ===== REPORT SERVICES =====
export async function createReport(data: {
  userId: string;
  title: string;
  content?: string;
  file?: File | null;
}) {
  const formData = new FormData();
  formData.append('userId', data.userId);
  formData.append('title', data.title);
  formData.append('content', data.content || '');
  if (data.file) {
    formData.append('file', data.file);
  }

  const response = await fetch(`${API_BASE_URL}/reports`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function getReports(userId: string) {
  return apiCall(`/reports/${userId}`);
}

export async function getAllReports(supervisorId?: string, role?: string) {
  const params = new URLSearchParams();
  if (supervisorId) params.append('supervisorId', supervisorId);
  if (role) params.append('role', role);
  const query = params.toString();
  return apiCall(`/reports${query ? `?${query}` : ''}`);
}

export async function updateReportStatus(id: string, data: {
  status: 'APPROVED' | 'REVISION_NEEDED';
  reviewedBy?: string;
  feedback?: string;
}) {
  return apiCall(`/reports/${id}/review`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
