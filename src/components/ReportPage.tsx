import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { FileText, Upload, Download, CheckCircle, XCircle, Clock, Loader2, Eye, RotateCcw } from 'lucide-react';
import { createReport, getReports, getAllReports, updateReportStatus } from '../lib/api-client';

const API_BASE_URL = `http://${window.location.hostname}:3002`;

interface Report {
  id: string;
  userId: string;
  title: string;
  content: string;
  status: string;
  attachment?: string;
  feedback?: string;
  submittedAt?: string;
  createdAt: string;
  user?: { name: string; badge: string };
  reviewer?: { name: string; role: string } | null;
}

// Modal sukses upload
function SuccessModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-xs animate-in fade-in zoom-in duration-200">
        <div className="p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-green-600" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Berhasil!</h3>
          <p className="text-sm text-muted-foreground">Laporan berhasil diupload!</p>
        </div>
      </div>
    </div>
  );
}

// Modal untuk input catatan revisi
function RevisionModal({
  isOpen,
  onClose,
  onSubmit,
  reportTitle
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: string) => void;
  reportTitle: string;
}) {
  const [feedback, setFeedback] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!feedback.trim()) {
      alert('Catatan revisi harus diisi!');
      return;
    }
    onSubmit(feedback);
    setFeedback('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <RotateCcw className="w-6 h-6 text-orange-600" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-lg">Minta Revisi</h3>
              <p className="text-sm text-muted-foreground truncate">{reportTitle}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="feedback">Catatan Revisi</Label>
            <Textarea
              id="feedback"
              placeholder="Jelaskan apa yang perlu diperbaiki..."
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="resize-none"
              autoFocus
            />
          </div>
        </div>
        
        <div className="flex gap-3 justify-end px-6 py-4 bg-gray-50 rounded-b-xl border-t">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button variant="destructive" onClick={handleSubmit}>
            Kirim Revisi
          </Button>
        </div>
      </div>
    </div>
  );
}

