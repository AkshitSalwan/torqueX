// A simple script to create an admin user
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@torquex.com' },
      update: { role: 'ADMIN' },
      create: {
        clerkId: `manual-admin-${Date.now()}`,
        name: 'Admin User',
        email: 'admin@torquex.com',
        role: 'ADMIN'
      }
    });
    
    console.log('Admin user created/updated:', adminUser);
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();