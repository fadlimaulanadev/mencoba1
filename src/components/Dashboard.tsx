import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Users, CheckCircle, TrendingUp, Clock, User } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getDashboardStats, getRecentActivities, getWeeklyChartData, getMonthlyChartData, getDashboardStudents } from '../lib/api-client';

interface DashboardProps {
  role: 'admin' | 'pembimbing' | 'mahasiswa';
  user?: any;
}

export function Dashboard({ role, user }: DashboardProps) {
  const [stats, setStats] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any>({ pieData: [], total: 0 });
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const roleUpper = role.toUpperCase();
        const userId = user?.id;
        const supervisorId = role === 'pembimbing' ? user?.id : undefined;

        // Load all data in parallel
        const [dashboardStats, recentActivities, weekly, monthly] = await Promise.all([
          getDashboardStats(userId, roleUpper),
          getRecentActivities(10),
          getWeeklyChartData(userId, roleUpper, supervisorId),
          getMonthlyChartData(userId, roleUpper, supervisorId)
        ]);

        setStats(dashboardStats);
        setActivities(recentActivities);
        setWeeklyData(weekly);
        setMonthlyData(monthly);

        // Load students list for pembimbing/admin
        if (role !== 'mahasiswa') {
          const studentList = await getDashboardStudents(roleUpper, supervisorId);
          setStudents(studentList);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Fallback to empty data
        setStats(getMockStats(role));
        setWeeklyData([]);
        setMonthlyData({ pieData: [], total: 0 });
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [role, user]);

  const getMockStats = (role: string) => {
    if (role === 'mahasiswa') {
      return { totalAttendance: 0, monthlyAttendance: 0, totalLeave: 0, attendancePercentage: 0 };
    }
    return { totalStudents: 0, todayPresent: 0, todayLeave: 0, monthlyPercentage: 0 };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Memuat data dashboard...</p>
        </div>
      </div>
    );
  }

  // Stats cards based on role
  const statsCards = role === 'mahasiswa' ? [
    { title: 'Total Kehadiran', value: stats?.totalAttendance?.toString() || '0', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
    { title: 'Kehadiran Bulan Ini', value: stats?.monthlyAttendance?.toString() || '0', icon: TrendingUp, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { title: 'Total Izin', value: stats?.totalLeave?.toString() || '0', icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    { title: 'Persentase Hadir', value: `${stats?.attendancePercentage || 0}%`, icon: TrendingUp, color: 'text-primary', bgColor: 'bg-primary/10' },
  ] : [
    { title: role === 'pembimbing' ? 'Mahasiswa Bimbingan' : 'Total Mahasiswa', value: stats?.totalStudents?.toString() || '0', icon: Users, color: 'text-primary', bgColor: 'bg-primary/10' },
    { title: 'Hadir Hari Ini', value: stats?.todayPresent?.toString() || '0', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
    { title: 'Izin Hari Ini', value: stats?.todayLeave?.toString() || '0', icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    { title: 'Kehadiran Bulan Ini', value: `${stats?.monthlyPercentage || 0}%`, icon: TrendingUp, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  ];

  // Chart title based on role
  const getChartTitle = () => {
    if (role === 'mahasiswa') return 'Grafik Kehadiran Anda';
    if (role === 'pembimbing') return 'Grafik Kehadiran Mahasiswa Bimbingan';
    return 'Grafik Kehadiran Semua Mahasiswa';
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      'PRESENT': { label: 'Hadir', className: 'bg-green-100 text-green-700' },
      'LATE': { label: 'Terlambat', className: 'bg-yellow-100 text-yellow-700' },
      'LEAVE': { label: 'Izin', className: 'bg-blue-100 text-blue-700' },
      'SICK': { label: 'Sakit', className: 'bg-orange-100 text-orange-700' },
      'ABSENT': { label: 'Belum Absen', className: 'bg-gray-100 text-gray-700' },
    };
    const { label, className } = statusMap[status] || statusMap['ABSENT'];
    return <span className={`text-xs px-2 py-1 rounded-full ${className}`}>{label}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <h3 className="mt-2 text-2xl font-bold">{stat.value}</h3>
                  </div>
                  <div className={`${stat.bgColor} p-3 rounded-lg`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{getChartTitle()} - Mingguan</CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="hadir" fill="#0A2342" name="Hadir" />
                  <Bar dataKey="izin" fill="#1e40af" name="Izin" />
                  <Bar dataKey="alpha" fill="#dc2626" name="Alpha" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Belum ada data kehadiran minggu ini
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Persentase Kehadiran Bulan Ini</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.total > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={monthlyData.pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => value > 0 ? `${name}: ${value}%` : ''}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {monthlyData.pieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any, name: string, props: any) => [`${props.payload.count} (${value}%)`, name]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Belum ada data kehadiran bulan ini
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Student List for Pembimbing/Admin */}
      {role !== 'mahasiswa' && students.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {role === 'pembimbing' ? 'Daftar Mahasiswa Bimbingan' : 'Daftar Mahasiswa'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {students.map((student, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground">{student.badge} • {student.university || '-'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(student.todayStatus)}
                    {student.checkIn && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Masuk: {new Date(student.checkIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Aktivitas Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm text-primary">
                        {activity.user?.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{activity.user?.name || 'Unknown User'}</p>
                      <p className="text-sm text-muted-foreground">{activity.description || activity.action}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {new Date(activity.createdAt).toLocaleTimeString('id-ID', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                      Sukses
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada aktivitas
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