// Modal untuk melihat detail laporan
function ReportDetailModal({
  isOpen,
  onClose,
  report
}: {
  isOpen: boolean;
  onClose: () => void;
  report: Report | null;
}) {
  if (!isOpen || !report) return null;

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      'SUBMITTED': { label: 'Menunggu Review', color: 'text-yellow-600' },
      'APPROVED': { label: 'Disetujui', color: 'text-green-600' },
      'REVISION_NEEDED': { label: 'Perlu Revisi', color: 'text-red-600' },
      'DRAFT': { label: 'Draft', color: 'text-gray-600' }
    };
    return statusMap[status] || { label: status, color: 'text-gray-600' };
  };

  const statusInfo = getStatusLabel(report.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-4 py-3">
          <h2 className="text-base font-semibold">Detail Laporan</h2>
        </div>
        
        <div className="p-4 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Judul</p>
            <p className="text-sm font-medium">{report.title}</p>
          </div>
          
          {report.content && (
            <div>
              <p className="text-xs text-muted-foreground">Deskripsi</p>
              <p className="text-sm">{report.content}</p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Tanggal</p>
              <p className="text-sm font-medium">
                {new Date(report.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric', month: 'short', year: 'numeric'
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className={`text-sm font-medium ${statusInfo.color}`}>{statusInfo.label}</p>
            </div>
          </div>
          
          {report.feedback && (
            <div>
              <p className="text-xs text-muted-foreground">Catatan Reviewer</p>
              <p className="text-sm text-red-600">{report.feedback}</p>
            </div>
          )}
          
          <div>
            <p className="text-xs text-muted-foreground mb-2">File Laporan</p>
            {report.attachment ? (
              <a 
                href={`${API_BASE_URL}${report.attachment}`} 
                download
                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
              >
                <FileText className="w-4 h-4" />
                <span>Download File</span>
                <Download className="w-4 h-4" />
              </a>
            ) : (
              <p className="text-sm text-gray-400">Tidak ada file</p>
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

// Modal untuk upload laporan
function ReportFormModal({
  isOpen,
  onClose,
  onSuccess,
  userId,
  onUploadSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  onUploadSuccess: () => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title) {
      alert('Judul laporan harus diisi!');
      return;
    }
    
    if (!file) {
      alert('File laporan harus diupload!');
      return;
    }

    setIsLoading(true);
    try {
      await createReport({ userId, title, content, file });
      
      // Reset form
      setTitle('');
      setContent('');
      setFile(null);
      
      onSuccess();
      onClose();
      onUploadSuccess(); // Show success modal
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal upload laporan');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Upload Laporan</h2>
          <p className="text-sm text-muted-foreground">Isi dengan lengkap dan jelas</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Judul Laporan</Label>
            <Input
              id="title"
              placeholder="Contoh: Laporan Mingguan - Minggu ke-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Deskripsi</Label>
            <Textarea
              id="content"
              placeholder="Tambahkan deskripsi singkat tentang laporan ini..."
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">File Laporan (PDF)</Label>
            <Input 
              id="file" 
              type="file" 
              accept=".pdf" 
              className="cursor-pointer"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-muted-foreground">
              Format: PDF. Maksimal 10MB
              {file && <span className="text-green-600 ml-2">✓ {file.name}</span>}
            </p>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button type="submit" disabled={isLoading || !file || !title}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mengupload...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Laporan
                </>
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

interface ReportPageProps {
  role: 'admin' | 'pembimbing' | 'mahasiswa';
}

export function ReportPage({ role }: ReportPageProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const getCurrentUser = () => {
    const session = localStorage.getItem('userSession');
    if (session) {
      return JSON.parse(session).user;
    }
    return null;
  };

  const currentUser = getCurrentUser();

  const loadReports = async () => {
    setIsLoading(true);
    try {
      if (role === 'mahasiswa' && currentUser?.id) {
        const data = await getReports(currentUser.id);
        setReports(data);
      } else if (role === 'pembimbing' && currentUser?.id) {
        // Pembimbing hanya lihat laporan mahasiswa yang dibimbingnya
        const data = await getAllReports(currentUser.id, 'PEMBIMBING');
        setReports(data);
      } else {
        // Admin lihat semua
        const data = await getAllReports();
        setReports(data);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [role, currentUser?.id]);

  const handleReview = async (id: string, status: 'APPROVED' | 'REVISION_NEEDED', feedback?: string) => {
    try {
      await updateReportStatus(id, { status, reviewedBy: currentUser?.id, feedback });
      loadReports();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleViewDetail = (report: Report) => {
    setSelectedReport(report);
    setShowDetailModal(true);
  };

  const handleOpenRevision = (report: Report) => {
    setSelectedReport(report);
    setShowRevisionModal(true);
  };

  const handleSubmitRevision = async (feedback: string) => {
    if (selectedReport) {
      await handleReview(selectedReport.id, 'REVISION_NEEDED', feedback);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Disetujui
          </Badge>
        );
      case 'REVISION_NEEDED':
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            <XCircle className="w-3 h-3 mr-1" />
            Perlu Revisi
          </Badge>
        );
      case 'SUBMITTED':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
            <Clock className="w-3 h-3 mr-1" />
            Menunggu Review
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
            <Clock className="w-3 h-3 mr-1" />
            Draft
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2>Laporan Magang</h2>
          <p className="text-muted-foreground">
            {role === 'mahasiswa'
              ? 'Upload dan kelola laporan magang Anda'
              : 'Review dan kelola laporan mahasiswa'}
          </p>
        </div>
        {role === 'mahasiswa' && (
          <Button onClick={() => setShowModal(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Upload Laporan
          </Button>
        )}
      </div>

      {/* Modal Form */}
      {currentUser && (
        <ReportFormModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={loadReports}
          userId={currentUser.id}
          onUploadSuccess={() => setShowSuccessModal(true)}
        />
      )}

      {/* Modal Sukses */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
      />

      {/* Modal Detail */}
      <ReportDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        report={selectedReport}
      />

      {/* Modal Revisi */}
      <RevisionModal
        isOpen={showRevisionModal}
        onClose={() => setShowRevisionModal(false)}
        onSubmit={handleSubmitRevision}
        reportTitle={selectedReport?.title || ''}
      />

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Laporan</CardTitle>
          <CardDescription>
            {role === 'mahasiswa' ? 'Riwayat laporan Anda' : 'Semua laporan mahasiswa'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2">Memuat data...</span>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada laporan
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {role !== 'mahasiswa' && <TableHead>Mahasiswa</TableHead>}
                    <TableHead>Judul</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    {role !== 'mahasiswa' && <TableHead>Reviewer</TableHead>}
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      {role !== 'mahasiswa' && <TableCell>{report.user?.name || '-'}</TableCell>}
                      <TableCell className="max-w-xs">
                        <div>
                          <p className="font-medium truncate">{report.title}</p>
                          {report.content && (
                            <p className="text-xs text-muted-foreground truncate">{report.content}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(report.createdAt).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getStatusBadge(report.status)}
                          {report.feedback && (
                            <p className="text-xs text-muted-foreground">{report.feedback}</p>
                          )}
                        </div>
                      </TableCell>
                      {role !== 'mahasiswa' && (
                        <TableCell>
                          {report.reviewer ? (
                            <span className="text-sm">{report.reviewer.name}</span>
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
                            onClick={() => handleViewDetail(report)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Detail
                          </Button>
                          {role !== 'mahasiswa' && report.status === 'SUBMITTED' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-8 text-green-600 hover:text-green-700"
                                onClick={() => handleReview(report.id, 'APPROVED')}
                              >
                                Setujui
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-8 text-red-600 hover:text-red-700"
                                onClick={() => handleOpenRevision(report)}
                              >
                                Revisi
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
