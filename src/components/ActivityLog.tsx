import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Activity, Search, Download, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { getActivityLogs, getActivityLogStats } from '../lib/api-client';

interface ActivityLogItem {
  id: string;
  userId: string;
  action: string;
  description: string;
  ipAddress?: string;
  createdAt: string;
  user: {
    name: string;
    role: string;
  };
}

interface ActivityStats {
  total: number;
  todayCount: number;
  successCount: number;
  pendingCount: number;
}

export function ActivityLog() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [stats, setStats] = useState<ActivityStats>({ total: 0, todayCount: 0, successCount: 0, pendingCount: 0 });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [logs, statsData] = await Promise.all([
        getActivityLogs({
          search: searchTerm || undefined,
          role: filterRole !== 'all' ? filterRole : undefined,
          action: filterAction !== 'all' ? filterAction : undefined,
          limit: 100
        }),
        getActivityLogStats()
      ]);
      setActivityLogs(logs);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, filterRole, filterAction]);

  const getActionLabel = (action: string) => {
    const actionMap: Record<string, string> = {
      'CHECK_IN': 'Absen Masuk',
      'CHECK_OUT': 'Absen Keluar',
      'LOGIN': 'Login',
      'LEAVE_REQUEST': 'Pengajuan Izin',
      'USER_CREATED': 'Tambah Pengguna',
      'USER_UPDATED': 'Update Pengguna',
      'PASSWORD_CHANGED': 'Ubah Password',
      'REPORT_SUBMITTED': 'Upload Laporan',
      'REPORT_APPROVED': 'Setujui Laporan',
      'REPORT_REVISION': 'Minta Revisi',
      'REPORT_REVIEWED': 'Review Laporan',
    };
    return actionMap[action] || action;
  };

  const getStatusFromAction = (action: string) => {
    const successActions = ['CHECK_IN', 'CHECK_OUT', 'LOGIN', 'USER_CREATED', 'USER_UPDATED', 'PASSWORD_CHANGED', 'REPORT_SUBMITTED', 'REPORT_APPROVED'];
    const pendingActions = ['LEAVE_REQUEST'];
    const warningActions = ['REPORT_REVIEWED', 'REPORT_REVISION'];
    
    if (successActions.includes(action)) return 'success';
    if (pendingActions.includes(action)) return 'pending';
    if (warningActions.includes(action)) return 'warning';
    return 'success';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      success: { color: 'bg-green-100 text-green-700', label: 'Success' },
      warning: { color: 'bg-yellow-100 text-yellow-700', label: 'Warning' },
      pending: { color: 'bg-blue-100 text-blue-700', label: 'Pending' },
      error: { color: 'bg-red-100 text-red-700', label: 'Error' },
    };
    const config = statusConfig[status] || statusConfig.success;
    return (
      <Badge className={`${config.color} hover:${config.color}`}>
        {config.label}
      </Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      ADMIN: 'bg-purple-100 text-purple-700',
      PEMBIMBING: 'bg-blue-100 text-blue-700',
      MAHASISWA: 'bg-green-100 text-green-700',
    };
    const roleLabels: Record<string, string> = {
      ADMIN: 'Admin',
      PEMBIMBING: 'Pembimbing',
      MAHASISWA: 'Mahasiswa',
    };
    return (
      <Badge className={`${colors[role] || 'bg-gray-100 text-gray-700'} hover:${colors[role]}`}>
        {roleLabels[role] || role}
      </Badge>
    );
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      time: date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  };

  const handleExport = () => {
    // Create CSV content
    const headers = ['Waktu', 'Pengguna', 'Role', 'Aktivitas', 'Detail'];
    const rows = activityLogs.map(log => {
      const { date, time } = formatDateTime(log.createdAt);
      return [
        `${date} ${time}`,
        log.user.name,
        log.user.role,
        getActionLabel(log.action),
        log.description
      ];
    });
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `activity_log_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2>Log Aktivitas Sistem</h2>
          <p className="text-muted-foreground">
            Pantau semua aktivitas pengguna dalam sistem
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export Log
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Aktivitas</p>
                <h3 className="mt-2 text-2xl font-bold">{stats.total}</h3>
              </div>
              <Activity className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hari Ini</p>
                <h3 className="mt-2 text-2xl font-bold text-green-600">{stats.todayCount}</h3>
              </div>
              <Activity className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success</p>
                <h3 className="mt-2 text-2xl font-bold text-blue-600">{stats.successCount}</h3>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <h3 className="mt-2 text-2xl font-bold text-yellow-600">{stats.pendingCount}</h3>
              </div>
              <Activity className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <CardTitle>Riwayat Aktivitas</CardTitle>
                <CardDescription>Semua aktivitas sistem dalam urutan terbaru</CardDescription>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari aktivitas, pengguna, atau detail..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Role</SelectItem>
                    <SelectItem value="mahasiswa">Mahasiswa</SelectItem>
                    <SelectItem value="pembimbing">Pembimbing</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Aktivitas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Aktivitas</SelectItem>
                    <SelectItem value="absen">Absensi</SelectItem>
                    <SelectItem value="izin">Izin</SelectItem>
                    <SelectItem value="laporan">Laporan</SelectItem>
                    <SelectItem value="login">Login</SelectItem>
                    <SelectItem value="user">Manajemen User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground">Memuat data...</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Pengguna</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Aktivitas</TableHead>
                    <TableHead>Detail</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activityLogs.map((log) => {
                    const { date, time } = formatDateTime(log.createdAt);
                    const status = getStatusFromAction(log.action);
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="text-sm">
                            <div>{date}</div>
                            <div className="text-muted-foreground">{time}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{log.user.name}</TableCell>
                        <TableCell>{getRoleBadge(log.user.role)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getActionLabel(log.action)}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{log.description}</TableCell>
                        <TableCell>{getStatusBadge(status)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {!loading && activityLogs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Tidak ada log aktivitas yang sesuai dengan filter
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
