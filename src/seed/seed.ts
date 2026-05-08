import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Service from '../models/Service';

dotenv.config();

const MONGODB_URI = (process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mentecart')
  .replace('replicaSet=rs0', 'directConnection=true');

const createSlot = (
  dayOffset: number,
  startHour: number,
  startMinute: number,
  durationInMinutes: number,
  capacity: number,
) => {
  const startTime = new Date();
  startTime.setUTCDate(startTime.getUTCDate() + dayOffset);
  startTime.setUTCHours(startHour, startMinute, 0, 0);

  const endTime = new Date(startTime.getTime() + durationInMinutes * 60 * 1000);
  return { startTime, endTime, capacity };
};

interface ServiceSeedTemplate {
  title: string;
  description: string;
  price: number;
  duration: number;
  category: string;
  image: string;
  capacityPerSlot: number;
}

interface SlotPattern {
  hour: number;
  minute: number;
}

const serviceTemplates: ServiceSeedTemplate[] = [
  {
    title: 'Home Deep Cleaning',
    description: 'Complete deep cleaning package for apartments and houses.',
    price: 150,
    duration: 120,
    category: 'Cleaning',
    image: 'https://picsum.photos/seed/home-cleaning/800/600',
    capacityPerSlot: 2,
  },
  {
    title: 'Office Cleaning',
    description: 'Scheduled office cleaning with sanitization and waste handling.',
    price: 180,
    duration: 150,
    category: 'Cleaning',
    image: 'https://picsum.photos/seed/office-cleaning/800/600',
    capacityPerSlot: 2,
  },
  {
    title: 'Plumbing Repair',
    description: 'Leak fixing, drain unclogging, and faucet repairs.',
    price: 90,
    duration: 60,
    category: 'Maintenance',
    image: 'https://picsum.photos/seed/plumbing-repair/800/600',
    capacityPerSlot: 1,
  },
  {
    title: 'Electrical Inspection',
    description: 'Home electrical safety inspection and minor issue fixes.',
    price: 110,
    duration: 90,
    category: 'Maintenance',
    image: 'https://picsum.photos/seed/electrical-inspection/800/600',
    capacityPerSlot: 1,
  },
  {
    title: 'AC Maintenance',
    description: 'Air conditioner service, gas check, and performance tuning.',
    price: 130,
    duration: 90,
    category: 'Maintenance',
    image: 'https://picsum.photos/seed/ac-maintenance/800/600',
    capacityPerSlot: 2,
  },
  {
    title: 'Appliance Installation',
    description: 'Professional installation for home appliances.',
    price: 95,
    duration: 75,
    category: 'Home',
    image: 'https://picsum.photos/seed/appliance-installation/800/600',
    capacityPerSlot: 2,
  },
  {
    title: 'Math Tutoring',
    description: 'One-on-one tutoring for school-level mathematics.',
    price: 55,
    duration: 60,
    category: 'Education',
    image: 'https://picsum.photos/seed/math-tutoring/800/600',
    capacityPerSlot: 4,
  },
  {
    title: 'English Tutoring',
    description: 'Improve reading, writing, and spoken English skills.',
    price: 50,
    duration: 60,
    category: 'Education',
    image: 'https://picsum.photos/seed/english-tutoring/800/600',
    capacityPerSlot: 5,
  },
  {
    title: 'Yoga Session',
    description: 'Guided yoga sessions for flexibility and stress reduction.',
    price: 40,
    duration: 60,
    category: 'Wellness',
    image: 'https://picsum.photos/seed/yoga-session/800/600',
    capacityPerSlot: 8,
  },
  {
    title: 'Personal Training',
    description: 'Personalized fitness coaching for your health goals.',
    price: 85,
    duration: 60,
    category: 'Wellness',
    image: 'https://picsum.photos/seed/personal-training/800/600',
    capacityPerSlot: 3,
  },
  {
    title: 'Salon Haircut',
    description: 'Stylish haircut service for all hair types.',
    price: 35,
    duration: 45,
    category: 'Beauty',
    image: 'https://picsum.photos/seed/salon-haircut/800/600',
    capacityPerSlot: 3,
  },
  {
    title: 'Bridal Makeup',
    description: 'Full bridal makeup with premium cosmetic products.',
    price: 220,
    duration: 180,
    category: 'Beauty',
    image: 'https://picsum.photos/seed/bridal-makeup/800/600',
    capacityPerSlot: 1,
  },
  {
    title: 'Car Wash',
    description: 'Exterior and interior car cleaning service.',
    price: 45,
    duration: 45,
    category: 'Automotive',
    image: 'https://picsum.photos/seed/car-wash/800/600',
    capacityPerSlot: 5,
  },
  {
    title: 'Pest Control',
    description: 'Residential pest treatment and prevention service.',
    price: 140,
    duration: 120,
    category: 'Home',
    image: 'https://picsum.photos/seed/pest-control/800/600',
    capacityPerSlot: 2,
  },
  {
    title: 'Gardening Service',
    description: 'Garden cleanup, pruning, and basic landscaping.',
    price: 75,
    duration: 90,
    category: 'Home',
    image: 'https://picsum.photos/seed/gardening-service/800/600',
    capacityPerSlot: 3,
  },
  {
    title: 'Photography Session',
    description: 'Portrait and lifestyle photoshoot session.',
    price: 160,
    duration: 120,
    category: 'Creative',
    image: 'https://picsum.photos/seed/photography-session/800/600',
    capacityPerSlot: 2,
  },
  {
    title: 'Computer Repair',
    description: 'Desktop diagnostics, repairs, and performance optimization.',
    price: 100,
    duration: 90,
    category: 'Tech',
    image: 'https://picsum.photos/seed/computer-repair/800/600',
    capacityPerSlot: 2,
  },
  {
    title: 'Laptop Setup Assistance',
    description: 'Software setup, updates, and user configuration support.',
    price: 70,
    duration: 60,
    category: 'Tech',
    image: 'https://picsum.photos/seed/laptop-setup/800/600',
    capacityPerSlot: 3,
  },
  {
    title: 'Event Planning Consultation',
    description: 'Planning support for personal and corporate events.',
    price: 125,
    duration: 90,
    category: 'Events',
    image: 'https://picsum.photos/seed/event-planning/800/600',
    capacityPerSlot: 2,
  },
  {
    title: 'Childcare Support',
    description: 'Trusted short-term childcare support at home.',
    price: 65,
    duration: 120,
    category: 'Care',
    image: 'https://picsum.photos/seed/childcare-support/800/600',
    capacityPerSlot: 2,
  },
];

const slotPatterns: SlotPattern[][] = [
  [
    { hour: 9, minute: 0 },
    { hour: 13, minute: 0 },
    { hour: 17, minute: 0 },
  ],
  [
    { hour: 8, minute: 30 },
    { hour: 12, minute: 30 },
    { hour: 16, minute: 30 },
  ],
  [
    { hour: 10, minute: 0 },
    { hour: 14, minute: 0 },
    { hour: 18, minute: 0 },
  ],
];

const buildSlots = (durationInMinutes: number, capacity: number, pattern: SlotPattern[]) => {
  const dayOffsets = [0, 1, 2];

  return dayOffsets.flatMap((dayOffset) =>
    pattern.map((slot) =>
      createSlot(dayOffset, slot.hour, slot.minute, durationInMinutes, capacity),
    ),
  );
};

const dummyServices = serviceTemplates.map((service, index) => ({
  ...service,
  slots: buildSlots(service.duration, service.capacityPerSlot, slotPatterns[index % slotPatterns.length]),
}));

const seedDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected correctly to MongoDB');

    console.log('Clearing existing Services...');
    await Service.deleteMany({});

    console.log('Inserting Dummy Services...');
    const insertedServices = await Service.insertMany(dummyServices);
    console.log(`Inserted ${insertedServices.length} services.`);

    console.log('Successfully seeded! Closing connection...');
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDB();
