import { db } from "../shared/db";
import { subscriptions } from "../shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "./storage";

let isRunning = false;

export async function autoResumeSubscriptions(): Promise<void> {
  try {
    const now = new Date();
    
    const pausedSubscriptions = await db.query.subscriptions.findMany({
      where: (s, { and, eq, lte, isNotNull }) => and(
        eq(s.status, "paused"),
        isNotNull(s.pauseResumeDate),
        lte(s.pauseResumeDate, now)
      ),
    });

    for (const subscription of pausedSubscriptions) {
      await db.update(subscriptions)
        .set({
          status: "active",
          pauseStartDate: null,
          pauseResumeDate: null,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, subscription.id));

      console.log(`▶️ Auto-resumed subscription ${subscription.id} (scheduled for ${subscription.pauseResumeDate})`);
    }

    if (pausedSubscriptions.length > 0) {
      console.log(`✅ Auto-resumed ${pausedSubscriptions.length} subscription(s)`);
    }
  } catch (error) {
    console.error("Error in autoResumeSubscriptions:", error);
  }
}

export async function generateDailyDeliveryLogs(): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const allSubscriptions = await db.query.subscriptions.findMany({
      where: (s, { and, eq }) => and(
        eq(s.status, "active"),
        eq(s.isPaid, true)
      ),
    });

    let logsCreated = 0;

    for (const subscription of allSubscriptions) {
      const nextDeliveryDate = new Date(subscription.nextDeliveryDate);
      nextDeliveryDate.setHours(0, 0, 0, 0);
      
      if (nextDeliveryDate.getTime() !== today.getTime()) {
        continue;
      }

      const plan = await storage.getSubscriptionPlan(subscription.planId);
      if (!plan) continue;

      const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const deliveryDays = plan.deliveryDays as string[];
      
      if (!deliveryDays.includes(dayOfWeek)) {
        continue;
      }

      const existingLog = await storage.getDeliveryLogBySubscriptionAndDate(subscription.id, today);
      if (existingLog) {
        continue;
      }

      await storage.createSubscriptionDeliveryLog({
        subscriptionId: subscription.id,
        date: today,
        time: subscription.nextDeliveryTime || "09:00",
        status: "scheduled",
        deliveryPersonId: null,
        notes: null,
      });

      logsCreated++;
    }

    if (logsCreated > 0) {
      console.log(`📋 Generated ${logsCreated} delivery log(s) for today`);
    }
  } catch (error) {
    console.error("Error in generateDailyDeliveryLogs:", error);
  }
}

export async function updateNextDeliveryDates(): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const subscriptionsToUpdate = await db.query.subscriptions.findMany({
      where: (s, { and, eq, lte }) => and(
        eq(s.status, "active"),
        eq(s.isPaid, true),
        lte(s.nextDeliveryDate, today)
      ),
    });

    for (const subscription of subscriptionsToUpdate) {
      const plan = await storage.getSubscriptionPlan(subscription.planId);
      if (!plan) continue;

      const deliveryDays = plan.deliveryDays as string[];
      let nextDate = new Date(today);
      nextDate.setDate(nextDate.getDate() + 1);

      for (let i = 0; i < 7; i++) {
        const dayOfWeek = nextDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        if (deliveryDays.includes(dayOfWeek)) {
          break;
        }
        nextDate.setDate(nextDate.getDate() + 1);
      }

      await db.update(subscriptions)
        .set({
          nextDeliveryDate: nextDate,
          lastDeliveryDate: today,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, subscription.id));
    }

    if (subscriptionsToUpdate.length > 0) {
      console.log(`📅 Updated next delivery date for ${subscriptionsToUpdate.length} subscription(s)`);
    }
  } catch (error) {
    console.error("Error in updateNextDeliveryDates:", error);
  }
}

export async function runScheduledTasks(): Promise<void> {
  if (isRunning) return;
  
  isRunning = true;
  try {
    await autoResumeSubscriptions();
    await generateDailyDeliveryLogs();
    await updateNextDeliveryDates();
  } finally {
    isRunning = false;
  }
}

export function startCronJobs(): void {
  console.log("🕐 Starting scheduled jobs...");
  
  runScheduledTasks();
  
  setInterval(() => {
    runScheduledTasks();
  }, 5 * 60 * 1000);

  console.log("✅ Scheduled jobs started (runs every 5 minutes)");
}
