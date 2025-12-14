import { PrismaClient, UserRole, AttendanceStatus, LeaveType, RequestStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Hash password untuk demo
  const defaultPassword = 'password123'
  const hashedPassword = await bcrypt.hash(defaultPassword, 10)

  // Create Admin
  const admin = await prisma.user.create({
    data: {
      badge: 'ADM001',
      name: 'Admin System',
      email: 'admin@pim.co.id',
      phone: '0811-1234-5678',
      address: 'Kantor PT Pupuk Iskandar Muda, Lhokseumawe',
      password: hashedPassword,
      plainPassword: defaultPassword,
      role: UserRole.ADMIN,
      department: 'IT',
      position: 'System Administrator',
      joinDate: new Date('2020-03-01'),
    },
  })

  // Create Pembimbing
  const pembimbing1 = await prisma.user.create({
    data: {
      badge: 'PB001',
      name: 'Drs. Budiman',
      email: 'budiman@pim.co.id',
      phone: '0811-2345-6789',
      address: 'Jl. Merdeka No. 45, Aceh Utara',
      password: hashedPassword,
      plainPassword: defaultPassword,
      role: UserRole.PEMBIMBING,
      department: 'Produksi',
      position: 'Supervisor',
      joinDate: new Date('2015-01-15'),
    },
  })

  const pembimbing2 = await prisma.user.create({
    data: {
      badge: 'PB002',
      name: 'Ir. Suharto',
      email: 'suharto@pim.co.id',
      phone: '0812-3456-7890',
      address: 'Jl. Kartini No. 12, Lhokseumawe',
      password: hashedPassword,
      plainPassword: defaultPassword,
      role: UserRole.PEMBIMBING,
      department: 'QC',
      position: 'Quality Control Manager',
      joinDate: new Date('2018-06-10'),
    },
  })

  // Create Mahasiswa
  const mahasiswa1 = await prisma.user.create({
    data: {
      badge: '2021001',
      name: 'Ahmad Fauzi',
      email: 'ahmad.fauzi@email.com',
      phone: '0812-3456-7890',
      address: 'Jl. Sudirman No. 123, Lhokseumawe, Aceh',
      password: hashedPassword,
      plainPassword: defaultPassword,
      role: UserRole.MAHASISWA,
      university: 'Universitas Syiah Kuala',
      major: 'Teknik Kimia',
      semester: '7',
      startDate: new Date('2025-08-01'),
      supervisorId: pembimbing1.id,
    },
  })

  const mahasiswa2 = await prisma.user.create({
    data: {
      badge: '2021002',
      name: 'Siti Nurhaliza',
      email: 'siti.nur@email.com',
      phone: '0813-4567-8901',
      address: 'Jl. Ahmad Yani No. 67, Lhokseumawe',
      password: hashedPassword,
      plainPassword: defaultPassword,
      role: UserRole.MAHASISWA,
      university: 'Universitas Malikussaleh',
      major: 'Teknik Industri',
      semester: '6',
      startDate: new Date('2025-08-01'),
      supervisorId: pembimbing1.id,
    },
  })

  const mahasiswa3 = await prisma.user.create({
    data: {
      badge: '2021003',
      name: 'Budi Santoso',
      email: 'budi.santoso@email.com',
      phone: '0814-5678-9012',
      address: 'Jl. Diponegoro No. 89, Aceh Utara',
      password: hashedPassword,
      plainPassword: defaultPassword,
      role: UserRole.MAHASISWA,
      university: 'Universitas Syiah Kuala',
      major: 'Teknik Mesin',
      semester: '8',
      startDate: new Date('2025-08-01'),
      supervisorId: pembimbing2.id,
    },
  })

  // Create sample attendance records
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  await prisma.attendance.createMany({
    data: [
      {
        userId: mahasiswa1.id,
        date: today,
        checkIn: new Date(today.setHours(8, 15, 0, 0)),
        checkOut: new Date(today.setHours(17, 10, 0, 0)),
        status: AttendanceStatus.PRESENT,
        location: 'PT Pupuk Iskandar Muda',
        duration: 475, // 7 jam 55 menit
      },
      {
        userId: mahasiswa2.id,
        date: today,
        checkIn: new Date(today.setHours(8, 10, 0, 0)),
        checkOut: new Date(today.setHours(17, 5, 0, 0)),
        status: AttendanceStatus.PRESENT,
        location: 'PT Pupuk Iskandar Muda',
        duration: 475,
      },
      {
        userId: mahasiswa1.id,
        date: yesterday,
        checkIn: new Date(yesterday.setHours(8, 5, 0, 0)),
        checkOut: new Date(yesterday.setHours(17, 10, 0, 0)),
        status: AttendanceStatus.PRESENT,
        location: 'PT Pupuk Iskandar Muda',
        duration: 485,
      },
    ],
  })

  // Create sample leave request
  await prisma.leaveRequest.create({
    data: {
      userId: mahasiswa3.id,
      startDate: today,
      endDate: today,
      reason: 'Sakit demam',
      type: LeaveType.SICK,
      status: RequestStatus.PENDING,
    },
  })

  // Create activity logs
  await prisma.activityLog.createMany({
    data: [
      {
        userId: admin.id,
        action: 'LOGIN',
        description: 'User Admin System logged in',
      },
      {
        userId: admin.id,
        action: 'USER_CREATED',
        description: 'Menambahkan mahasiswa baru: Ahmad Fauzi',
      },
      {
        userId: admin.id,
        action: 'USER_CREATED',
        description: 'Menambahkan mahasiswa baru: Siti Nurhaliza',
      },
      {
        userId: mahasiswa1.id,
        action: 'LOGIN',
        description: 'User Ahmad Fauzi logged in',
      },
      {
        userId: mahasiswa1.id,
        action: 'CHECK_IN',
        description: 'Absen masuk pada 08:15 WIB - TEPAT WAKTU',
      },
      {
        userId: mahasiswa2.id,
        action: 'LOGIN',
        description: 'User Siti Nurhaliza logged in',
      },
      {
        userId: mahasiswa2.id,
        action: 'CHECK_IN',
        description: 'Absen masuk pada 08:10 WIB - TEPAT WAKTU',
      },
      {
        userId: mahasiswa3.id,
        action: 'LEAVE_REQUEST',
        description: 'Mengajukan izin sakit dari hari ini',
      },
      {
        userId: mahasiswa1.id,
        action: 'REPORT_SUBMITTED',
        description: 'Upload laporan: Laporan Mingguan Minggu 1',
      },
      {
        userId: pembimbing1.id,
        action: 'LOGIN',
        description: 'User Drs. Budiman logged in',
      },
      {
        userId: pembimbing1.id,
        action: 'REPORT_APPROVED',
        description: 'Menyetujui laporan "Laporan Mingguan Minggu 1" dari Ahmad Fauzi',
      },
      {
        userId: mahasiswa1.id,
        action: 'CHECK_OUT',
        description: 'Absen keluar pada 17:10 WIB - Durasi: 8 jam 55 menit',
      },
      {
        userId: mahasiswa2.id,
        action: 'CHECK_OUT',
        description: 'Absen keluar pada 17:05 WIB - Durasi: 8 jam 55 menit',
      },
    ],
  })

  console.log('✅ Database seeding completed!')
  console.log(`Created:`)
  console.log(`- 1 Admin: ${admin.email}`)
  console.log(`- 2 Pembimbing: ${pembimbing1.email}, ${pembimbing2.email}`)
  console.log(`- 3 Mahasiswa: ${mahasiswa1.email}, ${mahasiswa2.email}, ${mahasiswa3.email}`)
  console.log(`- Sample attendance records and leave requests`)
  console.log(`\nDefault password for all users: password123`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })