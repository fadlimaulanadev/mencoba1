import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3002;

// Setup multer untuk file upload
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung. Gunakan JPG, PNG, atau PDF.'));
    }
  }
});

// Helper function untuk mendapatkan waktu WIB (UTC+7)
function getWIBTime(): Date {
  const now = new Date();
  // Tambah 7 jam untuk konversi ke WIB
  return new Date(now.getTime() + (7 * 60 * 60 * 1000));
}

// Helper function untuk mendapatkan tanggal hari ini dalam WIB (untuk field date)
function getTodayWIB(): Date {
  const wibTime = getWIBTime();
  // Ambil tanggal saja dalam format YYYY-MM-DD dan set sebagai UTC midnight
  const year = wibTime.getUTCFullYear();
  const month = String(wibTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(wibTime.getUTCDate()).padStart(2, '0');
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}

// Helper function untuk mendapatkan waktu sekarang dalam WIB (untuk field checkIn/checkOut)
function getNowWIB(): Date {
  const wib = getWIBTime();
  console.log(`⏰ getNowWIB called: ${wib.toISOString()}`);
  return wib;
}

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir)); // Serve uploaded files

// ===== AUTH ROUTES =====
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email/Badge dan password harus diisi' });
    }

    // Cari user berdasarkan email atau badge
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { badge: email }
        ]
      },
      select: {
        id: true,
        badge: true,
        name: true,
        email: true,
        role: true,
        status: true,
        university: true,
        department: true,
        password: true,
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Email/Badge atau password salah' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Email/Badge atau password salah' });
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        description: `User ${user.name} logged in`,
      }
    });

    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== USER ROUTES =====
app.get('/api/users', async (req, res) => {
  try {
    console.log('🚀 GET /api/users called - UPDATED VERSION');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        badge: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        role: true,
        status: true,
        university: true,
        major: true,
        semester: true,
        department: true,
        position: true,
        joinDate: true,
        startDate: true,
        endDate: true,
        supervisorId: true,
        createdAt: true,
        supervisor: {
          select: { name: true }
        },
        _count: {
          select: { students: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('📋 Users fetched with address field:', users.map(u => ({ name: u.name, address: u.address })));
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { badge, name, email, phone, password, role, university, department, supervisorId, startDate, endDate } = req.body;

    console.log('📝 Create user request:', { badge, name, email, role, startDate, endDate });

    // Validation
    if (!badge || !name || !email || !password || !role) {
      return res.status(400).json({ error: 'Badge, nama, email, password, dan role harus diisi' });
    }

    // Password minimum 6 characters
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter' });
    }

    // Check if badge or email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { badge },
          { email }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: existingUser.badge === badge ? 'Badge sudah digunakan' : 'Email sudah digunakan' 
      });
    }

    // Generate custom ID based on role
    let customId: string;
    const upperRole = role.toUpperCase();
    
    if (upperRole === 'PEMBIMBING') {
      // Get last pembimbing ID
      const lastPembimbing = await prisma.user.findFirst({
        where: { 
          role: 'PEMBIMBING',
          id: { startsWith: 'pg' }
        },
        orderBy: { id: 'desc' }
      });
      const lastNum = lastPembimbing ? parseInt(lastPembimbing.id.replace('pg', '')) : 0;
      customId = `pg${String(lastNum + 1).padStart(3, '0')}`;
    } else if (upperRole === 'ADMIN') {
      // Get last admin ID
      const lastAdmin = await prisma.user.findFirst({
        where: { 
          role: 'ADMIN',
          id: { startsWith: 'am' }
        },
        orderBy: { id: 'desc' }
      });
      const lastNum = lastAdmin ? parseInt(lastAdmin.id.replace('am', '')) : 0;
      customId = `am${String(lastNum + 1).padStart(3, '0')}`;
    } else {
      // Mahasiswa - generate ID dengan format ms0001, ms0002, dst
      const lastMahasiswa = await prisma.user.findFirst({
        where: { 
          role: 'MAHASISWA',
          id: { startsWith: 'ms' }
        },
        orderBy: { id: 'desc' }
      });
      const lastNum = lastMahasiswa ? parseInt(lastMahasiswa.id.replace('ms', '')) : 0;
      customId = `ms${String(lastNum + 1).padStart(4, '0')}`;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        id: customId,
        badge,
        name,
        email,
        phone: phone || null,
        password: hashedPassword,
        plainPassword: password, // Simpan password asli untuk development
        role: upperRole,
        status: 'ACTIVE',
        university: upperRole === 'MAHASISWA' ? university : null,
        department: upperRole === 'PEMBIMBING' ? department : null,
        supervisorId: upperRole === 'MAHASISWA' ? supervisorId : null,
        startDate: upperRole === 'MAHASISWA' && startDate ? new Date(startDate) : null,
        endDate: upperRole === 'MAHASISWA' && endDate ? new Date(endDate) : null,
      },
      select: {
        id: true,
        badge: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        university: true,
        department: true,
        createdAt: true,
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: newUser.id,
        action: 'USER_CREATED',
        description: `User ${newUser.name} created with role ${newUser.role}`,
      }
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { badge, name, email, phone, address, password, role, university, major, semester, department, supervisorId, startDate, endDate } = req.body;
    
    console.log('PUT /api/users/:id called with:', { id, badge, name, email, phone, address, role, university, major, semester, startDate, endDate });

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, badge: true, email: true }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    // Check if badge or email already exists (excluding current user)
    if (badge || email) {
      const duplicateUser = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                badge ? { badge } : {},
                email ? { email } : {}
              ].filter(obj => Object.keys(obj).length > 0)
            }
          ]
        }
      });

      if (duplicateUser) {
        return res.status(400).json({ 
          error: duplicateUser.badge === badge ? 'Badge sudah digunakan' : 'Email sudah digunakan' 
        });
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (badge) updateData.badge = badge;
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone || null;
    if (address !== undefined) updateData.address = address || null;
    if (university !== undefined) updateData.university = university || null;
    if (major !== undefined) updateData.major = major || null;
    if (semester !== undefined) updateData.semester = semester || null;
    if (role) {
      updateData.role = role.toUpperCase();
      updateData.university = role.toUpperCase() === 'MAHASISWA' ? university : null;
      updateData.department = role.toUpperCase() === 'PEMBIMBING' ? department : null;
      updateData.supervisorId = role.toUpperCase() === 'MAHASISWA' ? supervisorId : null;
    }
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    // Handle periode magang untuk mahasiswa
    if (startDate !== undefined) {
      updateData.startDate = startDate ? new Date(startDate) : null;
    }
    if (endDate !== undefined) {
      updateData.endDate = endDate ? new Date(endDate) : null;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        badge: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        role: true,
        status: true,
        university: true,
        major: true,
        semester: true,
        department: true,
        createdAt: true,
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: id,
        action: 'USER_UPDATED',
        description: `User ${updatedUser.name} updated`,
      }
    });

    console.log('User updated successfully:', updatedUser);
    res.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, badge: true, role: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    // Manual deletion with proper order
    try {
      // Delete related records first
      await prisma.attendance.deleteMany({ where: { userId: id } });
      await prisma.leaveRequest.deleteMany({ where: { userId: id } });
      await prisma.report.deleteMany({ where: { userId: id } });
      await prisma.activityLog.deleteMany({ where: { userId: id } });
      
      // Update supervisor relationships
      await prisma.user.updateMany({
        where: { supervisorId: id },
        data: { supervisorId: null }
      });
      
      // Finally delete the user
      await prisma.user.delete({ where: { id } });

      res.json({ 
        message: 'User berhasil dihapus',
        deletedUser: {
          id: user.id,
          name: user.name,
          badge: user.badge,
          role: user.role
        }
      });
    } catch (deleteError) {
      console.error('Detailed delete error:', deleteError);
      throw deleteError;
    }
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      error: 'Gagal menghapus user',
      details: error.message
    });
  }
});

