import { PrismaClient, Role, ServiceCategory, RoomStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

const prisma = new PrismaClient();

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const file = fs.createWriteStream(dest);
    const client = url.startsWith('https') ? https : http;

    client.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadFile(redirectUrl, dest).then(resolve).catch(reject);
          return;
        }
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Default Admin User
  const adminEmail = 'admin@pethub.com';
  const defaultPassword = 'AdminPassword123@';
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      role: Role.ADMIN,
      isDelete: false,
    },
    create: {
      email: adminEmail,
      passwordHash,
      fullName: 'System Administrator',
      phoneNumber: '0988888888',
      role: Role.ADMIN,
      isDelete: false,
    },
  });

  console.log('✅ Default Admin User created/updated successfully:');
  console.log(`   - ID: ${adminUser.id}`);
  console.log(`   - Email: ${adminUser.email}`);
  console.log(`   - Role: ${adminUser.role}`);
  console.log(`   - Default Password: ${defaultPassword}`);

  // 2. Seed Default Services (with images)
  const serviceImagesDir = path.join(process.cwd(), 'files', 'services');
  if (!fs.existsSync(serviceImagesDir)) {
    fs.mkdirSync(serviceImagesDir, { recursive: true });
  }

  const defaultServices = [
    {
      category: ServiceCategory.CHECK_IN,
      name: 'Tiếp nhận & Kiểm tra ban đầu',
      description: 'Tiếp nhận thú cưng, kiểm tra sức khỏe ban đầu, tình trạng da lông và ghi nhận yêu cầu chăm sóc.',
      durationMinutes: 15,
      basePrice: 0,
      imageFile: 'service-check-in.png',
      imageUrl: 'https://placehold.co/600x400/e0f2fe/0369a1.png?text=Check-in',
    },
    {
      category: ServiceCategory.BATH_AND_DRY,
      name: 'Tắm & Sấy khô',
      description: 'Tắm sạch bằng sữa tắm chuyên dụng khử mùi, dưỡng lông và sấy khô phồng lông mềm mượt.',
      durationMinutes: 45,
      basePrice: 150000,
      imageFile: 'service-bath-and-dry.png',
      imageUrl: 'https://placehold.co/600x400/fce7f3/9d174d.png?text=Bath+%26+Dry',
    },
    {
      category: ServiceCategory.HAIRCUT,
      name: 'Cắt tỉa & Tạo kiểu lông',
      description: 'Cắt tỉa lông nghệ thuật theo yêu cầu hoặc form dáng chuẩn theo từng giống thú cưng.',
      durationMinutes: 60,
      basePrice: 250000,
      imageFile: 'service-haircut.png',
      imageUrl: 'https://placehold.co/600x400/ede9fe/6d28d9.png?text=Haircut',
    },
    {
      category: ServiceCategory.HYGIENE,
      name: 'Vệ sinh toàn diện',
      description: 'Cắt mài móng, vệ sinh và nhổ lông tai, vắt tuyến hôi, đánh răng khử mùi hôi miệng.',
      durationMinutes: 30,
      basePrice: 100000,
      imageFile: 'service-hygiene.png',
      imageUrl: 'https://placehold.co/600x400/ccfbf1/0f766e.png?text=Hygiene',
    },
    {
      category: ServiceCategory.FULL_GROOMING,
      name: 'Gói Spa Toàn diện',
      description: 'Combo chăm sóc toàn diện bao gồm: Kiểm tra ban đầu, tắm sấy, cắt tỉa lông tạo kiểu và vệ sinh toàn thân.',
      durationMinutes: 90,
      basePrice: 450000,
      imageFile: 'service-full-grooming.png',
      imageUrl: 'https://placehold.co/600x400/fef3c7/92400e.png?text=Full+Grooming',
    },
    {
      category: ServiceCategory.CHECK_OUT,
      name: 'Kiểm tra bàn giao & Check-out',
      description: 'Kiểm tra tổng thể sau khi hoàn thành, xịt dưỡng thơm, chụp ảnh bàn giao cho chủ nuôi.',
      durationMinutes: 15,
      basePrice: 0,
      imageFile: 'service-check-out.png',
      imageUrl: 'https://placehold.co/600x400/e0f2fe/0369a1.png?text=Check-out',
    },
    {
      category: ServiceCategory.ASSIGN_ROOM,
      name: 'Nhận phòng & Bố trí chuồng trại',
      description: 'Tiếp nhận thú cưng vào phòng/chuồng lưu trú đã được vệ sinh khử trùng và chuẩn bị sẵn nệm ấm.',
      durationMinutes: 15,
      basePrice: 0,
      imageFile: 'service-assign-room.png',
      imageUrl: 'https://placehold.co/600x400/e0e7ff/3730a3.png?text=Assign+Room',
    },
    {
      category: ServiceCategory.FEEDING,
      name: 'Cho ăn theo khẩu phần',
      description: 'Cung cấp bữa ăn theo chế độ dinh dưỡng hạt/pate hoặc khẩu phần riêng của chủ nuôi cung cấp.',
      durationMinutes: 20,
      basePrice: 50000,
      imageFile: 'service-feeding.png',
      imageUrl: 'https://placehold.co/600x400/ffedd5/9a3412.png?text=Feeding',
    },
    {
      category: ServiceCategory.WATER,
      name: 'Cung cấp nước uống tinh khiết',
      description: 'Kiểm tra và thay mới bình nước uống tinh khiết đảm bảo vệ sinh 24/7.',
      durationMinutes: 10,
      basePrice: 0,
      imageFile: 'service-water.png',
      imageUrl: 'https://placehold.co/600x400/cffafe/0e7490.png?text=Water',
    },
    {
      category: ServiceCategory.WALKING,
      name: 'Dắt đi dạo & Vận động',
      description: 'Dắt thú cưng ra ngoài đi dạo, vui chơi vận động trong khu vực sân chơi an toàn.',
      durationMinutes: 30,
      basePrice: 80000,
      imageFile: 'service-walking.png',
      imageUrl: 'https://placehold.co/600x400/d1fae5/065f46.png?text=Walking',
    },
    {
      category: ServiceCategory.MEDICATION,
      name: 'Cho uống thuốc & Chăm sóc y tế',
      description: 'Hỗ trợ cho thú cưng uống thuốc, bôi thuốc theo đơn chỉ định hoặc dặn dò của bác sĩ/chủ nuôi.',
      durationMinutes: 15,
      basePrice: 40000,
      imageFile: 'service-medication.png',
      imageUrl: 'https://placehold.co/600x400/ffe4e6/9f1239.png?text=Medication',
    },
    {
      category: ServiceCategory.CLEANING,
      name: 'Vệ sinh phòng/chuồng định kỳ',
      description: 'Dọn dẹp khay vệ sinh, khử khuẩn và thay lót chuồng đảm bảo môi trường sạch sẽ thơm tho.',
      durationMinutes: 20,
      basePrice: 0,
      imageFile: 'service-cleaning.png',
      imageUrl: 'https://placehold.co/600x400/ecfccb/365314.png?text=Cleaning',
    },
    {
      category: ServiceCategory.DAILY_HEALTH_CHECK,
      name: 'Kiểm tra sức khỏe hàng ngày',
      description: 'Theo dõi thân nhiệt, phân, nước tiểu, mức độ ăn uống và tâm lý của thú cưng mỗi ngày.',
      durationMinutes: 20,
      basePrice: 50000,
      imageFile: 'service-health-check.png',
      imageUrl: 'https://placehold.co/600x400/dbeafe/1e40af.png?text=Health+Check',
    },
  ];

  console.log('\n🐾 Starting Services seeding...');
  let createdCount = 0;
  let skippedCount = 0;

  for (const service of defaultServices) {
    const existing = await prisma.service.findFirst({
      where: { category: service.category },
    });

    if (!existing) {
      // Download image
      const destPath = path.join(serviceImagesDir, service.imageFile);
      let dbImageUrl: string | null = null;

      try {
        await downloadFile(service.imageUrl, destPath);
        dbImageUrl = `/files/services/${service.imageFile}`;
        console.log(`   📷 Downloaded image: ${service.imageFile}`);
      } catch (err) {
        console.warn(`   ⚠️ Failed to download image for ${service.name}, skipping image.`);
      }

      await prisma.service.create({
        data: {
          category: service.category,
          name: service.name,
          description: service.description,
          durationMinutes: service.durationMinutes,
          basePrice: service.basePrice,
          imageUrl: dbImageUrl,
          isDelete: false,
        },
      });
      createdCount++;
      console.log(`   ➕ Created service: [${service.category}] ${service.name} (${service.basePrice.toLocaleString()} VND)`);
    } else {
      // Update image if missing
      if (!existing.imageUrl) {
        const destPath = path.join(serviceImagesDir, service.imageFile);
        try {
          await downloadFile(service.imageUrl, destPath);
          await prisma.service.update({
            where: { id: existing.id },
            data: { imageUrl: `/files/services/${service.imageFile}` },
          });
          console.log(`   📷 Updated image for existing: [${service.category}] ${service.name}`);
        } catch (err) {
          console.warn(`   ⚠️ Failed to download image for ${service.name}`);
        }
      }
      skippedCount++;
      console.log(`   ⏭️ Skipped existing service: [${service.category}] ${service.name}`);
    }
  }

  console.log(`✅ Services seeding completed: ${createdCount} created, ${skippedCount} skipped.`);

  // 3. Seed 30 User Accounts (15 OWNER, 10 STAFF, 5 ADMIN)
  console.log('\n👥 Starting Users seeding (30 accounts)...');
  const userPassword = '1234';
  const userPasswordHash = await bcrypt.hash(userPassword, saltRounds);

  const seedUsers = [
    // 15 OWNER
    { email: 'owner1@pethub.com', fullName: 'Nguyễn Văn An', phoneNumber: '0901000001', role: Role.OWNER },
    { email: 'owner2@pethub.com', fullName: 'Trần Thị Bích', phoneNumber: '0901000002', role: Role.OWNER },
    { email: 'owner3@pethub.com', fullName: 'Lê Hoàng Cường', phoneNumber: '0901000003', role: Role.OWNER },
    { email: 'owner4@pethub.com', fullName: 'Phạm Thị Dung', phoneNumber: '0901000004', role: Role.OWNER },
    { email: 'owner5@pethub.com', fullName: 'Hoàng Văn Em', phoneNumber: '0901000005', role: Role.OWNER },
    { email: 'owner6@pethub.com', fullName: 'Vũ Thị Phương', phoneNumber: '0901000006', role: Role.OWNER },
    { email: 'owner7@pethub.com', fullName: 'Đỗ Minh Giang', phoneNumber: '0901000007', role: Role.OWNER },
    { email: 'owner8@pethub.com', fullName: 'Bùi Thanh Hà', phoneNumber: '0901000008', role: Role.OWNER },
    { email: 'owner9@pethub.com', fullName: 'Ngô Quốc Huy', phoneNumber: '0901000009', role: Role.OWNER },
    { email: 'owner10@pethub.com', fullName: 'Dương Thị Kim', phoneNumber: '0901000010', role: Role.OWNER },
    { email: 'owner11@pethub.com', fullName: 'Lý Văn Long', phoneNumber: '0901000011', role: Role.OWNER },
    { email: 'owner12@pethub.com', fullName: 'Trịnh Thị Mai', phoneNumber: '0901000012', role: Role.OWNER },
    { email: 'owner13@pethub.com', fullName: 'Phan Văn Nam', phoneNumber: '0901000013', role: Role.OWNER },
    { email: 'owner14@pethub.com', fullName: 'Đinh Thị Oanh', phoneNumber: '0901000014', role: Role.OWNER },
    { email: 'owner15@pethub.com', fullName: 'Tô Văn Phúc', phoneNumber: '0901000015', role: Role.OWNER },

    // 10 STAFF
    { email: 'staff1@pethub.com', fullName: 'Nguyễn Thị Quỳnh', phoneNumber: '0902000001', role: Role.STAFF, specialty: 'Chuyên viên Grooming & Spa' },
    { email: 'staff2@pethub.com', fullName: 'Trần Văn Rạng', phoneNumber: '0902000002', role: Role.STAFF, specialty: 'Bác sĩ thú y' },
    { email: 'staff3@pethub.com', fullName: 'Lê Thị Sen', phoneNumber: '0902000003', role: Role.STAFF, specialty: 'Chăm sóc nội trú & Boarding' },
    { email: 'staff4@pethub.com', fullName: 'Phạm Văn Tài', phoneNumber: '0902000004', role: Role.STAFF, specialty: 'Lễ tân & Điều phối dịch vụ' },
    { email: 'staff5@pethub.com', fullName: 'Hoàng Thị Uyên', phoneNumber: '0902000005', role: Role.STAFF, specialty: 'Chuyên viên Grooming & Spa' },
    { email: 'staff6@pethub.com', fullName: 'Vũ Văn Vinh', phoneNumber: '0902000006', role: Role.STAFF, specialty: 'Bác sĩ thú y' },
    { email: 'staff7@pethub.com', fullName: 'Đỗ Thị Xuân', phoneNumber: '0902000007', role: Role.STAFF, specialty: 'Chăm sóc nội trú & Boarding' },
    { email: 'staff8@pethub.com', fullName: 'Bùi Văn Yên', phoneNumber: '0902000008', role: Role.STAFF, specialty: 'Chuyên viên Grooming & Spa' },
    { email: 'staff9@pethub.com', fullName: 'Ngô Thị Ánh', phoneNumber: '0902000009', role: Role.STAFF, specialty: 'Bác sĩ thú y' },
    { email: 'staff10@pethub.com', fullName: 'Dương Văn Bảo', phoneNumber: '0902000010', role: Role.STAFF, specialty: 'Lễ tân & Điều phối dịch vụ' },

    // 5 ADMIN
    { email: 'admin2@pethub.com', fullName: 'Lý Thị Châu', phoneNumber: '0903000001', role: Role.ADMIN },
    { email: 'admin3@pethub.com', fullName: 'Trịnh Văn Đạt', phoneNumber: '0903000002', role: Role.ADMIN },
    { email: 'admin4@pethub.com', fullName: 'Phan Thị Hạnh', phoneNumber: '0903000003', role: Role.ADMIN },
    { email: 'admin5@pethub.com', fullName: 'Đinh Văn Khôi', phoneNumber: '0903000004', role: Role.ADMIN },
    { email: 'admin6@pethub.com', fullName: 'Tô Thị Linh', phoneNumber: '0903000005', role: Role.ADMIN },
  ];

  let userCreated = 0;
  let userSkipped = 0;

  for (const u of seedUsers) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          email: u.email,
          passwordHash: userPasswordHash,
          fullName: u.fullName,
          phoneNumber: u.phoneNumber,
          role: u.role,
          isDelete: false,
          ...(u.specialty ? { specialty: u.specialty } : {}),
        },
      });
      userCreated++;
      console.log(`   ➕ Created [${u.role}] ${u.fullName} (${u.email})`);
    } else {
      userSkipped++;
      console.log(`   ⏭️ Skipped existing: ${u.email}`);
    }
  }

  console.log(`✅ Users seeding completed: ${userCreated} created, ${userSkipped} skipped.`);
  console.log(`   📝 Password cho tất cả: ${userPassword}`);

  // 4. Seed 10 Boarding Rooms (with images)
  console.log('\n🏠 Starting Boarding Rooms seeding (10 rooms)...');

  const roomImagesDir = path.join(process.cwd(), 'files', 'boardingRooms');
  if (!fs.existsSync(roomImagesDir)) {
    fs.mkdirSync(roomImagesDir, { recursive: true });
  }

  const defaultRooms = [
    {
      name: 'Phòng VIP 01',
      description: 'Phòng VIP cao cấp với máy lạnh 24/7, đệm êm, camera giám sát trực tiếp, cửa sổ kính lấy sáng tự nhiên. Diện tích 4m², phù hợp cho chó lớn.',
      pricePerHour: 80000,
      status: RoomStatus.AVAILABLE,
      imageFile: 'room-vip-01.png',
      imageUrl: 'https://placehold.co/600x400/fef3c7/92400e.png?text=VIP+Room+01',
    },
    {
      name: 'Phòng VIP 02',
      description: 'Phòng VIP đặc biệt có hệ thống lọc không khí, đèn ngủ LED, nhạc thư giãn tự động. Diện tích 5m², phù hợp cho chó lớn hoặc 2 bé nhỏ.',
      pricePerHour: 100000,
      status: RoomStatus.AVAILABLE,
      imageFile: 'room-vip-02.png',
      imageUrl: 'https://placehold.co/600x400/fde68a/78350f.png?text=VIP+Room+02',
    },
    {
      name: 'Phòng Standard 01',
      description: 'Phòng tiêu chuẩn sạch sẽ, quạt thông gió, nệm mềm. Diện tích 2.5m², phù hợp cho chó và mèo cỡ vừa.',
      pricePerHour: 40000,
      status: RoomStatus.AVAILABLE,
      imageFile: 'room-standard-01.png',
      imageUrl: 'https://placehold.co/600x400/dbeafe/1e40af.png?text=Standard+01',
    },
    {
      name: 'Phòng Standard 02',
      description: 'Phòng tiêu chuẩn thoáng mát, có cửa lưới chống muỗi, khay vệ sinh tự động. Diện tích 2.5m².',
      pricePerHour: 40000,
      status: RoomStatus.OCCUPIED,
      imageFile: 'room-standard-02.png',
      imageUrl: 'https://placehold.co/600x400/bfdbfe/1e3a8a.png?text=Standard+02',
    },
    {
      name: 'Phòng Standard 03',
      description: 'Phòng tiêu chuẩn với thiết kế mở, ánh sáng tự nhiên, nền sạch dễ vệ sinh. Phù hợp cho mèo.',
      pricePerHour: 35000,
      status: RoomStatus.AVAILABLE,
      imageFile: 'room-standard-03.png',
      imageUrl: 'https://placehold.co/600x400/c7d2fe/3730a3.png?text=Standard+03',
    },
    {
      name: 'Chuồng lớn A1',
      description: 'Chuồng rộng inox cao cấp, dành cho chó lớn trên 20kg. Có khay ăn uống tự động, nệm chống thấm.',
      pricePerHour: 50000,
      status: RoomStatus.AVAILABLE,
      imageFile: 'room-large-a1.png',
      imageUrl: 'https://placehold.co/600x400/d1fae5/065f46.png?text=Large+Kennel+A1',
    },
    {
      name: 'Chuồng lớn A2',
      description: 'Chuồng rộng cho chó lớn, vị trí yên tĩnh cuối dãy, ít bị quấy rầy. Có quạt riêng.',
      pricePerHour: 50000,
      status: RoomStatus.OCCUPIED,
      imageFile: 'room-large-a2.png',
      imageUrl: 'https://placehold.co/600x400/a7f3d0/047857.png?text=Large+Kennel+A2',
    },
    {
      name: 'Chuồng mèo M1',
      description: 'Chuồng thiết kế nhiều tầng dành riêng cho mèo, có cầu thang leo, võng treo và đồ chơi. Diện tích 1.5m².',
      pricePerHour: 30000,
      status: RoomStatus.AVAILABLE,
      imageFile: 'room-cat-m1.png',
      imageUrl: 'https://placehold.co/600x400/fce7f3/9d174d.png?text=Cat+Room+M1',
    },
    {
      name: 'Chuồng mèo M2',
      description: 'Chuồng mèo ấm cúng với hộp ngủ kín, bàn cào móng và cửa sổ nhìn ra khu vui chơi.',
      pricePerHour: 30000,
      status: RoomStatus.MAINTENANCE,
      imageFile: 'room-cat-m2.png',
      imageUrl: 'https://placehold.co/600x400/fbcfe8/831843.png?text=Cat+Room+M2',
    },
    {
      name: 'Phòng cách ly Y tế',
      description: 'Phòng cách ly đặc biệt cho thú cưng đang điều trị hoặc mới phẫu thuật. Hệ thống khử khuẩn UV, nhiệt độ kiểm soát 24/7.',
      pricePerHour: 120000,
      status: RoomStatus.AVAILABLE,
      imageFile: 'room-isolation.png',
      imageUrl: 'https://placehold.co/600x400/fee2e2/991b1b.png?text=Isolation+Room',
    },
  ];

  let roomCreated = 0;
  let roomSkipped = 0;

  for (const room of defaultRooms) {
    const existing = await prisma.boardingRoom.findFirst({
      where: { name: room.name },
    });

    if (!existing) {
      const destPath = path.join(roomImagesDir, room.imageFile);
      let dbImageUrl: string | null = null;

      try {
        await downloadFile(room.imageUrl, destPath);
        dbImageUrl = `/files/boardingRooms/${room.imageFile}`;
        console.log(`   📷 Downloaded image: ${room.imageFile}`);
      } catch (err) {
        console.warn(`   ⚠️ Failed to download image for ${room.name}, skipping image.`);
      }

      await prisma.boardingRoom.create({
        data: {
          name: room.name,
          description: room.description,
          pricePerHour: room.pricePerHour,
          status: room.status,
          imageUrl: dbImageUrl,
          isDelete: false,
        },
      });
      roomCreated++;
      console.log(`   ➕ Created room: ${room.name} (${room.pricePerHour.toLocaleString()} VND/h - ${room.status})`);
    } else {
      if (!existing.imageUrl) {
        const destPath = path.join(roomImagesDir, room.imageFile);
        try {
          await downloadFile(room.imageUrl, destPath);
          await prisma.boardingRoom.update({
            where: { id: existing.id },
            data: { imageUrl: `/files/boardingRooms/${room.imageFile}` },
          });
          console.log(`   📷 Updated image for existing: ${room.name}`);
        } catch (err) {
          console.warn(`   ⚠️ Failed to download image for ${room.name}`);
        }
      }
      roomSkipped++;
      console.log(`   ⏭️ Skipped existing room: ${room.name}`);
    }
  }

  console.log(`✅ Boarding Rooms seeding completed: ${roomCreated} created, ${roomSkipped} skipped.`);
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
