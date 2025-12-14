import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { MapPin, Clock, CheckCircle, XCircle, Loader2, Navigation, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { getTodayAttendance, checkIn, checkOut, getAttendanceHistory, getOfficeLocation } from '../lib/api-client';

// Popup Modal Component
function PopupModal({ 
  isOpen, 
  onClose, 
  type, 
  message 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  type: 'success' | 'error'; 
  message: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200">
        <div className="flex flex-col items-center text-center">
          {type === 'success' ? (
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
          )}
          <h3 className={`text-lg font-semibold mb-2 ${type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
            {type === 'success' ? 'Berhasil!' : 'Gagal!'}
          </h3>
          <p className="text-gray-600 mb-6">{message}</p>
          <Button 
            onClick={onClose}
            className={type === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
          >
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}

interface AttendancePageProps {
  user?: {
    id: string;
    name: string;
    role: string;
  };
}

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
  duration?: number;
}

interface OfficeLocation {
  latitude: number;
  longitude: number;
  name: string;
  maxDistance: number;
}

export function AttendancePage({ user }: AttendancePageProps) {
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Popup state
  const [showPopup, setShowPopup] = useState(false);
  const [popupType, setPopupType] = useState<'success' | 'error'>('success');
  const [popupMessage, setPopupMessage] = useState('');
  
  // GPS State
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [officeLocation, setOfficeLocation] = useState<OfficeLocation | null>(null);

  // Stats
  const [stats, setStats] = useState({ totalHadir: 0, totalIzin: 0 });

  // Get user from localStorage if not passed as prop
  const currentUser = user || (() => {
    const session = localStorage.getItem('userSession');
    if (session) {
      const parsed = JSON.parse(session);
      return parsed.user;
    }
    return null;
  })();

  // Haversine formula untuk menghitung jarak (untuk preview di frontend)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Get current GPS location
  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Browser tidak mendukung GPS. Gunakan browser modern.');
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        
        // Calculate distance if office location is loaded
        if (officeLocation) {
          const dist = calculateDistance(
            latitude, longitude,
            officeLocation.latitude, officeLocation.longitude
          );
          setDistance(Math.round(dist));
        }
        
        setIsGettingLocation(false);
      },
      (error) => {
        let errorMsg = 'Gagal mendapatkan lokasi GPS.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = 'Akses lokasi ditolak. Izinkan akses lokasi di browser Anda.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'Informasi lokasi tidak tersedia.';
            break;
          case error.TIMEOUT:
            errorMsg = 'Waktu permintaan lokasi habis. Coba lagi.';
            break;
        }
        setLocationError(errorMsg);
        setIsGettingLocation(false);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 0 // Selalu ambil lokasi terbaru
      }
    );
  };

  // Load office location config
  const loadOfficeLocation = async () => {
    try {
      const location = await getOfficeLocation();
      setOfficeLocation(location);
    } catch (err) {
      console.error('Error loading office location:', err);
    }
  };

  // Load attendance data
  const loadAttendanceData = async () => {
    if (!currentUser?.id) return;

    setIsLoadingData(true);
    try {
      const today = await getTodayAttendance(currentUser.id);
      console.log('Today attendance:', today);
      setTodayAttendance(today);

      const history = await getAttendanceHistory(currentUser.id, 10);
      setAttendanceHistory(history || []);

      const historyArray = history || [];
      const hadir = historyArray.filter((r: AttendanceRecord) => r.status === 'PRESENT' || r.status === 'LATE').length;
      const izin = historyArray.filter((r: AttendanceRecord) => r.status === 'LEAVE' || r.status === 'SICK').length;
      setStats({ totalHadir: hadir, totalIzin: izin });

    } catch (err) {
      console.error('Error loading attendance data:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadOfficeLocation();
    loadAttendanceData();
  }, [currentUser?.id]);

  // Auto-get location when office location is loaded
  useEffect(() => {
    if (officeLocation && !userCoords) {
      getCurrentLocation();
    }
  }, [officeLocation]);

  // Recalculate distance when coords or office location changes
  useEffect(() => {
    if (userCoords && officeLocation) {
      const dist = calculateDistance(
        userCoords.lat, userCoords.lng,
        officeLocation.latitude, officeLocation.longitude
      );
      setDistance(Math.round(dist));
    }
  }, [userCoords, officeLocation]);

  // Handle check in - kirim koordinat ke backend untuk validasi
  const handleCheckIn = async () => {
    if (!currentUser?.id) {
      setPopupType('error');
      setPopupMessage('User tidak ditemukan. Silakan login ulang.');
      setShowPopup(true);
      return;
    }

    if (!userCoords) {
      setPopupType('error');
      setPopupMessage('Lokasi GPS belum didapatkan. Klik "Ambil Lokasi GPS" terlebih dahulu.');
      setShowPopup(true);
      return;
    }

    setIsLoading(true);

    try {
      // Kirim koordinat ke backend untuk validasi
      const attendance = await checkIn(currentUser.id, userCoords.lat, userCoords.lng);
      
      // Set attendance langsung dari response untuk disable tombol
      setTodayAttendance(attendance);
      
      // Show success popup
      setPopupType('success');
      setPopupMessage(attendance.message || 'Absen masuk berhasil!');
      setShowPopup(true);
      
      // Reload history
      const history = await getAttendanceHistory(currentUser.id, 10);
      setAttendanceHistory(history || []);
      const historyArray = history || [];
      const hadir = historyArray.filter((r: AttendanceRecord) => r.status === 'PRESENT' || r.status === 'LATE').length;
      const izin = historyArray.filter((r: AttendanceRecord) => r.status === 'LEAVE' || r.status === 'SICK').length;
      setStats({ totalHadir: hadir, totalIzin: izin });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal melakukan absen masuk';
      setPopupType('error');
      setPopupMessage(errorMessage);
      setShowPopup(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle check out - kirim koordinat ke backend untuk validasi
  const handleCheckOut = async () => {
    if (!currentUser?.id) {
      setPopupType('error');
      setPopupMessage('User tidak ditemukan. Silakan login ulang.');
      setShowPopup(true);
      return;
    }

    if (!userCoords) {
      setPopupType('error');
      setPopupMessage('Lokasi GPS belum didapatkan. Klik "Ambil Lokasi GPS" terlebih dahulu.');
      setShowPopup(true);
      return;
    }

    setIsLoading(true);

    try {
      const attendance = await checkOut(currentUser.id, userCoords.lat, userCoords.lng);
      
      // Set attendance langsung dari response untuk disable tombol
      setTodayAttendance(attendance);
      
      // Show success popup
      setPopupType('success');
      setPopupMessage(attendance.message || 'Absen keluar berhasil!');
      setShowPopup(true);
      
      // Reload history
      const history = await getAttendanceHistory(currentUser.id, 10);
      setAttendanceHistory(history || []);
      const historyArray = history || [];
      const hadir = historyArray.filter((r: AttendanceRecord) => r.status === 'PRESENT' || r.status === 'LATE').length;
      const izin = historyArray.filter((r: AttendanceRecord) => r.status === 'LEAVE' || r.status === 'SICK').length;
      setStats({ totalHadir: hadir, totalIzin: izin });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal melakukan absen keluar';
      setPopupType('error');
      setPopupMessage(errorMessage);
      setShowPopup(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Format time - waktu sudah disimpan sebagai WIB di database
  const formatTime = (dateString: string | null): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    // Waktu sudah WIB di database, langsung ambil UTC values
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Format duration
  const formatDuration = (minutes: number | undefined): string => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}j ${mins}m`;
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      'PRESENT': { label: 'Hadir', className: 'bg-green-100 text-green-700 hover:bg-green-100' },
      'LATE': { label: 'Terlambat', className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' },
      'ABSENT': { label: 'Alpha', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
      'LEAVE': { label: 'Izin', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
      'SICK': { label: 'Sakit', className: 'bg-purple-100 text-purple-700 hover:bg-purple-100' },
    };
    const config = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
    return <Badge variant="secondary" className={config.className}>{config.label}</Badge>;
  };

  const currentDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const currentTime = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const hasCheckedIn = todayAttendance?.checkIn !== null && todayAttendance?.checkIn !== undefined;
  const hasCheckedOut = todayAttendance?.checkOut !== null && todayAttendance?.checkOut !== undefined;
  const isLocationValid = distance !== null && officeLocation !== null && distance <= officeLocation.maxDistance;

  return (
    <div className="space-y-6">
      {/* Popup Modal for notifications */}
      <PopupModal
        isOpen={showPopup}
        onClose={() => setShowPopup(false)}
        type={popupType}
        message={popupMessage}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Absensi Card */}
        <Card>
          <CardHeader>
            <CardTitle>Absensi Hari Ini</CardTitle>
            <CardDescription>{currentDate}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Waktu Sekarang: {currentTime}</span>
            </div>

            {/* GPS Location Section */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">Lokasi GPS</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={getCurrentLocation}
                  disabled={isGettingLocation}
                >
                  {isGettingLocation ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Navigation className="w-4 h-4 mr-2" />
                  )}
                  {isGettingLocation ? 'Mengambil...' : 'Ambil Lokasi GPS'}
                </Button>
              </div>

              {locationError && (
                <Alert className="bg-red-50 border-red-200">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <AlertDescription className="text-red-700 text-sm">{locationError}</AlertDescription>
                </Alert>
              )}

              {userCoords && distance !== null && officeLocation && (
                <div className="text-sm space-y-1">
                  <p className={`font-medium ${isLocationValid ? 'text-green-600' : 'text-red-600'}`}>
                    Jarak dari kantor: {distance} meter 
                    {isLocationValid ? ' ✓ (Valid)' : ` ✗ (Maks: ${officeLocation.maxDistance}m)`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    GPS Anda: {userCoords.lat.toFixed(6)}, {userCoords.lng.toFixed(6)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Kantor: {officeLocation.latitude}, {officeLocation.longitude}
                  </p>
                </div>
              )}
            </div>

            {/* Location Status */}
            {userCoords === null ? (
              <Alert className="bg-yellow-50 border-yellow-200">
                <MapPin className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-yellow-700">
                  Klik "Ambil Lokasi GPS" untuk mendapatkan lokasi Anda
                </AlertDescription>
              </Alert>
            ) : !officeLocation ? (
              <Alert className="bg-gray-50 border-gray-200">
                <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
                <AlertDescription className="text-gray-700">
                  Memuat konfigurasi lokasi kantor...
                </AlertDescription>
              </Alert>
            ) : distance === null ? (
              <Alert className="bg-gray-50 border-gray-200">
                <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
                <AlertDescription className="text-gray-700">
                  Menghitung jarak...
                </AlertDescription>
              </Alert>
            ) : isLocationValid ? (
              <Alert className="bg-green-50 border-green-200">
                <MapPin className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  Lokasi Valid: {officeLocation.name} ({distance}m dari kantor)
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-red-50 border-red-200">
                <MapPin className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  Lokasi Tidak Valid: Anda {distance}m dari kantor (maks: {officeLocation.maxDistance}m)
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleCheckIn}
                disabled={hasCheckedIn || !userCoords || isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading && !hasCheckedIn ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : hasCheckedIn ? (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Sudah Absen Masuk ({formatTime(todayAttendance?.checkIn || null)})
                  </>
                ) : (
                  'Absen Masuk'
                )}
              </Button>

              <Button
                onClick={handleCheckOut}
                disabled={!hasCheckedIn || hasCheckedOut || !userCoords || isLoading}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                {isLoading && hasCheckedIn && !hasCheckedOut ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : hasCheckedOut ? (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Sudah Absen Keluar ({formatTime(todayAttendance?.checkOut || null)})
                  </>
                ) : (
                  'Absen Keluar'
                )}
              </Button>
            </div>

            {hasCheckedIn && (
              <div className="bg-primary/5 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Status Hari Ini</p>
                <p className="text-primary mt-1">
                  ✓ Absen masuk: {formatTime(todayAttendance?.checkIn || null)}
                  {todayAttendance?.distance !== undefined && todayAttendance?.distance !== null && (
                    <span> ({todayAttendance.distance}m)</span>
                  )}
                </p>
                {hasCheckedOut && (
                  <p className="text-primary">
                    ✓ Absen keluar: {formatTime(todayAttendance?.checkOut || null)}
                  </p>
                )}
                {todayAttendance?.duration && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Durasi kerja: {formatDuration(todayAttendance.duration)}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Absensi GPS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Lokasi Kantor</p>
                  <p className="text-sm text-muted-foreground">
                    {officeLocation?.name || 'Loading...'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Navigation className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Radius Absensi</p>
                  <p className="text-sm text-muted-foreground">
                    Maksimal {officeLocation?.maxDistance || 50} meter dari kantor
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Jam Kerja</p>
                  <p className="text-sm text-muted-foreground">
                    Senin - Jumat: 08:00 - 17:00
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Validasi</p>
                  <p className="text-sm text-muted-foreground">
                    1 absensi per hari, waktu dari server
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-700">Total Hadir</p>
                  <p className="text-2xl text-green-600 mt-1">{stats.totalHadir}</p>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm text-yellow-700">Total Izin</p>
                  <p className="text-2xl text-yellow-600 mt-1">{stats.totalIzin}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Absensi</CardTitle>
          <CardDescription>Riwayat absensi 10 hari terakhir</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingData ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2">Memuat data...</span>
            </div>
          ) : attendanceHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada riwayat absensi
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Masuk</TableHead>
                    <TableHead>Keluar</TableHead>
                    <TableHead>Jarak</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceHistory.map((record) => {
                    // Tanggal sudah disimpan sebagai WIB di database, tidak perlu konversi
                    const date = new Date(record.date);
                    const day = date.getUTCDate();
                    const monthIndex = date.getUTCMonth();
                    const year = date.getUTCFullYear();
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                    const formattedDate = `${day} ${months[monthIndex]} ${year}`;
                    
                    return (
                    <TableRow key={record.id}>
                      <TableCell>
                        {formattedDate}
                      </TableCell>
                      <TableCell>{formatTime(record.checkIn)}</TableCell>
                      <TableCell>{formatTime(record.checkOut)}</TableCell>
                      <TableCell>{record.distance ? `${record.distance}m` : '-'}</TableCell>
                      <TableCell>{formatDuration(record.duration)}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
