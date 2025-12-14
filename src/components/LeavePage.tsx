import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Calendar, CheckCircle, XCircle, Clock, Loader2, Eye, X, Download, FileText } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { createLeaveRequest, getLeaveRequests, getAllLeaveRequests, updateLeaveRequestStatus } from '../lib/api-client';

const API_BASE_URL = `http://${window.location.hostname}:3002`;

// Modal untuk melihat detail pengajuan izin
function DetailModal({
  isOpen,
  onClose,
  request
}: {
  isOpen: boolean;
  onClose: () => void;
  request: LeaveRequest | null;
}) {
  if (!isOpen || !request) return null;

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'SICK': 'Sakit',
      'PERSONAL': 'Izin',
      'FAMILY': 'Keluarga',
      'OFFICIAL': 'Resmi',
      'OTHER': 'Lainnya'
    };
    return typeMap[type] || type;
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      'PENDING': { label: 'Menunggu', color: 'text-yellow-600' },
      'APPROVED': { label: 'Disetujui', color: 'text-green-600' },
      'REJECTED': { label: 'Ditolak', color: 'text-red-600' }
    };
    return statusMap[status] || { label: status, color: 'text-gray-600' };
  };

  const statusInfo = getStatusLabel(request.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-4 py-3">
          <h2 className="text-base font-semibold">Detail Pengajuan Izin</h2>
        </div>
        
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Jenis Izin</p>
              <p className="text-sm font-medium">{getTypeLabel(request.type)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className={`text-sm font-medium ${statusInfo.color}`}>{statusInfo.label}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tanggal Mulai</p>
              <p className="text-sm font-medium">
                {new Date(request.startDate).toLocaleDateString('id-ID', {
                  day: 'numeric', month: 'short', year: 'numeric'
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tanggal Selesai</p>
              <p className="text-sm font-medium">
                {new Date(request.endDate).toLocaleDateString('id-ID', {
                  day: 'numeric', month: 'short', year: 'numeric'
                })}
              </p>
            </div>
          </div>
          
          <div>
            <p className="text-xs text-muted-foreground">Alasan</p>
            <p className="text-sm font-medium">{request.reason}</p>
          </div>
          
          <div>
            <p className="text-xs text-muted-foreground mb-2">Bukti</p>
            {request.attachment ? (
              <a 
                href={`${API_BASE_URL}${request.attachment}`} 
                download
                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
              >
                <FileText className="w-4 h-4" />
                <span>Download Bukti</span>
                <Download className="w-4 h-4" />
              </a>
            ) : (
              <p className="text-sm text-gray-400">Tidak ada bukti</p>
            )}
          </div>
        </div>
        
        <div className="border-t px-4 py-3">
          <Button variant="outline" onClick={onClose} className="w-full h-9 text-sm">
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}

// Modal Component untuk Form Pengajuan Izin
function LeaveFormModal({ 
  isOpen, 
  onClose,
  onSuccess,
  userId
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState('');
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setAttachment(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startDate || !endDate || !type || !reason) {
      alert('Semua field harus diisi!');
      return;
    }

    setIsLoading(true);
    try {
      const result = await createLeaveRequest({
        userId,
        startDate,
        endDate,
        type,
        reason,
        attachment
      });
      
      console.log('Result:', result);
      alert(result.message || 'Pengajuan izin berhasil dikirim!');
      
      // Reset form
      setStartDate('');
      setEndDate('');
      setType('');
      setReason('');
      setAttachment(null);
      
      // Callback untuk refresh data
      onSuccess();
      
      // Close modal
      onClose();
    } catch (err) {
      console.error('Error:', err);
      alert(err instanceof Error ? err.message : 'Gagal mengajukan izin');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Pengajuan Izin</h2>
          <p className="text-sm text-muted-foreground">Isi dengan lengkap dan jelas</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Tanggal Mulai</Label>
              <Input 
                id="startDate" 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Tanggal Selesai</Label>
              <Input 
                id="endDate" 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Jenis Izin</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Pilih jenis izin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="izin">Izin</SelectItem>
                  <SelectItem value="sakit">Sakit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="attachment">Upload Bukti (Opsional)</Label>
              <Input 
                id="attachment" 
                type="file" 
                accept="image/jpeg,image/png,image/jpg,application/pdf" 
                className="cursor-pointer" 
                onChange={handleFileChange}
              />
              <p className="text-xs text-muted-foreground">
                Format: JPG, PNG, PDF. Maks 2MB
                {attachment && <span className="text-green-600 ml-2">✓ {attachment.name}</span>}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Alasan / Keterangan</Label>
            <Textarea
              id="reason"
              placeholder="Jelaskan alasan pengajuan izin Anda..."
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-2 pt-4 border-t">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mengirim...
                </>
              ) : (
                'Ajukan Izin'
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Batal
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface LeaveRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  type: string;
  reason: string;
  status: string;
  attachment?: string;
  user?: { name: string; badge: string };
  approver?: { name: string; role: string } | null;
}

interface LeavePageProps {
  role: 'admin' | 'pembimbing' | 'mahasiswa';
}

export function LeavePage({ role }: LeavePageProps) {
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get current user from localStorage
  const getCurrentUser = () => {
    const session = localStorage.getItem('userSession');
    if (session) {
      const parsed = JSON.parse(session);
      return parsed.user;
    }
    return null;
  };

  const currentUser = getCurrentUser();

  // Load leave requests
  const loadLeaveRequests = async () => {
    setIsLoading(true);
    try {
      console.log('Loading leave requests, role:', role, 'userId:', currentUser?.id);
      if (role === 'mahasiswa' && currentUser?.id) {
        const data = await getLeaveRequests(currentUser.id);
        console.log('Leave requests for user:', data);
        setLeaveRequests(data);
      } else if (role === 'pembimbing' && currentUser?.id) {
        // Pembimbing hanya lihat izin mahasiswa yang dibimbingnya
        const data = await getAllLeaveRequests(currentUser.id, 'PEMBIMBING');
        console.log('Leave requests for supervisor:', data);
        setLeaveRequests(data);
      } else {
        // Admin lihat semua
        const data = await getAllLeaveRequests();
        console.log('All leave requests:', data);
        setLeaveRequests(data);
      }
    } catch (error) {
      console.error('Error loading leave requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLeaveRequests();
  }, [role, currentUser?.id]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Disetujui
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            <XCircle className="w-3 h-3 mr-1" />
            Ditolak
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
            <Clock className="w-3 h-3 mr-1" />
            Menunggu
          </Badge>
        );
    }
  };

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'SICK': 'Sakit',
      'PERSONAL': 'Izin',
      'FAMILY': 'Keluarga',
      'OFFICIAL': 'Resmi',
      'OTHER': 'Cuti'
    };
    return typeMap[type] || type;
  };

  // Handle view detail
  const handleViewDetail = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  // Handle approve/reject
  const handleUpdateStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await updateLeaveRequestStatus(id, { 
        status, 
        approvedBy: currentUser?.id 
      });
      loadLeaveRequests();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2>Pengajuan Izin / Sakit</h2>
          <p className="text-muted-foreground">
            {role === 'mahasiswa'
              ? 'Kelola pengajuan izin atau sakit Anda'
              : 'Kelola pengajuan izin mahasiswa magang'}
          </p>
        </div>
        {role === 'mahasiswa' && (
          <Button onClick={() => setShowModal(true)}>
            <Calendar className="w-4 h-4 mr-2" />
            Ajukan Izin
          </Button>
        )}
      </div>

      {/* Modal Detail */}
      <DetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        request={selectedRequest}
      />

      {/* Modal Form Pengajuan Izin */}
      {currentUser && (
        <LeaveFormModal 
          isOpen={showModal} 
          onClose={() => setShowModal(false)} 
          onSuccess={loadLeaveRequests}
          userId={currentUser.id}
        />
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pengajuan</p>
                <h3 className="mt-2">{leaveRequests.length}</h3>
              </div>
              <Calendar className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Disetujui</p>
                <h3 className="mt-2 text-green-600">
                  {leaveRequests.filter((r) => r.status === 'APPROVED').length}
                </h3>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Menunggu</p>
                <h3 className="mt-2 text-yellow-600">
                  {leaveRequests.filter((r) => r.status === 'PENDING').length}
                </h3>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengajuan Izin</CardTitle>
          <CardDescription>
            {role === 'mahasiswa'
              ? 'Riwayat pengajuan izin Anda'
              : 'Semua pengajuan izin mahasiswa'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2">Memuat data...</span>
            </div>
          ) : leaveRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada pengajuan izin
            </div>
          ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {role !== 'mahasiswa' && <TableHead>Nama</TableHead>}
                  <TableHead>Jenis</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Alasan</TableHead>
                  <TableHead>Bukti</TableHead>
                  <TableHead>Status</TableHead>
                  {role !== 'mahasiswa' && <TableHead>Diproses Oleh</TableHead>}
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveRequests.map((request) => (
                  <TableRow key={request.id}>
                    {role !== 'mahasiswa' && <TableCell>{request.user?.name || '-'}</TableCell>}
                    <TableCell>
                      <Badge variant="outline">{getTypeLabel(request.type)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(request.startDate).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                        })}
                        {request.startDate !== request.endDate &&
                          ` - ${new Date(request.endDate).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                          })}`}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
                    <TableCell>
                      {request.attachment ? (
                        <Badge variant="secondary" className="cursor-pointer" onClick={() => handleViewDetail(request)}>Ada</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    {role !== 'mahasiswa' && (
                      <TableCell>
                        {request.approver ? (
                          <span className="text-sm">{request.approver.name}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8"
                          onClick={() => handleViewDetail(request)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Detail
                        </Button>
                        {role !== 'mahasiswa' && request.status === 'PENDING' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 text-green-600 hover:text-green-700"
                              onClick={() => handleUpdateStatus(request.id, 'APPROVED')}
                            >
                              Setujui
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 text-red-600 hover:text-red-700"
                              onClick={() => handleUpdateStatus(request.id, 'REJECTED')}
                            >
                              Tolak
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
