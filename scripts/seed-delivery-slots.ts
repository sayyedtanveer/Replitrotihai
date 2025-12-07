import "dotenv/config";
import { db, deliveryTimeSlots } from "@shared/db";

async function seedDeliverySlots() {
  console.log("🌱 Starting delivery slots seeding...");

  const deliverySlotsData = [
    {
      id: "slot1",
      startTime: "09:00",
      endTime: "10:30",
      label: "Morning (9:00 AM - 10:30 AM)",
      capacity: 50,
      currentOrders: 0,
      cutoffHoursBefore: 4,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "slot2",
      startTime: "10:30",
      endTime: "12:00",
      label: "Late Morning (10:30 AM - 12:00 PM)",
      capacity: 50,
      currentOrders: 0,
      cutoffHoursBefore: 3,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "slot3",
      startTime: "17:00",
      endTime: "18:30",
      label: "Evening (5:00 PM - 6:30 PM)",
      capacity: 50,
      currentOrders: 0,
      cutoffHoursBefore: 4,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "slot4",
      startTime: "18:30",
      endTime: "20:00",
      label: "Late Evening (6:30 PM - 8:00 PM)",
      capacity: 50,
      currentOrders: 0,
      cutoffHoursBefore: 3,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "slot5",
      startTime: "08:00",
      endTime: "09:00",
      label: "Early Morning (8:00 AM - 9:00 AM)",
      capacity: 30,
      currentOrders: 0,
      cutoffHoursBefore: 6,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  try {
    await db.insert(deliveryTimeSlots).values(deliverySlotsData).onConflictDoNothing();
    console.log("✅ Delivery slots seeded successfully!");
    console.log("📊 Seeded slots:");
    deliverySlotsData.forEach((slot) => {
      console.log(`  - ${slot.label} (${slot.startTime} - ${slot.endTime}) [${slot.isActive ? "Active" : "Inactive"}]`);
    });
  } catch (error) {
    console.error("❌ Error seeding delivery slots:", error);
    process.exit(1);
  }
}

seedDeliverySlots()
  .then(() => {
    console.log("\n✨ Seeding completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });
