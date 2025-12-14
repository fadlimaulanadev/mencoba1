import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Phone, MapPin, Lock, Edit, Loader2, Mail } from 'lucide-react';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { updateUser, changePassword, getAllUsers } from '../lib/api-client';

interface ProfilePageProps {
  role: 'admin' | 'pembimbing' | 'mahasiswa';
}

export function ProfilePage({ role }: ProfilePageProps) {
  const [editMode, setEditMode] = useState(false);
  const [showEditButtons, setShowEditButtons] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileUpdateKey, setProfileUpdateKey] = useState(0);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    university: '',
    major: '',
    semester: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Get current user from session
  const getCurrentUser = () => {
    const savedSession = localStorage.getItem('userSession');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        return session.user;
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    }
    return null;
  };

  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const currentUser = getCurrentUser();
        
        if (!currentUser) {
          toast.error('User session tidak ditemukan');
          return;
        }

        // Fetch fresh user data from API using api-client
        const allUsers = await getAllUsers();
        
        let userData = allUsers.find((user: any) => user.id === currentUser.id);
        
        // If not found by ID, try to find by email as fallback
        if (!userData && currentUser.email) {
          userData = allUsers.find((user: any) => user.email === currentUser.email);
        }
        
        if (!userData) {
          throw new Error('User data not found. Please logout and login again.');
        }

        // Use fresh data from API
        const profileData = {
          ...userData,
          phone: userData.phone || '',
          address: userData.address || '',
          major: userData.major || '',
          semester: userData.semester || '',
          position: userData.position || '',
          joinDate: userData.joinDate || null,
          supervisor: userData.supervisor || null,
          _count: userData._count || { students: 0 }
        };
        
        setProfile(profileData);
        setFormData({
          name: profileData.name || '',
          phone: profileData.phone || '',
          address: profileData.address || '',
          university: profileData.university || '',
          major: profileData.major || '',
          semester: profileData.semester || ''
        });
      } catch (error) {
        console.error('Error loading profile:', error);
        toast.error('Gagal memuat data profil: ' + (error.message || 'Unknown error'));
        
        // If it's a session issue, suggest logout
        if (error.message && error.message.includes('Please logout')) {
          toast.error('Session kadaluarsa. Silakan logout dan login ulang.', {
            duration: 5000,
            action: {
              label: 'Logout',
              onClick: () => {
                localStorage.removeItem('userSession');
                window.location.reload();
              }
            }
          });
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async () => {
    if (saving) return; // Prevent double clicks
    
    setSaving(true);
    
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        toast.error('User session tidak ditemukan');
        return;
      }

      // Validate form data
      if (!formData.name.trim()) {
        toast.error('Nama tidak boleh kosong');
        return;
      }

      console.log('💾 Saving profile changes to database...');
      console.log('📝 Data to save:', formData);
      console.log('👤 User ID:', currentUser.id);
      
      // Use the updateUser function from api-client
      const updatedUser = await updateUser(currentUser.id, {
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
      });

      console.log('✅ Profile updated in database:', updatedUser);
      
      // Update profile state with fresh data
      setProfile((prevProfile: any) => ({
        ...prevProfile,
        name: updatedUser.name,
        phone: updatedUser.phone,
        address: updatedUser.address,
      }));
      
      // Force component re-render
      setProfileUpdateKey(prev => prev + 1);

      // Update session data
      const savedSession = localStorage.getItem('userSession');
      if (savedSession) {
        const session = JSON.parse(savedSession);
        session.user = { 
          ...session.user, 
          name: updatedUser.name,
          phone: updatedUser.phone,
          address: updatedUser.address,
        };
        localStorage.setItem('userSession', JSON.stringify(session));
      }

      // Hide edit buttons and show success message
      setEditMode(false);
      setShowEditButtons(false);
      
      toast.success('✅ Profil berhasil diperbarui!', {
        description: 'Data profil Anda telah disimpan ke database MySQL'
      });
      
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      toast.error('Gagal menyimpan profil', {
        description: error.message || 'Terjadi kesalahan saat menyimpan data'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (changingPassword) {
      return;
    }
    
    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Semua field password harus diisi');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Konfirmasi password tidak sesuai');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password baru minimal 6 karakter');
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
      toast.error('User session tidak ditemukan');
      return;
    }
    
    setChangingPassword(true);
    
    try {
      // Call API to change password using api-client
      await changePassword(currentUser.id, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      // Reset form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      toast.success('✅ Password berhasil diubah!');
      
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Gagal mengubah password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Memuat data profil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Data profil tidak ditemukan</p>
          <p className="text-sm text-muted-foreground">
            Kemungkinan session Anda sudah kadaluarsa. Silakan logout dan login ulang.
          </p>
          <Button 
            onClick={() => {
              localStorage.removeItem('userSession');
              window.location.reload();
            }}
            variant="outline"
          >
            Logout dan Login Ulang
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2>Profil Pengguna</h2>
        <p className="text-muted-foreground">Kelola informasi profil dan pengaturan akun Anda</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-1 transition-all duration-300" key={`profile-card-${profileUpdateKey}`}>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {profile.name.split(' ').map((n: string) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div>
                <h3>{profile?.name || 'Loading...'}</h3>
                <p className="text-sm text-muted-foreground capitalize">{role}</p>
                <p className="text-sm text-muted-foreground mt-1">{profile?.badge}</p>
              </div>
              <Separator />
              <div className="w-full space-y-3 text-left">
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{profile.phone || 'Tidak ada'}</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <span className="flex-1">{profile.address || 'Tidak ada'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="flex-1">{profile.email || 'Tidak ada'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Informasi Detail</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="personal">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="personal">Data Pribadi</TabsTrigger>
                <TabsTrigger value="security">Keamanan</TabsTrigger>
              </TabsList>
              
              <TabsContent value="personal" className="space-y-4 mt-4">
                {/* Edit Profile Button - Only in Data Pribadi tab */}
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Data Pribadi</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newEditMode = !editMode;
                      setEditMode(newEditMode);
                      setShowEditButtons(newEditMode);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {editMode ? 'Batal Edit' : 'Edit Profil'}
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Lengkap</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="badge">Badge / NIM</Label>
                    <Input
                      id="badge"
                      value={profile.badge || ''}
                      disabled
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="phone">No. Telepon</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      disabled={!editMode}
                      placeholder="Masukkan nomor telepon"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Alamat</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    disabled={!editMode}
                    placeholder="Masukkan alamat lengkap"
                  />
                </div>

                <Separator />

                {role === 'mahasiswa' && (
                  <div className="space-y-4">
                    <h4>Informasi Magang</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="university">Universitas</Label>
                        <Input
                          id="university"
                          value={editMode ? formData.university : (profile.university || '')}
                          onChange={(e) => handleInputChange('university', e.target.value)}
                          disabled={!editMode}
                          placeholder="Masukkan nama universitas"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="major">Jurusan</Label>
                        <Input
                          id="major"
                          value={editMode ? formData.major : (profile.major || '')}
                          onChange={(e) => handleInputChange('major', e.target.value)}
                          disabled={!editMode}
                          placeholder={editMode ? "Masukkan jurusan" : "Belum diisi"}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="semester">Semester</Label>
                        <Input
                          id="semester"
                          value={editMode ? formData.semester : (profile.semester || '')}
                          onChange={(e) => handleInputChange('semester', e.target.value)}
                          disabled={!editMode}
                          placeholder={editMode ? "Masukkan semester" : "Belum diisi"}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="supervisor">Pembimbing</Label>
                        <Input
                          id="supervisor"
                          value={profile.supervisor?.name || 'Belum ditentukan'}
                          disabled
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Periode Magang</Label>
                        <Input
                          value={
                            profile.startDate && profile.endDate
                              ? `${new Date(profile.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} - ${new Date(profile.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
                              : profile.startDate
                              ? `Mulai: ${new Date(profile.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
                              : 'Belum ditentukan'
                          }
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                )}

                {(role === 'pembimbing' || role === 'admin') && (
                  <div className="space-y-4">
                    <h4>Informasi Pekerjaan</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="department">Departemen</Label>
                        <Input
                          id="department"
                          value={profile.department || ''}
                          disabled
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="position">Posisi</Label>
                        <Input
                          id="position"
                          value={profile.position || ''}
                          disabled
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="joinDate">Tanggal Bergabung</Label>
                        <Input
                          id="joinDate"
                          value={profile.joinDate ? new Date(profile.joinDate).toLocaleDateString('id-ID') : ''}
                          disabled
                        />
                      </div>
                      {role === 'pembimbing' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="students">Mahasiswa Bimbingan</Label>
                            <Input
                              id="students"
                              value={`${profile._count?.students || 0} Mahasiswa`}
                              disabled
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="certification">Sertifikasi</Label>
                            <Input
                              id="certification"
                              value="Certified Production Manager"
                              disabled
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {(showEditButtons === true && editMode === true) && (
                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditMode(false);
                        setShowEditButtons(false);
                        // Reset form data
                        setFormData({
                          name: profile.name || '',
                          phone: profile.phone || '',
                          address: profile.address || '',
                          university: profile.university || '',
                          major: profile.major || '',
                          semester: profile.semester || ''
                        });
                      }}
                      disabled={saving}
                    >
                      Batal
                    </Button>
                    <Button 
                      onClick={handleSaveProfile}
                      disabled={saving}
                    >
                      {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="security" className="space-y-4 mt-4">
                {/* Security Header - No edit button here */}
                <div>
                  <h4 className="font-medium">Ubah Password</h4>
                  <p className="text-sm text-muted-foreground">
                    Perbarui password Anda secara berkala untuk keamanan akun
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Password Saat Ini</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      placeholder="Masukkan password saat ini"
                      value={passwordData.currentPassword}
                      onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Password Baru</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Minimal 6 karakter"
                      value={passwordData.newPassword}
                      onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                      minLength={6}
                    />
                    {passwordData.newPassword && passwordData.newPassword.length < 6 && (
                      <p className="text-xs text-red-500">Password minimal 6 karakter</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Masukkan ulang password baru"
                      value={passwordData.confirmPassword}
                      onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                    onClick={handleChangePassword}
                    disabled={changingPassword}
                  >
                    {changingPassword ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Lock className="w-4 h-4 mr-2" />
                    )}
                    Ubah Password
                  </button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