// ===== DASHBOARD ROUTES =====
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const { userId, role } = req.query;

    if (role === 'MAHASISWA' && userId) {
      // Stats untuk mahasiswa - hanya data diri sendiri
      const totalAttendance = await prisma.attendance.count({
        where: { userId: userId as string, status: { in: ['PRESENT', 'LATE'] } }
      });
      
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      
      const monthlyAttendance = await prisma.attendance.count({
        where: {
          userId: userId as string,
          status: { in: ['PRESENT', 'LATE'] },
          date: { gte: thisMonth }
        }
      });
      
      const totalLeave = await prisma.leaveRequest.count({
        where: { userId: userId as string, status: 'APPROVED' }
      });

      // Calculate attendance percentage
      const totalWorkingDays = 22; // Approximate working days per month
      const attendancePercentage = Math.round((monthlyAttendance / totalWorkingDays) * 100);

      res.json({
        totalAttendance,
        monthlyAttendance,
        totalLeave,
        attendancePercentage
      });
    } else if (role === 'PEMBIMBING' && userId) {
      // Stats untuk pembimbing - hanya mahasiswa yang dibimbing
      const totalStudents = await prisma.user.count({
        where: { role: 'MAHASISWA', supervisorId: userId as string }
      });
      
      const today = getTodayWIB();
      
      const todayPresent = await prisma.attendance.count({
        where: {
          date: today,
          status: { in: ['PRESENT', 'LATE'] },
          user: { supervisorId: userId as string, role: 'MAHASISWA' }
        }
      });
      
      const todayLeave = await prisma.attendance.count({
        where: {
          date: today,
          status: { in: ['LEAVE', 'SICK'] },
          user: { supervisorId: userId as string, role: 'MAHASISWA' }
        }
      });

      // Calculate monthly percentage
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      
      const monthlyTotal = await prisma.attendance.count({
        where: { 
          date: { gte: thisMonth },
          user: { supervisorId: userId as string, role: 'MAHASISWA' }
        }
      });
      
      const monthlyPresent = await prisma.attendance.count({
        where: { 
          date: { gte: thisMonth },
          status: { in: ['PRESENT', 'LATE'] },
          user: { supervisorId: userId as string, role: 'MAHASISWA' }
        }
      });
      
      const monthlyPercentage = monthlyTotal > 0 ? Math.round((monthlyPresent / monthlyTotal) * 100) : 0;

      res.json({
        totalStudents,
        todayPresent,
        todayLeave,
        monthlyPercentage
      });
    } else {
      // Stats untuk admin - semua mahasiswa
      const totalStudents = await prisma.user.count({
        where: { role: 'MAHASISWA' }
      });
      
      const today = getTodayWIB();
      
      const todayPresent = await prisma.attendance.count({
        where: {
          date: today,
          status: { in: ['PRESENT', 'LATE'] },
          user: { role: 'MAHASISWA' }
        }
      });
      
      const todayLeave = await prisma.attendance.count({
        where: {
          date: today,
          status: { in: ['LEAVE', 'SICK'] },
          user: { role: 'MAHASISWA' }
        }
      });

      // Calculate monthly percentage
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      
      const monthlyTotal = await prisma.attendance.count({
        where: { 
          date: { gte: thisMonth },
          user: { role: 'MAHASISWA' }
        }
      });
      
      const monthlyPresent = await prisma.attendance.count({
        where: { 
          date: { gte: thisMonth },
          status: { in: ['PRESENT', 'LATE'] },
          user: { role: 'MAHASISWA' }
        }
      });
      
      const monthlyPercentage = monthlyTotal > 0 ? Math.round((monthlyPresent / monthlyTotal) * 100) : 0;

      res.json({
        totalStudents,
        todayPresent,
        todayLeave,
        monthlyPercentage
      });
    }
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/dashboard/activities', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    
    const activities = await prisma.activityLog.findMany({
      include: {
        user: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    res.json(activities);
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== ACTIVITY LOG ROUTES =====
// Get all activity logs with filters
app.get('/api/activity-logs', async (req, res) => {
  try {
    const { search, role, action, limit = '100' } = req.query;
    
    console.log('📋 GET /api/activity-logs called with:', { search, role, action, limit });
    
    // Build where clause
    const whereConditions: any[] = [];
    
    // Filter by role
    if (role && role !== 'all') {
      whereConditions.push({
        user: {
          role: (role as string).toUpperCase()
        }
      });
    }
    
    // Filter by action type
    if (action && action !== 'all') {
      const actionMap: Record<string, string[]> = {
        'absen': ['CHECK_IN', 'CHECK_OUT'],
        'izin': ['LEAVE_REQUEST'],
        'laporan': ['REPORT_SUBMITTED', 'REPORT_REVIEWED', 'REPORT_APPROVED', 'REPORT_REVISION'],
        'login': ['LOGIN'],
        'user': ['USER_CREATED', 'USER_UPDATED', 'PASSWORD_CHANGED']
      };
      const actions = actionMap[action as string];
      if (actions) {
        whereConditions.push({ action: { in: actions } });
      }
    }
    
    // Search filter
    if (search) {
      whereConditions.push({
        OR: [
          { description: { contains: search as string } },
          { action: { contains: search as string } },
          { user: { name: { contains: search as string } } }
        ]
      });
    }
    
    const whereClause = whereConditions.length > 0 ? { AND: whereConditions } : {};
    
    const activities = await prisma.activityLog.findMany({
      where: whereClause,
      include: {
        user: {
          select: { name: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string)
    });

    console.log(`📋 Found ${activities.length} activity logs`);
    res.json(activities);
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get activity log statistics
app.get('/api/activity-logs/stats', async (req, res) => {
  try {
    // Total activities
    const total = await prisma.activityLog.count();
    
    // Today's activities
    const today = getTodayWIB();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayCount = await prisma.activityLog.count({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      }
    });
    
    // Success activities (CHECK_IN, CHECK_OUT, LOGIN, etc)
    const successCount = await prisma.activityLog.count({
      where: {
        action: {
          in: ['CHECK_IN', 'CHECK_OUT', 'LOGIN', 'USER_CREATED', 'REPORT_SUBMITTED', 'REPORT_APPROVED', 'PASSWORD_CHANGED']
        }
      }
    });
    
    // Pending/Warning activities
    const pendingCount = await prisma.activityLog.count({
      where: {
        action: {
          in: ['LEAVE_REQUEST', 'REPORT_REVIEWED', 'REPORT_REVISION']
        }
      }
    });

    res.json({
      total,
      todayCount,
      successCount,
      pendingCount
    });
  } catch (error) {
    console.error('Get activity stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== GPS & LOCATION CONFIG =====
// Koordinat kantor PT Pupuk Iskandar Muda
const OFFICE_LOCATION = {
  latitude: 5.194133,
  longitude: 97.017938,
  name: 'PT Pupuk Iskandar Muda'
}; 
const MAX_DISTANCE_METERS = 50; // Maksimal jarak 50 meter

// Haversine formula untuk menghitung jarak antara 2 koordinat
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Radius bumi dalam meter
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Jarak dalam meter
}

// ===== ATTENDANCE ROUTES =====
app.get('/api/attendance/today/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const today = getTodayWIB();
    
    console.log('📅 getTodayAttendance - Today WIB:', today.toISOString());
    
    const attendance = await prisma.attendance.findFirst({
      where: {
        userId,
        date: today
      }
    });

    console.log('📋 Found attendance:', attendance ? `Date: ${attendance.date}, CheckIn: ${attendance.checkIn}` : 'null');

    res.json(attendance);
  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get office location config
app.get('/api/attendance/office-location', (req, res) => {
  res.json({
    ...OFFICE_LOCATION,
    maxDistance: MAX_DISTANCE_METERS
  });
});

app.post('/api/attendance/checkin', async (req, res) => {
  try {
    const { userId, latitude, longitude } = req.body;

    // Validasi input
    if (!userId) {
      return res.status(400).json({ error: 'User ID harus diisi' });
    }
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Koordinat GPS (latitude & longitude) harus diisi' });
    }
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'Koordinat GPS harus berupa angka' });
    }

    // Gunakan waktu WIB (UTC+7) - simpan sebagai "fake UTC" agar di database terlihat sebagai WIB
    const utcNow = new Date();
    const wibOffset = 7 * 60 * 60 * 1000; // 7 jam dalam milidetik
    
    // Buat waktu WIB yang akan disimpan "as-is" di database
    const wibTime = new Date(utcNow.getTime() + wibOffset);
    const year = wibTime.getUTCFullYear();
    const month = String(wibTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(wibTime.getUTCDate()).padStart(2, '0');
    const hours = String(wibTime.getUTCHours()).padStart(2, '0');
    const minutes = String(wibTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(wibTime.getUTCSeconds()).padStart(2, '0');
    
    // Buat Date object dengan waktu WIB tapi tanpa timezone conversion
    const now = new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`);
    const today = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    
    console.log(`📅 CheckIn - UTC: ${utcNow.toISOString()}, WIB stored: ${now.toISOString()}, Today: ${today.toISOString()}`);

    // Validasi jam kerja - absen masuk hanya bisa jam 11:00 ke atas
    const currentHour = wibTime.getUTCHours();
    if (currentHour < 8) {
      return res.status(400).json({ 
        error: `Absen masuk belum dibuka. Jam absen masuk mulai pukul 8:00 WIB. Sekarang: ${hours}:${minutes} WIB`,
        currentTime: `${hours}:${minutes}`,
        minTime: '8:00'
      });
    }

    // Cek apakah sudah ada record absensi hari ini
    const existing = await prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId,
          date: today
        }
      }
    });

    // Jika sudah absen masuk, tolak
    if (existing?.checkIn) {
      return res.status(400).json({ 
        error: 'Sudah absen masuk hari ini',
        existingCheckIn: existing.checkIn
      });
    }

    // Hitung jarak dari kantor menggunakan Haversine
    const distance = calculateDistance(
      latitude, longitude,
      OFFICE_LOCATION.latitude, OFFICE_LOCATION.longitude
    );

    // Validasi jarak (harus <= 100 meter)
    if (distance > MAX_DISTANCE_METERS) {
      return res.status(400).json({ 
        error: `Lokasi terlalu jauh dari kantor. Jarak Anda: ${Math.round(distance)} meter. Maksimal: ${MAX_DISTANCE_METERS} meter.`,
        distance: Math.round(distance),
        maxDistance: MAX_DISTANCE_METERS,
        userLocation: { latitude, longitude },
        officeLocation: OFFICE_LOCATION
      });
    }

    // Lokasi valid, simpan absensi
    const locationString = `${OFFICE_LOCATION.name} (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`;
    
    // Tentukan status: LATE jika lewat 15 menit dari jam masuk (8:15)
    const currentMinute = wibTime.getUTCMinutes();
    const isLate = currentHour > 8 || (currentHour === 8 && currentMinute > 15);
    const attendanceStatus = isLate ? 'LATE' : 'PRESENT';
    
    let attendance;
    if (existing) {
      // Update record yang sudah ada
      attendance = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          checkIn: now,
          location: locationString,
          latitude,
          longitude,
          distance: Math.round(distance),
          status: attendanceStatus,
          updatedAt: now // Set updatedAt ke WIB
        }
      });
    } else {
      // Buat record baru
      attendance = await prisma.attendance.create({
        data: {
          userId,
          date: today,
          checkIn: now,
          location: locationString,
          latitude,
          longitude,
          distance: Math.round(distance),
          status: attendanceStatus,
          createdAt: now, // Set createdAt ke WIB
          updatedAt: now  // Set updatedAt ke WIB
        }
      });
    }

    // Log activity
    const statusText = isLate ? 'TERLAMBAT' : 'TEPAT WAKTU';
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'CHECK_IN',
        description: `Absen masuk pada ${hours}:${minutes} WIB - ${statusText} - Jarak: ${Math.round(distance)}m`,
      }
    });

    const message = isLate 
      ? `Absen masuk berhasil (TERLAMBAT)! Jam: ${hours}:${minutes} WIB. Jarak: ${Math.round(distance)} meter`
      : `Absen masuk berhasil! Jam: ${hours}:${minutes} WIB. Jarak: ${Math.round(distance)} meter`;

    res.json({
      ...attendance,
      message
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/attendance/checkout', async (req, res) => {
  try {
    const { userId, latitude, longitude } = req.body;

    // Validasi input
    if (!userId) {
      return res.status(400).json({ error: 'User ID harus diisi' });
    }
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Koordinat GPS (latitude & longitude) harus diisi' });
    }

    // Gunakan waktu WIB (UTC+7) - simpan sebagai "fake UTC" agar di database terlihat sebagai WIB
    const utcNow = new Date();
    const wibOffset = 7 * 60 * 60 * 1000;
    
    const wibTime = new Date(utcNow.getTime() + wibOffset);
    const year = wibTime.getUTCFullYear();
    const month = String(wibTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(wibTime.getUTCDate()).padStart(2, '0');
    const hours = String(wibTime.getUTCHours()).padStart(2, '0');
    const minutes = String(wibTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(wibTime.getUTCSeconds()).padStart(2, '0');
    
    const now = new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`);
    const today = new Date(`${year}-${month}-${day}T00:00:00.000Z`);

    // Validasi jam kerja - absen keluar hanya bisa jam 17:00 ke atas
    const currentHour = wibTime.getUTCHours();
    if (currentHour < 17) {
      return res.status(400).json({ 
        error: `Absen keluar belum dibuka. Jam absen keluar mulai pukul 17:00 WIB. Sekarang: ${hours}:${minutes} WIB`,
        currentTime: `${hours}:${minutes}`,
        minTime: '17:00'
      });
    }
    
    const attendance = await prisma.attendance.findFirst({
      where: {
        userId,
        date: today,
        checkIn: { not: null },
        checkOut: null
      }
    });

    if (!attendance) {
      return res.status(400).json({ error: 'Belum absen masuk atau sudah absen keluar hari ini' });
    }

    // Hitung jarak dari kantor
    const distance = calculateDistance(
      latitude, longitude,
      OFFICE_LOCATION.latitude, OFFICE_LOCATION.longitude
    );

    // Validasi jarak untuk checkout juga
    if (distance > MAX_DISTANCE_METERS) {
      return res.status(400).json({ 
        error: `Lokasi terlalu jauh dari kantor. Jarak Anda: ${Math.round(distance)} meter. Maksimal: ${MAX_DISTANCE_METERS} meter.`,
        distance: Math.round(distance),
        maxDistance: MAX_DISTANCE_METERS
      });
    }

    // Calculate duration in minutes
    const duration = Math.floor((now.getTime() - attendance.checkIn!.getTime()) / (1000 * 60));

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut: now,
        duration,
        updatedAt: now // Set updatedAt ke WIB
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'CHECK_OUT',
        description: `Absen keluar pada ${now.toLocaleTimeString('id-ID')} - Durasi: ${Math.floor(duration/60)}j ${duration%60}m`,
      }
    });

    res.json({
      ...updatedAttendance,
      message: `Absen keluar berhasil! Durasi kerja: ${Math.floor(duration/60)} jam ${duration%60} menit`
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/attendance/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const history = await prisma.attendance.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: limit
    });

    res.json(history);
  } catch (error) {
    console.error('Get attendance history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get attendance stats for a user
app.get('/api/attendance/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get this month's start date
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const totalHadir = await prisma.attendance.count({
      where: {
        userId,
        status: { in: ['PRESENT', 'LATE'] }
      }
    });
    
    const totalIzin = await prisma.attendance.count({
      where: {
        userId,
        status: { in: ['LEAVE', 'SICK'] }
      }
    });
    
    const monthlyHadir = await prisma.attendance.count({
      where: {
        userId,
        date: { gte: thisMonth },
        status: { in: ['PRESENT', 'LATE'] }
      }
    });

    res.json({
      totalHadir,
      totalIzin,
      monthlyHadir
    });
  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== PASSWORD CHANGE ROUTE =====
app.put('/api/users/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password dan new password harus diisi' });
    }

    // Password minimum 6 characters
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password baru minimal 6 karakter' });
    }

    // Get user with current password
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, password: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Password saat ini salah' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id },
      data: { 
        password: hashedNewPassword,
        plainPassword: newPassword // Simpan password asli untuk development
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: id,
        action: 'PASSWORD_CHANGED',
        description: `User ${user.name} changed password`,
      }
    });

    res.json({ message: 'Password berhasil diubah' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== LEAVE REQUEST ROUTES =====
// Create leave request with file upload
app.post('/api/leave-requests', upload.single('attachment'), async (req, res) => {
  try {
    console.log('📝 Leave request received:', req.body);
    console.log('📎 File:', req.file);
    
    const { userId, startDate, endDate, type, reason } = req.body;
    const file = req.file;

    // Validasi input
    if (!userId || !startDate || !endDate || !type || !reason) {
      console.log('❌ Validation failed - missing fields');
      // Hapus file jika validasi gagal
      if (file) fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'Semua field harus diisi' });
    }

    // Konversi type ke enum yang sesuai
    const typeMap: Record<string, string> = {
      'izin': 'PERSONAL',
      'sakit': 'SICK',
      'cuti': 'OTHER'
    };
    const leaveType = typeMap[type.toLowerCase()] || 'OTHER';

    // Path file attachment (jika ada)
    const attachmentPath = file ? `/uploads/${file.filename}` : null;

    // Buat leave request
    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        userId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        type: leaveType as any,
        reason,
        attachment: attachmentPath,
        status: 'PENDING'
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'LEAVE_REQUEST',
        description: `Mengajukan ${type} dari ${startDate} sampai ${endDate}`,
      }
    });

    res.status(201).json({
      ...leaveRequest,
      message: 'Pengajuan izin berhasil dikirim!'
    });
  } catch (error) {
    console.error('Create leave request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get leave requests for a user
app.get('/api/leave-requests/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    // Get approver names
    const result = await Promise.all(leaveRequests.map(async (req) => {
      let approver: { name: string; role: string } | null = null;
      if (req.approvedBy) {
        const approverUser = await prisma.user.findUnique({
          where: { id: req.approvedBy },
          select: { name: true, role: true }
        });
        approver = approverUser;
      }
      return { ...req, approver };
    }));

    res.json(result);
  } catch (error) {
    console.error('Get leave requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all leave requests (for admin/pembimbing)
app.get('/api/leave-requests', async (req, res) => {
  try {
    const { supervisorId, role } = req.query;
    console.log('📋 Fetching leave requests...', { supervisorId, role });
    
    // Build where clause based on role
    let whereClause: any = {};
    
    // Jika pembimbing, hanya tampilkan izin dari mahasiswa yang dibimbingnya
    if (role === 'PEMBIMBING' && supervisorId) {
      whereClause = {
        user: {
          supervisorId: supervisorId as string
        }
      };
    }
    // Admin bisa lihat semua
    
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: whereClause,
      include: {
        user: {
          select: { name: true, badge: true, supervisorId: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Get approver names
    const result = await Promise.all(leaveRequests.map(async (req) => {
      let approver: { name: string; role: string } | null = null;
      if (req.approvedBy) {
        const approverUser = await prisma.user.findUnique({
          where: { id: req.approvedBy },
          select: { name: true, role: true }
        });
        approver = approverUser;
      }
      return { ...req, approver };
    }));
    
    console.log('📋 Found leave requests:', result.length);
    res.json(result);
  } catch (error: any) {
    console.error('Get all leave requests error:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update leave request status (approve/reject)
app.put('/api/leave-requests/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approvedBy } = req.body;

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status harus APPROVED atau REJECTED' });
    }

    const updateData: any = {
      status,
      approvedBy: approvedBy || null,
      approvedAt: status === 'APPROVED' ? new Date() : null
    };

    const leaveRequest = await prisma.leaveRequest.update({
      where: { id },
      data: updateData
    });

    res.json({
      ...leaveRequest,
      message: status === 'APPROVED' ? 'Izin disetujui' : 'Izin ditolak'
    });
  } catch (error) {
    console.error('Update leave request status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== REPORT ROUTES =====
// Create report with file upload
app.post('/api/reports', upload.single('file'), async (req, res) => {
  try {
    const { userId, title, content } = req.body;
    const file = req.file;

    if (!userId || !title) {
      if (file) fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'userId dan title harus diisi' });
    }

    const attachmentPath = file ? `/uploads/${file.filename}` : null;

    const report = await prisma.report.create({
      data: {
        userId,
        title,
        content: content || '',
        attachment: attachmentPath,
        status: 'SUBMITTED',
        submittedAt: new Date()
      }
    });

    // Log activity untuk upload laporan
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'REPORT_SUBMITTED',
        description: `Upload laporan: ${title}`,
      }
    });

    res.status(201).json({
      ...report,
      message: 'Laporan berhasil diupload!'
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get reports for a user
app.get('/api/reports/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const reports = await prisma.report.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    // Get reviewer names
    const result = await Promise.all(reports.map(async (report) => {
      let reviewer: { name: string; role: string } | null = null;
      if (report.reviewedBy) {
        const reviewerUser = await prisma.user.findUnique({
          where: { id: report.reviewedBy },
          select: { name: true, role: true }
        });
        reviewer = reviewerUser;
      }
      return { ...report, reviewer };
    }));

    res.json(result);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all reports (for admin/pembimbing)
app.get('/api/reports', async (req, res) => {
  try {
    const { supervisorId, role } = req.query;
    
    // Build where clause based on role
    let whereClause: any = {};
    
    // Jika pembimbing, hanya tampilkan laporan dari mahasiswa yang dibimbingnya
    if (role === 'PEMBIMBING' && supervisorId) {
      whereClause = {
        user: {
          supervisorId: supervisorId as string
        }
      };
    }
    // Admin bisa lihat semua
    
    const reports = await prisma.report.findMany({
      where: whereClause,
      include: {
        user: {
          select: { name: true, badge: true, supervisorId: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get reviewer names
    const result = await Promise.all(reports.map(async (report) => {
      let reviewer: { name: string; role: string } | null = null;
      if (report.reviewedBy) {
        const reviewerUser = await prisma.user.findUnique({
          where: { id: report.reviewedBy },
          select: { name: true, role: true }
        });
        reviewer = reviewerUser;
      }
      return { ...report, reviewer };
    }));

    res.json(result);
  } catch (error) {
    console.error('Get all reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update report status (review)
app.put('/api/reports/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewedBy, feedback } = req.body;

    if (!status || !['APPROVED', 'REVISION_NEEDED'].includes(status)) {
      return res.status(400).json({ error: 'Status harus APPROVED atau REVISION_NEEDED' });
    }

    // Get report info first
    const existingReport = await prisma.report.findUnique({
      where: { id },
      include: { user: { select: { name: true } } }
    });

    const report = await prisma.report.update({
      where: { id },
      data: {
        status: status as any,
        reviewedBy: reviewedBy || null,
        reviewedAt: new Date(),
        feedback: feedback || null
      }
    });

    // Log activity untuk review laporan
    if (reviewedBy) {
      const actionType = status === 'APPROVED' ? 'REPORT_APPROVED' : 'REPORT_REVISION';
      const actionDesc = status === 'APPROVED' 
        ? `Menyetujui laporan "${existingReport?.title}" dari ${existingReport?.user?.name}`
        : `Meminta revisi laporan "${existingReport?.title}" dari ${existingReport?.user?.name}`;
      
      await prisma.activityLog.create({
        data: {
          userId: reviewedBy,
          action: actionType,
          description: actionDesc,
        }
      });
    }

    res.json({
      ...report,
      message: status === 'APPROVED' ? 'Laporan disetujui' : 'Laporan perlu revisi'
    });
  } catch (error) {
    console.error('Update report status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== DASHBOARD CHART DATA ROUTES =====
// Get weekly attendance chart data
app.get('/api/dashboard/chart/weekly', async (req, res) => {
  try {
    const { userId, role, supervisorId } = req.query;
    
    // Get dates for this week (Monday to Friday)
    const today = getTodayWIB();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    
    const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum'];
    const chartData: { name: string; date: string; hadir: number; izin: number; alpha: number }[] = [];
    
    for (let i = 0; i < 5; i++) {
      const currentDate = new Date(monday);
      currentDate.setDate(monday.getDate() + i);
      
      // Build where clause based on role
      let whereClause: any = {
        date: currentDate
      };
      
      if (role === 'MAHASISWA' && userId) {
        // Mahasiswa: hanya data diri sendiri
        whereClause.userId = userId as string;
      } else if (role === 'PEMBIMBING' && supervisorId) {
        // Pembimbing: hanya mahasiswa yang dibimbing
        whereClause.user = {
          supervisorId: supervisorId as string,
          role: 'MAHASISWA'
        };
      }
      // Admin: semua mahasiswa (no additional filter)
      
      const hadir = await prisma.attendance.count({
        where: {
          ...whereClause,
          status: { in: ['PRESENT', 'LATE'] }
        }
      });
      
      const izin = await prisma.attendance.count({
        where: {
          ...whereClause,
          status: { in: ['LEAVE', 'SICK'] }
        }
      });
      
      const alpha = await prisma.attendance.count({
        where: {
          ...whereClause,
          status: 'ABSENT'
        }
      });
      
      chartData.push({
        name: days[i],
        date: currentDate.toISOString().split('T')[0],
        hadir,
        izin,
        alpha
      });
    }
    
    res.json(chartData);
  } catch (error) {
    console.error('Get weekly chart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get monthly attendance pie chart data
app.get('/api/dashboard/chart/monthly', async (req, res) => {
  try {
    const { userId, role, supervisorId } = req.query;
    
    // Get first day of this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    // Build where clause based on role
    let baseWhere: any = {
      date: { gte: thisMonth }
    };
    
    if (role === 'MAHASISWA' && userId) {
      baseWhere.userId = userId as string;
    } else if (role === 'PEMBIMBING' && supervisorId) {
      baseWhere.user = {
        supervisorId: supervisorId as string,
        role: 'MAHASISWA'
      };
    }
    
    const hadir = await prisma.attendance.count({
      where: {
        ...baseWhere,
        status: { in: ['PRESENT', 'LATE'] }
      }
    });
    
    const izin = await prisma.attendance.count({
      where: {
        ...baseWhere,
        status: { in: ['LEAVE', 'SICK'] }
      }
    });
    
    const alpha = await prisma.attendance.count({
      where: {
        ...baseWhere,
        status: 'ABSENT'
      }
    });
    
    const total = hadir + izin + alpha;
    
    const pieData = [
      { name: 'Hadir', value: total > 0 ? Math.round((hadir / total) * 100) : 0, color: '#0A2342', count: hadir },
      { name: 'Izin', value: total > 0 ? Math.round((izin / total) * 100) : 0, color: '#1e40af', count: izin },
      { name: 'Alpha', value: total > 0 ? Math.round((alpha / total) * 100) : 0, color: '#dc2626', count: alpha },
    ];
    
    res.json({ pieData, total });
  } catch (error) {
    console.error('Get monthly chart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get student list for pembimbing/admin dashboard
app.get('/api/dashboard/students', async (req, res) => {
  try {
    const { role, supervisorId } = req.query;
    
    let whereClause: any = {
      role: 'MAHASISWA'
    };
    
    if (role === 'PEMBIMBING' && supervisorId) {
      whereClause.supervisorId = supervisorId as string;
    }
    
    const students = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        badge: true,
        university: true,
        _count: {
          select: {
            attendances: true
          }
        }
      }
    });
    
    // Get today's attendance for each student
    const today = getTodayWIB();
    const studentsWithAttendance = await Promise.all(students.map(async (student) => {
      const todayAttendance = await prisma.attendance.findFirst({
        where: {
          userId: student.id,
          date: today
        }
      });
      
      return {
        ...student,
        todayStatus: todayAttendance?.status || 'ABSENT',
        checkIn: todayAttendance?.checkIn || null
      };
    }));
    
    res.json(studentsWithAttendance);
  } catch (error) {
    console.error('Get dashboard students error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API Server is running' });
});

// Seed database endpoint (untuk production)
app.post('/api/seed', async (req, res) => {
  try {
    const { secretKey } = req.body;
    
    // Simple protection
    if (secretKey !== 'seed-pim-2025') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if already seeded
    const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (existingAdmin) {
      return res.status(400).json({ error: 'Database already seeded', admin: existingAdmin.email });
    }

    const defaultPassword = 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Create Admin
    const admin = await prisma.user.create({
      data: {
        id: 'am001',
        badge: 'ADM001',
        name: 'Admin System',
        email: 'admin@pim.co.id',
        phone: '0811-1234-5678',
        password: hashedPassword,
        plainPassword: defaultPassword,
        role: 'ADMIN',
        department: 'IT',
      },
    });

    // Create Pembimbing
    const pembimbing1 = await prisma.user.create({
      data: {
        id: 'pg001',
        badge: 'PB001',
        name: 'Drs. Budiman',
        email: 'budiman@pim.co.id',
        phone: '0811-2345-6789',
        password: hashedPassword,
        plainPassword: defaultPassword,
        role: 'PEMBIMBING',
        department: 'Produksi',
      },
    });

    // Create Mahasiswa
    const mahasiswa1 = await prisma.user.create({
      data: {
        id: 'ms0001',
        badge: '2021001',
        name: 'Ahmad Fauzi',
        email: 'ahmad.fauzi@email.com',
        phone: '0812-3456-7890',
        password: hashedPassword,
        plainPassword: defaultPassword,
        role: 'MAHASISWA',
        university: 'Universitas Syiah Kuala',
        supervisorId: pembimbing1.id,
      },
    });

    res.json({ 
      message: 'Database seeded successfully!',
      users: {
        admin: admin.email,
        pembimbing: pembimbing1.email,
        mahasiswa: mahasiswa1.email,
      },
      password: defaultPassword
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    res.status(500).json({ error: 'Seed failed', details: error.message });
  }
});

// Serve static files from build folder (production)
const buildPath = path.join(__dirname, '../build');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  
  // Handle React Router - serve index.html for all non-API routes
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(buildPath, 'index.html'));
    } else {
      next();
    }
  });
}

// Start HTTP server - listen on all interfaces for network access
const port = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;
app.listen(port, '0.0.0.0', () => {
  console.log(`� AaPI Server running on http://0.0.0.0:${port}`);
  console.log(`� Datasbase: MySQL connected`);
  console.log(`🔗 Akses dari HP: http://10.251.70.149:${port}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});