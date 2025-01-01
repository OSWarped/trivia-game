const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  // Hash the password
  const hashedPassword = await bcrypt.hash('adminpassword', 10);

  // Create or update a hosting site
  const hostingSite = await prisma.hostingSite.upsert({
    where: { name: 'Main Hosting Site' }, // Use the unique name field
    update: {},
    create: {
      name: 'Main Hosting Site',
      location: '123 Main St',
    },
  });

  // Create the admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'blakemilam@gmail.com' },
    update: {},
    create: {
      email: 'blakemilam@gmail.com',
      password: hashedPassword,
      name: 'Blake Milam',
    },
  });

  // Assign the ADMIN role to the user for the hosting site
  await prisma.siteRole.create({
    data: {
      userId: adminUser.id,
      siteId: hostingSite.id,
      role: 'ADMIN', // Role from the Role enum
    },
  });

  console.log('Admin user created with email blakemilam@gmail.com.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
