import { PrismaClient, Role, ServiceCategory } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

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

  // 2. Seed Default Services
  const defaultServices = [
    // Common - Check-in
    {
      category: ServiceCategory.CHECK_IN,
      name: 'Tiếp nhận & Kiểm tra ban đầu',
      description: 'Tiếp nhận thú cưng, kiểm tra sức khỏe ban đầu, tình trạng da lông và ghi nhận yêu cầu chăm sóc.',
      durationMinutes: 15,
      basePrice: 0,
    },

    // Grooming
    {
      category: ServiceCategory.BATH_AND_DRY,
      name: 'Tắm & Sấy khô',
      description: 'Tắm sạch bằng sữa tắm chuyên dụng khử mùi, dưỡng lông và sấy khô phồng lông mềm mượt.',
      durationMinutes: 45,
      basePrice: 150000,
    },
    {
      category: ServiceCategory.HAIRCUT,
      name: 'Cắt tỉa & Tạo kiểu lông',
      description: 'Cắt tỉa lông nghệ thuật theo yêu cầu hoặc form dáng chuẩn theo từng giống thú cưng.',
      durationMinutes: 60,
      basePrice: 250000,
    },
    {
      category: ServiceCategory.HYGIENE,
      name: 'Vệ sinh toàn diện',
      description: 'Cắt mài móng, vệ sinh và nhổ lông tai, vắt tuyến hôi, đánh răng khử mùi hôi miệng.',
      durationMinutes: 30,
      basePrice: 100000,
    },
    {
      category: ServiceCategory.FULL_GROOMING,
      name: 'Gói Spa Toàn diện',
      description: 'Combo chăm sóc toàn diện bao gồm: Kiểm tra ban đầu, tắm sấy, cắt tỉa lông tạo kiểu và vệ sinh toàn thân.',
      durationMinutes: 90,
      basePrice: 450000,
    },

    // Boarding
    {
      category: ServiceCategory.ASSIGN_ROOM,
      name: 'Nhận phòng & Bố trí chuồng trại',
      description: 'Tiếp nhận thú cưng vào phòng/chuồng lưu trú đã được vệ sinh khử trùng và chuẩn bị sẵn nệm ấm.',
      durationMinutes: 15,
      basePrice: 0,
    },
    {
      category: ServiceCategory.FEEDING,
      name: 'Cho ăn theo khẩu phần',
      description: 'Cung cấp bữa ăn theo chế độ dinh dưỡng hạt/pate hoặc khẩu phần riêng của chủ nuôi cung cấp.',
      durationMinutes: 20,
      basePrice: 50000,
    },
    {
      category: ServiceCategory.WATER,
      name: 'Cung cấp nước uống tinh khiết',
      description: 'Kiểm tra và thay mới bình nước uống tinh khiết đảm bảo vệ sinh 24/7.',
      durationMinutes: 10,
      basePrice: 0,
    },
    {
      category: ServiceCategory.WALKING,
      name: 'Dắt đi dạo & Vận động',
      description: 'Dắt thú cưng ra ngoài đi dạo, vui chơi vận động trong khu vực sân chơi an toàn.',
      durationMinutes: 30,
      basePrice: 80000,
    },
    {
      category: ServiceCategory.MEDICATION,
      name: 'Cho uống thuốc & Chăm sóc y tế',
      description: 'Hỗ trợ cho thú cưng uống thuốc, bôi thuốc theo đơn chỉ định hoặc dặn dò của bác sĩ/chủ nuôi.',
      durationMinutes: 15,
      basePrice: 40000,
    },
    {
      category: ServiceCategory.CLEANING,
      name: 'Vệ sinh phòng/chuồng định kỳ',
      description: 'Dọn dẹp khay vệ sinh, khử khuẩn và thay lót chuồng đảm bảo môi trường sạch sẽ thơm tho.',
      durationMinutes: 20,
      basePrice: 0,
    },
    {
      category: ServiceCategory.DAILY_HEALTH_CHECK,
      name: 'Kiểm tra sức khỏe hàng ngày',
      description: 'Theo dõi thân nhiệt, phân, nước tiểu, mức độ ăn uống và tâm lý của thú cưng mỗi ngày.',
      durationMinutes: 20,
      basePrice: 50000,
    },

    // Common - Check-out
    {
      category: ServiceCategory.CHECK_OUT,
      name: 'Kiểm tra bàn giao & Check-out',
      description: 'Kiểm tra tổng thể sau khi hoàn thành, xịt dưỡng thơm, chụp ảnh bàn giao cho chủ nuôi.',
      durationMinutes: 15,
      basePrice: 0,
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
      await prisma.service.create({
        data: {
          category: service.category,
          name: service.name,
          description: service.description,
          durationMinutes: service.durationMinutes,
          basePrice: service.basePrice,
          isDelete: false,
        },
      });
      createdCount++;
      console.log(`   ➕ Created service: [${service.category}] ${service.name} (${service.basePrice.toLocaleString()} VND)`);
    } else {
      skippedCount++;
      console.log(`   ⏭️ Skipped existing service: [${service.category}] ${service.name}`);
    }
  }

  console.log(`✅ Services seeding completed: ${createdCount} created, ${skippedCount} skipped.`);
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
