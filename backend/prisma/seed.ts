import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

async function main() {
  console.log('Seeding RAMS-Hospital demo data...');

  // ---------------- Departments ----------------
  const departmentNames = ['Cardiology', 'Neurology', 'Orthopedics', 'General Medicine', 'Emergency'];
  const departments: Record<string, any> = {};
  for (const name of departmentNames) {
    departments[name] = await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name, description: `${name} department` }
    });
  }

  // ---------------- Users ----------------
  const defaultPassword = await hash('Password123!');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@rams.com' },
    update: {},
    create: {
      userId: 'ADM-0001',
      name: 'Sanjay Kulkarni',
      email: 'admin@rams.com',
      passwordHash: defaultPassword,
      role: 'ADMIN'
    }
  });

  const deptHead = await prisma.user.upsert({
    where: { email: 'head@rams.com' },
    update: {},
    create: {
      userId: 'DEP-0001',
      name: 'Dr. Anita Rao',
      email: 'head@rams.com',
      passwordHash: defaultPassword,
      role: 'DEPARTMENT_HEAD',
      departmentId: departments['Cardiology'].id
    }
  });

  const doctor = await prisma.user.upsert({
    where: { email: 'doctor@rams.com' },
    update: {},
    create: {
      userId: 'DOC-0001',
      name: 'Dr. Rahul Verma',
      email: 'doctor@rams.com',
      passwordHash: defaultPassword,
      role: 'DOCTOR',
      departmentId: departments['Cardiology'].id
    }
  });

  const doctor2 = await prisma.user.upsert({
    where: { email: 'doctor2@rams.com' },
    update: {},
    create: {
      userId: 'DOC-0002',
      name: 'Dr. Meera Iyer',
      email: 'doctor2@rams.com',
      passwordHash: defaultPassword,
      role: 'DOCTOR',
      departmentId: departments['Neurology'].id
    }
  });

  const nurse = await prisma.user.upsert({
    where: { email: 'nurse@rams.com' },
    update: {},
    create: {
      userId: 'NUR-0001',
      name: 'Priya Deshmukh',
      email: 'nurse@rams.com',
      passwordHash: defaultPassword,
      role: 'NURSE',
      departmentId: departments['Emergency'].id
    }
  });

  // ---------------- Beds ----------------
  const bedSeed: { bedNumber: string; ward: string; bedType: 'GENERAL' | 'ICU' | 'ISOLATION'; dept: string }[] = [];
  for (let i = 1; i <= 10; i++) bedSeed.push({ bedNumber: `GEN-${100 + i}`, ward: 'General Ward', bedType: 'GENERAL', dept: 'General Medicine' });
  for (let i = 1; i <= 6; i++) bedSeed.push({ bedNumber: `ICU-${200 + i}`, ward: 'ICU Ward', bedType: 'ICU', dept: 'Cardiology' });
  for (let i = 1; i <= 4; i++) bedSeed.push({ bedNumber: `ISO-${300 + i}`, ward: 'Isolation Ward', bedType: 'ISOLATION', dept: 'Emergency' });

  const beds: any[] = [];
  for (const b of bedSeed) {
    const bed = await prisma.bed.upsert({
      where: { bedNumber: b.bedNumber },
      update: {},
      create: { bedNumber: b.bedNumber, ward: b.ward, bedType: b.bedType, departmentId: departments[b.dept].id }
    });
    beds.push(bed);
  }
  // Occupy a couple of ICU beds so the dashboard/alert data looks realistic.
  await prisma.bed.update({ where: { bedNumber: 'ICU-201' }, data: { status: 'MAINTENANCE' } });

  // ---------------- Operation Theatres ----------------
  const otSeed = [
    { theatreNumber: 'OT-01', dept: 'Cardiology' },
    { theatreNumber: 'OT-02', dept: 'Neurology' },
    { theatreNumber: 'OT-03', dept: 'Orthopedics' },
    { theatreNumber: 'OT-04', dept: 'General Medicine' }
  ];
  const theatres: Record<string, any> = {};
  for (const ot of otSeed) {
    theatres[ot.theatreNumber] = await prisma.operationTheatre.upsert({
      where: { theatreNumber: ot.theatreNumber },
      update: {},
      create: { theatreNumber: ot.theatreNumber, departmentId: departments[ot.dept].id }
    });
  }

  // ---------------- Patients ----------------
  async function upsertPatient(patientId: string, data: any) {
    const existing = await prisma.patient.findUnique({ where: { patientId } });
    if (existing) return existing;
    return prisma.patient.create({ data: { patientId, ...data } });
  }

  const p1 = await upsertPatient('PAT-0001', {
    name: 'Ramesh Pawar',
    age: 58,
    gender: 'Male',
    medicalCondition: 'Coronary artery disease',
    departmentId: departments['Cardiology'].id,
    priority: 'MEDIUM',
    requiredBedType: 'GENERAL',
    emergency: false,
    admissionStatus: 'PENDING'
  });

  const p2 = await upsertPatient('PAT-0002', {
    name: 'Sunita More',
    age: 67,
    gender: 'Female',
    medicalCondition: 'Acute myocardial infarction',
    departmentId: departments['Cardiology'].id,
    priority: 'CRITICAL',
    requiredBedType: 'ICU',
    emergency: true,
    admissionStatus: 'PENDING'
  });

  const p3 = await upsertPatient('PAT-0003', {
    name: 'Arjun Sharma',
    age: 34,
    gender: 'Male',
    medicalCondition: 'Suspected tuberculosis',
    departmentId: departments['Emergency'].id,
    priority: 'HIGH',
    requiredBedType: 'ISOLATION',
    emergency: false,
    admissionStatus: 'PENDING'
  });

  const p4 = await upsertPatient('PAT-0004', {
    name: 'Kavita Joshi',
    age: 45,
    gender: 'Female',
    medicalCondition: 'Elective knee replacement',
    departmentId: departments['Orthopedics'].id,
    priority: 'LOW',
    requiredBedType: 'GENERAL',
    emergency: false,
    admissionStatus: 'PENDING'
  });

  const p5 = await upsertPatient('PAT-0005', {
    name: 'Vikram Nair',
    age: 52,
    gender: 'Male',
    medicalCondition: 'Emergency appendectomy required',
    departmentId: departments['General Medicine'].id,
    priority: 'CRITICAL',
    requiredBedType: 'GENERAL',
    emergency: true,
    admissionStatus: 'PENDING'
  });

  // ---------------- Sample OT bookings (including a conflict case) ----------------
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  function at(hours: number, minutes = 0) {
    const d = new Date(tomorrow);
    d.setHours(hours, minutes, 0, 0);
    return d;
  }

  const existingBooking = await prisma.oTBooking.findUnique({ where: { bookingId: 'OTB-0001' } });
  if (!existingBooking) {
    await prisma.oTBooking.create({
      data: {
        bookingId: 'OTB-0001',
        patientId: p4.id,
        doctorId: doctor.id,
        departmentId: departments['Cardiology'].id,
        operationTheatreId: theatres['OT-01'].id,
        date: tomorrow,
        startTime: at(10, 0),
        endTime: at(12, 0),
        duration: 120,
        emergency: false,
        priority: 'LOW',
        status: 'CONFIRMED'
      }
    });
  }

  // Second booking intentionally overlaps OTB-0001 (10:00-12:00) to demonstrate conflict detection
  // when a new request for OT-01 at 11:00-13:00 is submitted through the app.

  // ---------------- Allocation requests (pending / approved / rejected examples) ----------------
  const existingAR = await prisma.allocationRequest.findUnique({ where: { requestId: 'AR-0001' } });
  if (!existingAR) {
    const ar = await prisma.allocationRequest.create({
      data: {
        requestId: 'AR-0001',
        patientId: p1.id,
        requestedBy: nurse.id,
        resourceType: 'BED',
        priority: 'MEDIUM',
        emergency: false,
        status: 'PENDING'
      }
    });
    console.log(`Created sample pending allocation request ${ar.requestId} for ${p1.name} — run the allocation engine on it from the Allocation Control Center.`);
  }

  // ---------------- Alert thresholds ----------------
  const thresholdSeed = [
    { resourceType: 'ICU', metric: 'OCCUPANCY_PERCENT', thresholdValue: 90 },
    { resourceType: 'ISOLATION', metric: 'OCCUPANCY_PERCENT', thresholdValue: 90 },
    { resourceType: 'GENERAL', metric: 'OCCUPANCY_PERCENT', thresholdValue: 95 },
    { resourceType: 'OT', metric: 'UTILIZATION_PERCENT', thresholdValue: 90 }
  ];
  for (const t of thresholdSeed) {
    await prisma.alertThreshold.upsert({
      where: { resourceType_metric: { resourceType: t.resourceType, metric: t.metric } },
      update: {},
      create: t
    });
  }

  // ---------------- A draft roster with a couple of shifts ----------------
  const existingRoster = await prisma.dutyRoster.findFirst({ where: { departmentId: departments['Cardiology'].id } });
  if (!existingRoster) {
    const roster = await prisma.dutyRoster.create({
      data: {
        departmentId: departments['Cardiology'].id,
        createdBy: deptHead.id,
        weekStarting: tomorrow,
        status: 'DRAFT'
      }
    });
    await prisma.shift.create({
      data: {
        rosterId: roster.id,
        staffId: doctor.id,
        date: tomorrow,
        startTime: '08:00',
        endTime: '16:00',
        shiftType: 'MORNING'
      }
    });
    await prisma.shift.create({
      data: {
        rosterId: roster.id,
        staffId: nurse.id,
        date: tomorrow,
        startTime: '16:00',
        endTime: '00:00',
        shiftType: 'EVENING'
      }
    });
  }

  console.log('Seed complete.');
  console.log('---------------------------------------------');
  console.log('Demo accounts (password for all: Password123!):');
  console.log('  Admin           : admin@rams.com');
  console.log('  Department Head : head@rams.com');
  console.log('  Doctor          : doctor@rams.com / doctor2@rams.com');
  console.log('  Nurse           : nurse@rams.com');
  console.log('---------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
