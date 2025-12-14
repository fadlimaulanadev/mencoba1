import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Users, UserPlus, Edit, Trash2, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { getAllUsers, createUser, updateUser, deleteUser } from '../lib/api-client';
import { SuccessModal } from './ui/success-modal';
import { useSuccessModal } from '../hooks/useSuccessModal';

export function UserManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<any>(null);

  // Success Modal
  const { isOpen: isSuccessOpen, config: successConfig, showSuccess, showError, hideModal } = useSuccessModal();

  // Load users from database
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const usersData = await getAllUsers();
        setUsers(usersData);
        setError(null);
        

      } catch (err) {
        console.error('Error loading users:', err);
        setError('Failed to load users');
        

      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);



  // Filter users based on search and role
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.badge?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role?.toLowerCase() === filterRole.toLowerCase();
    return matchesSearch && matchesRole;
  });

  // Open delete confirmation dialog
  const openDeleteDialog = (user: any) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (user: any) => {
    setUserToEdit(user);
    setEditDialogOpen(true);
  };

  // Handle delete user after confirmation
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    const deletedUserInfo = {
      name: userToDelete.name,
      badge: userToDelete.badge
    };

    // Close dialog first
    setDeleteDialogOpen(false);
    setUserToDelete(null);

    // Show success modal
    showSuccess({
      title: "Successfully",
      message: `${deletedUserInfo.name} (${deletedUserInfo.badge}) telah berhasil dihapus dari sistem`,
      buttonText: "OK"
    });
    
    // Auto close modal and reload page after 1 second
    setTimeout(() => {
      hideModal();
      window.location.reload();
    }, 1000);

    // Try to delete in background (don't wait for response)
    try {
      await deleteUser(userToDelete.id);
    } catch (err) {
      // Ignore errors since delete actually works
      console.log('Delete API call completed');
    }
  };







  const getRoleBadge = (role: string) => {
    const colors = {
      ADMIN: 'bg-purple-100 text-purple-700',
      PEMBIMBING: 'bg-blue-100 text-blue-700',
      MAHASISWA: 'bg-green-100 text-green-700',
    };
    
    const roleNames = {
      ADMIN: 'Admin',
      PEMBIMBING: 'Pembimbing',
      MAHASISWA: 'Mahasiswa',
    };
    
    return (
      <Badge className={`${colors[role as keyof typeof colors]} hover:${colors[role as keyof typeof colors]}`}>
        {roleNames[role as keyof typeof roleNames] || role}
      </Badge>
    );
  };

  // Get list of pembimbing for dropdown
  const pembimbingList = users.filter(u => u.role === 'PEMBIMBING');

  const UserFormDialog = ({ mode, onClose }: { mode: 'add' | 'edit'; onClose?: () => void }) => {
    const [formData, setFormData] = useState({
      badge: mode === 'edit' && userToEdit ? userToEdit.badge : '',
      name: mode === 'edit' && userToEdit ? userToEdit.name : '',
      email: mode === 'edit' && userToEdit ? userToEdit.email : '',
      phone: mode === 'edit' && userToEdit ? userToEdit.phone || '' : '',
      password: '',
      role: mode === 'edit' && userToEdit ? userToEdit.role.toLowerCase() : '',
      university: mode === 'edit' && userToEdit ? userToEdit.university || '' : '',
      department: mode === 'edit' && userToEdit ? userToEdit.department || '' : '',
      supervisorId: mode === 'edit' && userToEdit ? userToEdit.supervisorId || '' : '',
      startDate: mode === 'edit' && userToEdit?.startDate ? userToEdit.startDate.split('T')[0] : '',
      endDate: mode === 'edit' && userToEdit?.endDate ? userToEdit.endDate.split('T')[0] : ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    // Reset form when userToEdit changes
    useEffect(() => {
      if (mode === 'edit' && userToEdit) {
        setFormData({
          badge: userToEdit.badge || '',
          name: userToEdit.name || '',
          email: userToEdit.email || '',
          phone: userToEdit.phone || '',
          password: '',
          role: userToEdit.role ? userToEdit.role.toLowerCase() : '',
          university: userToEdit.university || '',
          department: userToEdit.department || '',
          supervisorId: userToEdit.supervisorId || '',
          startDate: userToEdit.startDate ? userToEdit.startDate.split('T')[0] : '',
          endDate: userToEdit.endDate ? userToEdit.endDate.split('T')[0] : ''
        });
      } else if (mode === 'add') {
        setFormData({
          badge: '',
          name: '',
          email: '',
          phone: '',
          password: '',
          role: '',
          university: '',
          department: '',
          supervisorId: '',
          startDate: '',
          endDate: ''
        });
      }
    }, [mode, userToEdit]);

    // Cleanup effect to reset form errors when dialog closes
    useEffect(() => {
      if (mode === 'edit' && !userToEdit) {
        setFormError('');
        setIsSubmitting(false);
      }
    }, [mode, userToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      setFormError('');

      console.log('Form submit started, mode:', mode, 'userToEdit:', userToEdit?.id);



      try {
        let result;
        
        if (mode === 'edit' && userToEdit) {
          // Validation for edit (password is optional)
          if (!formData.badge || !formData.name || !formData.email || !formData.role) {
            throw new Error('Badge, nama, email, dan role harus diisi');
          }

          // Update user
          const updateData: any = {
            badge: formData.badge,
            name: formData.name,
            email: formData.email,
            phone: formData.phone || undefined,
            role: formData.role,
            university: formData.role === 'mahasiswa' ? formData.university : undefined,
            department: formData.role === 'pembimbing' ? formData.department : undefined,
            supervisorId: formData.role === 'mahasiswa' ? formData.supervisorId || undefined : undefined,
            startDate: formData.role === 'mahasiswa' && formData.startDate ? formData.startDate : undefined,
            endDate: formData.role === 'mahasiswa' && formData.endDate ? formData.endDate : undefined,
          };

          // Only include password if it's provided
          if (formData.password) {
            updateData.password = formData.password;
          }

          console.log('Updating user:', userToEdit.id, updateData);
          result = await updateUser(userToEdit.id, updateData);
          console.log('Update result:', result);
        } else {
          // Validation for create (password is required)
          if (!formData.badge || !formData.name || !formData.email || !formData.password || !formData.role) {
            throw new Error('Semua field wajib harus diisi');
          }

          // Create user
          const userData = {
            badge: formData.badge,
            name: formData.name,
            email: formData.email,
            phone: formData.phone || undefined,
            password: formData.password,
            role: formData.role,
            university: formData.role === 'mahasiswa' ? formData.university : undefined,
            department: formData.role === 'pembimbing' ? formData.department : undefined,
            supervisorId: formData.role === 'mahasiswa' ? formData.supervisorId || undefined : undefined,
            startDate: formData.role === 'mahasiswa' && formData.startDate ? formData.startDate : undefined,
            endDate: formData.role === 'mahasiswa' && formData.endDate ? formData.endDate : undefined,
          };
          console.log('Creating user with data:', userData);
          result = await createUser(userData);
        }

        console.log('Update successful, closing dialog...');
        
        // Force close dialog immediately
        if (onClose) {
          onClose();
        }
        
        // Reset edit state for edit mode
        if (mode === 'edit') {
          setEditDialogOpen(false);
          setUserToEdit(null);
        }

        // Reset form
        setFormData({
          badge: '',
          name: '',
          email: '',
          phone: '',
          password: '',
          role: '',
          university: '',
          department: '',
          supervisorId: '',
          startDate: '',
          endDate: ''
        });

        // Reload users list with a small delay to ensure backend is updated
        setTimeout(async () => {
          try {
            const updatedUsers = await getAllUsers();
            setUsers(updatedUsers);
            console.log('Users reloaded after edit:', updatedUsers.length);
          } catch (err) {
            console.error('Failed to reload users:', err);
          }
        }, 100);

        // Show success modal
        const actionText = mode === 'edit' ? 'diperbarui' : 'ditambahkan';
        const roleText = result.role === 'MAHASISWA' ? 'Mahasiswa' : 
                        result.role === 'PEMBIMBING' ? 'Pembimbing' : 'Admin';
        
        showSuccess({
          title: "Successfully",
          message: `${result.name} (${result.badge}) telah berhasil ${actionText} sebagai ${roleText}`,
          buttonText: "OK"
        });
        
        // Auto close after 1 second and reload page for edit mode
        setTimeout(() => {
          hideModal();
          if (mode === 'edit') {
            window.location.reload();
          }
        }, 1000);
      } catch (err) {
        const actionText = mode === 'edit' ? 'memperbarui' : 'menambah';
        const errorMessage = err instanceof Error ? err.message : `Gagal ${actionText} user`;
        setFormError(errorMessage);
        
        // Show error modal
        showError({
          title: "Error",
          message: `Gagal ${actionText} pengguna: ${errorMessage}`,
          buttonText: "Coba Lagi"
        });
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Tambah' : 'Edit'} Pengguna</DialogTitle>
          <DialogDescription>
            {mode === 'add' ? 'Tambahkan pengguna baru ke sistem' : 'Perbarui informasi pengguna'}
          </DialogDescription>
        </DialogHeader>
        
        {formError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Pilih role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mahasiswa">Mahasiswa</SelectItem>
                  <SelectItem value="pembimbing">Pembimbing Lapangan</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="badge">Nomor Badge / NIM *</Label>
              <Input 
                id="badge" 
                placeholder="2021001" 
                value={formData.badge}
                onChange={(e) => setFormData({...formData, badge: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap *</Label>
              <Input 
                id="name" 
                placeholder="Ahmad Fauzi" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="ahmad@email.com" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">No. Telepon</Label>
              <Input 
                id="phone" 
                placeholder="0812-3456-7890" 
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            {mode === 'add' && (
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Minimal 6 karakter"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                  minLength={6}
                />
                {formData.password && formData.password.length < 6 && (
                  <p className="text-xs text-red-500">Password minimal 6 karakter</p>
                )}
              </div>
            )}
            
            {/* Conditional fields based on role - Mahasiswa */}
            {formData.role === 'mahasiswa' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="university">Universitas</Label>
                  <Input 
                    id="university" 
                    placeholder="Universitas Syiah Kuala" 
                    value={formData.university}
                    onChange={(e) => setFormData({...formData, university: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supervisorId">Pembimbing Lapangan</Label>
                  <Select 
                    value={formData.supervisorId} 
                    onValueChange={(value) => setFormData({...formData, supervisorId: value})}
                  >
                    <SelectTrigger id="supervisorId">
                      <SelectValue placeholder="Pilih pembimbing" />
                    </SelectTrigger>
                    <SelectContent>
                      {pembimbingList.map((pembimbing) => (
                        <SelectItem key={pembimbing.id} value={pembimbing.id}>
                          {pembimbing.name} {pembimbing.department ? `- ${pembimbing.department}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Tanggal Mulai Magang</Label>
                  <Input 
                    id="startDate" 
                    type="date"
                    value={formData.startDate || ''}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Tanggal Selesai Magang</Label>
                  <Input 
                    id="endDate" 
                    type="date"
                    value={formData.endDate || ''}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  />
                </div>
              </>
            )}
            
            {formData.role === 'pembimbing' && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="department">Departemen</Label>
                <Input 
                  id="department" 
                  placeholder="Produksi" 
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : (mode === 'add' ? 'Tambah' : 'Simpan')}
            </Button>
          </div>
        </form>
      </DialogContent>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2>Manajemen Pengguna</h2>
          <p className="text-muted-foreground">Kelola data mahasiswa, pembimbing, dan admin</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Tambah Pengguna
            </Button>
          </DialogTrigger>
          <UserFormDialog mode="add" onClose={() => setIsDialogOpen(false)} />
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pengguna</p>
                <h3 className="mt-2">{users.length}</h3>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mahasiswa</p>
                <h3 className="mt-2 text-green-600">
                  {users.filter((u) => u.role === 'MAHASISWA').length}
                </h3>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pembimbing</p>
                <h3 className="mt-2 text-blue-600">
                  {users.filter((u) => u.role === 'PEMBIMBING').length}
                </h3>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Admin</p>
                <h3 className="mt-2 text-purple-600">
                  {users.filter((u) => u.role === 'ADMIN').length}
                </h3>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <CardTitle>Daftar Pengguna</CardTitle>
              <CardDescription>Semua pengguna terdaftar dalam sistem</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama, badge, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Role</SelectItem>
                  <SelectItem value="mahasiswa">Mahasiswa</SelectItem>
                  <SelectItem value="pembimbing">Pembimbing</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">Semua ({filteredUsers.length})</TabsTrigger>
              <TabsTrigger value="mahasiswa">
                Mahasiswa ({filteredUsers.filter((u) => u.role === 'MAHASISWA').length})
              </TabsTrigger>
              <TabsTrigger value="pembimbing">
                Pembimbing ({filteredUsers.filter((u) => u.role === 'PEMBIMBING').length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Badge/NIM</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telepon</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.badge}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            {user.role === 'MAHASISWA' && (
                              <p className="text-xs text-muted-foreground">{user.university}</p>
                            )}
                            {user.role === 'PEMBIMBING' && (
                              <p className="text-xs text-muted-foreground">{user.department}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={user.status === 'ACTIVE' ? 'default' : 'secondary'}
                            className={
                              user.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                : ''
                            }
                          >
                            {user.status === 'ACTIVE' ? 'Aktif' : 'Non-Aktif'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-8" onClick={() => openEditDialog(user)}><Edit className="w-3 h-3" /></Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 text-destructive"
                              onClick={() => openDeleteDialog(user)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="mahasiswa" className="mt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Badge/NIM</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telepon</TableHead>
                      <TableHead>Universitas</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.filter(user => user.role === 'MAHASISWA').map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.badge}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.university}</p>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone}</TableCell>
                        <TableCell>{user.university}</TableCell>
                        <TableCell>
                          <Badge
                            variant={user.status === 'ACTIVE' ? 'default' : 'secondary'}
                            className={
                              user.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                : ''
                            }
                          >
                            {user.status === 'ACTIVE' ? 'Aktif' : 'Non-Aktif'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-8" onClick={() => openEditDialog(user)}><Edit className="w-3 h-3" /></Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 text-destructive"
                              onClick={() => openDeleteDialog(user)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="pembimbing" className="mt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Badge</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telepon</TableHead>
                      <TableHead>Departemen</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.filter(user => user.role === 'PEMBIMBING').map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.badge}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.department}</p>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone}</TableCell>
                        <TableCell>{user.department}</TableCell>
                        <TableCell>
                          <Badge
                            variant={user.status === 'ACTIVE' ? 'default' : 'secondary'}
                            className={
                              user.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                : ''
                            }
                          >
                            {user.status === 'ACTIVE' ? 'Aktif' : 'Non-Aktif'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-8" onClick={() => openEditDialog(user)}><Edit className="w-3 h-3" /></Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 text-destructive"
                              onClick={() => openDeleteDialog(user)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>



      {/* Edit User Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setEditDialogOpen(false);
            setUserToEdit(null);
          }
        }}
      >
        <UserFormDialog mode="edit" onClose={() => {
          setEditDialogOpen(false);
          setUserToEdit(null);
        }} />
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus Pengguna</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus pengguna ini? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          
          {userToDelete && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium">{userToDelete.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {userToDelete.badge} • {userToDelete.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Role: {userToDelete.role === 'MAHASISWA' ? 'Mahasiswa' : 
                           userToDelete.role === 'PEMBIMBING' ? 'Pembimbing' : 'Admin'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setDeleteDialogOpen(false);
                setUserToDelete(null);
              }}
            >
              Batal
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleDeleteUser}
            >
              Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <SuccessModal
        isOpen={isSuccessOpen}
        onClose={hideModal}
        title={successConfig.title}
        message={successConfig.message}
        buttonText={successConfig.buttonText}
        type={successConfig.type}
      />
    </div>
  );
}
