import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { verifyToken as verifyAdminToken } from "./adminAuth";
import { verifyToken as verifyDeliveryToken } from "./deliveryAuth";
import jwt from "jsonwebtoken";
import type { Order } from "@shared/schema";

interface ConnectedClient {
  ws: WebSocket;
  type: "admin" | "chef" | "delivery" | "customer" | "browser";
  id: string;
  chefId?: string;
  orderId?: string;
  userId?: string; // Added for customer identification in subscription updates
}

const clients: Map<string, ConnectedClient> = new Map();

// Track prepared orders awaiting delivery person acceptance
const preparedOrderTimeouts: Map<string, NodeJS.Timeout> = new Map();
const PREPARED_ORDER_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws"
  });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");
    const type = url.searchParams.get("type") as "admin" | "chef" | "delivery" | "customer" | "browser";
    const orderId = url.searchParams.get("orderId");
    const userId = url.searchParams.get("userId"); // Added for customer identification

    if (!type) {
      ws.close(1008, "Missing client type");
      return;
    }

    let clientId: string;
    let chefId: string | undefined;
    let customerOrderId: string | undefined;
    let customerUserId: string | undefined; // Added for customer userId

    try {
      if (type === "browser") {
        // Browser connections don't need authentication - they receive broadcast updates
        clientId = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      } else if (type === "customer") {
        if (!orderId && !userId) { // Allow connection with userId only as well
          ws.close(1008, "Order ID or User ID required for customer connection");
          return;
        }
        clientId = `customer_${orderId || userId}_${Date.now()}`;
        customerOrderId = orderId || undefined;
        customerUserId = userId || undefined; // Assign userId
      } else if (type === "admin") {
        if (!token) {
          ws.close(1008, "Token required");
          return;
        }
        const payload = verifyAdminToken(token);
        if (!payload) {
          ws.close(1008, "Invalid admin token");
          return;
        }
        clientId = payload.adminId;
      } else if (type === "chef") {
        if (!token) {
          ws.close(1008, "Token required");
          return;
        }
        const JWT_SECRET = process.env.JWT_SECRET || "partner-jwt-secret-change-in-production";
        const payload = jwt.verify(token, JWT_SECRET) as { partnerId: string; chefId: string };
        if (!payload || !payload.chefId) {
          ws.close(1008, "Invalid chef token");
          return;
        }
        clientId = payload.partnerId;
        chefId = payload.chefId;
      } else if (type === "delivery") {
        if (!token) {
          ws.close(1008, "Token required");
          return;
        }
        const payload = verifyDeliveryToken(token);
        if (!payload) {
          ws.close(1008, "Invalid delivery token");
          return;
        }
        clientId = payload.deliveryId;
      } else {
        ws.close(1008, "Invalid client type");
        return;
      }
    } catch (error) {
      console.error("WebSocket auth error:", error);
      ws.close(1008, "Authentication failed");
      return;
    }

    const client: ConnectedClient = { ws, type, id: clientId, chefId, orderId: customerOrderId, userId: customerUserId }; // Include userId
    clients.set(clientId, client);

    console.log(`WebSocket client connected: ${type} ${clientId}${chefId ? ` (chef: ${chefId})` : ""}${customerOrderId ? ` (order: ${customerOrderId})` : ""}${customerUserId ? ` (user: ${customerUserId})` : ""}`); // Log userId

    ws.on("close", () => {
      clients.delete(clientId);
      console.log(`WebSocket client disconnected: ${type} ${clientId}`);
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      clients.delete(clientId);
    });

    ws.send(JSON.stringify({ type: "connected", message: "WebSocket connection established" }));
  });

  return wss;
}

export function broadcastNewOrder(order: Order) {
  const message = JSON.stringify({
    type: "new_order",
    data: order
  });

  clients.forEach((client) => {
    if (client.type === "admin") {
      client.ws.send(message);
    } else if (client.type === "chef" && client.chefId === order.chefId) {
      client.ws.send(message);
    }
  });
}

// Broadcast subscription delivery to admins and assigned chef
export function broadcastSubscriptionDelivery(subscription: any) {
  const message = JSON.stringify({
    type: "subscription_delivery",
    data: subscription
  });

  clients.forEach((client) => {
    if (client.type === "admin") {
      client.ws.send(message);
    } else if (client.type === "chef" && subscription.chefId && client.chefId === subscription.chefId) {
      client.ws.send(message);
      console.log(`  ✅ Sent subscription delivery to chef ${client.id} (chefId: ${client.chefId})`);
    }
  });
}

// Broadcast subscription update (assignment, status changes, etc.)
export function broadcastSubscriptionUpdate(subscription: any) {
  const message = JSON.stringify({
    type: "subscription_update",
    data: subscription
  });

  console.log(`\n📡 ========== BROADCASTING SUBSCRIPTION UPDATE ==========`);
  console.log(`Subscription ID: ${subscription.id}`);
  console.log(`Customer: ${subscription.customerName}`);
  console.log(`Chef ID: ${subscription.chefId || 'None'}`);
  console.log(`Status: ${subscription.status}`);

  let adminNotified = 0;
  let chefNotified = false;
  let customerNotified = false;

  clients.forEach((client, clientId) => {
    if (client.type === "admin" && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
      adminNotified++;
      console.log(`  ✅ Sent to admin ${clientId}`);
    } else if (client.type === "chef" && subscription.chefId && client.chefId === subscription.chefId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
      chefNotified = true;
      console.log(`  ✅ Sent to partner ${clientId} (chefId: ${client.chefId})`);
    } else if (client.type === "customer" && client.userId === subscription.userId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
      customerNotified = true;
      console.log(`  ✅ Sent to customer ${clientId}`);
    } else if (client.type === "browser" && client.ws.readyState === WebSocket.OPEN) {
      // Also send to browser connections (unauthenticated customers)
      client.ws.send(message);
      console.log(`  ✅ Sent to browser ${clientId}`);
    }
  });

  console.log(`\n📊 Broadcast Summary:`);
  console.log(`  - Admins notified: ${adminNotified}`);
  console.log(`  - Chef notified: ${chefNotified ? 'YES' : 'NO'}`);
  console.log(`  - Customer notified: ${customerNotified ? 'YES' : 'NO'}`);
  console.log(`================================================\n`);
}

// Broadcast subscription delivery to available delivery personnel
export async function broadcastSubscriptionDeliveryToAvailableDelivery(deliveryLog: any) {
  console.log(`📣 Broadcasting subscription delivery ${deliveryLog.id} to all active delivery personnel`);

  const { storage } = await import("./storage");

  let deliveryPersonnelNotified = 0;

  for (const [deliveryPersonId, client] of Array.from(clients.entries())) {
    if (client.type === "delivery" && client.ws.readyState === WebSocket.OPEN) {
      const deliveryPerson = await storage.getDeliveryPersonnelById(deliveryPersonId);
      if (deliveryPerson && deliveryPerson.isActive) {
        const message = {
          type: "new_subscription_delivery",
          deliveryLog: deliveryLog,
          message: `🍽️ New subscription delivery ready for pickup!`
        };

        client.ws.send(JSON.stringify(message));
        console.log(`✅ Sent to delivery person: ${deliveryPersonId} (${deliveryPerson.name})`);
        deliveryPersonnelNotified++;
      }
    }
  }

  if (deliveryPersonnelNotified === 0) {
    console.log(`⚠️ WARNING: No available delivery personnel to notify for subscription delivery ${deliveryLog.id}`);
  } else {
    console.log(`✅ Notified ${deliveryPersonnelNotified} delivery personnel about subscription delivery ${deliveryLog.id}`);
  }
}

// Broadcast overdue chef notification to admins
export function broadcastOverdueChefNotification(overdueInfo: any) {
  const message = JSON.stringify({
    type: "overdue_chef_preparation",
    data: {
      subscriptionId: overdueInfo.subscription.id,
      customerName: overdueInfo.subscription.customerName,
      chefId: overdueInfo.chef?.id,
      chefName: overdueInfo.chef?.name,
      expectedPrepTime: overdueInfo.expectedPrepTime,
      deliveryTime: overdueInfo.deliveryTime,
      deliveryLogId: overdueInfo.log.id,
    },
    message: `⚠️ Chef ${overdueInfo.chef?.name || 'Unknown'} hasn't started preparing subscription for ${overdueInfo.subscription.customerName}. Expected by ${overdueInfo.expectedPrepTime}, delivery at ${overdueInfo.deliveryTime}.`,
    timestamp: new Date().toISOString(),
  });

  console.log(`\n⚠️ ========== BROADCASTING OVERDUE CHEF NOTIFICATION ==========`);
  console.log(`Subscription: ${overdueInfo.subscription.id}`);
  console.log(`Customer: ${overdueInfo.subscription.customerName}`);
  console.log(`Chef: ${overdueInfo.chef?.name || 'Unknown'}`);
  console.log(`Expected Prep Time: ${overdueInfo.expectedPrepTime}`);
  console.log(`Delivery Time: ${overdueInfo.deliveryTime}`);

  let adminNotified = 0;

  clients.forEach((client) => {
    if (client.type === "admin" && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
      adminNotified++;
      console.log(`  ✅ Sent to admin ${client.id}`);
    }
  });

  console.log(`\n📊 Notification Summary:`);
  console.log(`  - Admins notified: ${adminNotified}`);
  console.log(`================================================\n`);
}

// Broadcast chef unavailable notification to admins (when chef closes with active subscriptions)
export function broadcastChefUnavailableNotification(data: { chef: any; subscriptionCount: number; subscriptions: any[] }) {
  const message = JSON.stringify({
    type: "chef_unavailable_with_subscriptions",
    data: {
      chefId: data.chef.id,
      chefName: data.chef.name,
      subscriptionCount: data.subscriptionCount,
      subscriptions: data.subscriptions.map(s => ({
        id: s.id,
        customerName: s.customerName,
        phone: s.phone,
        address: s.address,
        nextDeliveryDate: s.nextDeliveryDate,
        nextDeliveryTime: s.nextDeliveryTime,
      })),
    },
    message: `🔴 Chef ${data.chef.name} has marked themselves unavailable but has ${data.subscriptionCount} active subscription(s). Please reassign these subscriptions to another chef.`,
    timestamp: new Date().toISOString(),
  });

  console.log(`\n🔴 ========== BROADCASTING CHEF UNAVAILABLE NOTIFICATION ==========`);
  console.log(`Chef: ${data.chef.name} (${data.chef.id})`);
  console.log(`Active Subscriptions: ${data.subscriptionCount}`);
  console.log(`Subscriptions:`);
  data.subscriptions.forEach(s => {
    console.log(`  - ${s.customerName} (${s.id})`);
  });

  let adminNotified = 0;

  clients.forEach((client) => {
    if (client.type === "admin" && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
      adminNotified++;
      console.log(`  ✅ Sent to admin ${client.id}`);
    }
  });

  console.log(`\n📊 Notification Summary:`);
  console.log(`  - Admins notified: ${adminNotified}`);
  console.log(`================================================\n`);
}


export function broadcastOrderUpdate(order: Order) {
  const message = JSON.stringify({
    type: "order_update",
    data: order
  });

  console.log(`\n📡 ========== BROADCASTING ORDER UPDATE ==========`);
  console.log(`Order ID: ${order.id}`);
  console.log(`Status: ${order.status}`);
  console.log(`Payment Status: ${order.paymentStatus}`);
  console.log(`Chef ID: ${order.chefId}`);
  console.log(`Assigned To: ${order.assignedTo || 'None'}`);

  // Cancel timeout if order is no longer waiting for delivery assignment
  // Valid statuses for delivery assignment: "accepted_by_chef", "preparing", "prepared"
  const waitingForDelivery = ["accepted_by_chef", "preparing", "prepared"].includes(order.status);
  if (!waitingForDelivery || order.assignedTo) {
    cancelPreparedOrderTimeout(order.id);
  }

  let adminNotified = 0;
  let chefNotified = false;
  let deliveryNotified = false;
  let customerNotified = false;

  clients.forEach((client, clientId) => {
    if (client.type === "admin") {
      client.ws.send(message);
      adminNotified++;
      console.log(`  ✅ Sent to admin ${clientId}`);
    } else if (client.type === "chef" && client.chefId === order.chefId) {
      client.ws.send(message);
      chefNotified = true;
      console.log(`  ✅ Sent to chef ${clientId} (chefId: ${client.chefId})`);
    } else if (client.type === "delivery" && client.id === order.assignedTo) {
      client.ws.send(message);
      deliveryNotified = true;
      console.log(`  ✅ Sent to delivery ${clientId}`);
    } else if (client.type === "customer" && client.orderId === order.id) {
      client.ws.send(message);
      customerNotified = true;
      console.log(`  ✅ Sent to customer ${clientId}`);
    }
  });

  console.log(`\n📊 Broadcast Summary:`);
  console.log(`  - Admins notified: ${adminNotified}`);
  console.log(`  - Chef notified: ${chefNotified ? 'YES' : 'NO'}`);
  console.log(`  - Delivery notified: ${deliveryNotified ? 'YES' : 'NO'}`);
  console.log(`  - Customer notified: ${customerNotified ? 'YES' : 'NO'}`);

  if (!chefNotified && order.chefId) {
    console.log(`\n  ⚠️ WARNING: No chef WebSocket connected for chefId: ${order.chefId}`);
    console.log(`  📋 Currently connected clients:`, Array.from(clients.entries()).map(([id, c]) => ({
      id,
      type: c.type,
      chefId: c.chefId,
    })));
  }

  console.log(`================================================\n`);
}

export function notifyDeliveryAssignment(order: Order, deliveryPersonId: string) {
  const client = clients.get(deliveryPersonId);
  if (client && client.type === "delivery") {
    const notificationType = order.status === "confirmed" ? "order_confirmed" : "order_assigned";
    client.ws.send(JSON.stringify({
      type: notificationType,
      data: order,
      message: order.status === "confirmed"
        ? `Order #${order.id.slice(0, 8)} has been confirmed and is ready for pickup`
        : `New order #${order.id.slice(0, 8)} has been assigned to you`
    }));
  }
}

export async function broadcastPreparedOrderToAvailableDelivery(order: any) {
  const notificationStage = order.status === "accepted_by_chef" ? "CHEF_ACCEPTED" :
                           order.status === "prepared" ? "FOOD_READY" : "ORDER_UPDATE";

  console.log(`📣 Broadcasting order ${order.id} (status: ${order.status}, stage: ${notificationStage}) to all active delivery personnel`);

  // Import storage to check delivery personnel status
  const { storage } = await import("./storage");

  let deliveryPersonnelNotified = 0;

  // Broadcast to all connected delivery personnel (they can self-filter based on availability)
  for (const [deliveryPersonId, client] of Array.from(clients.entries())) {
    if (client.type === "delivery" && client.ws.readyState === WebSocket.OPEN) {
      // Verify delivery person is active before notifying
      const deliveryPerson = await storage.getDeliveryPersonnelById(deliveryPersonId);
      if (deliveryPerson && deliveryPerson.isActive) {
        const message = {
          type: "new_prepared_order",
          order: order,
          notificationStage: notificationStage,
          message: notificationStage === "CHEF_ACCEPTED"
            ? `🔔 New order alert! Chef accepted order #${order.id.slice(0, 8)} - start preparing to head out`
            : `🍽️ Order #${order.id.slice(0, 8)} is ready for pickup!`
        };

        client.ws.send(JSON.stringify(message));
        console.log(`✅ [${notificationStage}] Sent to delivery person: ${deliveryPersonId} (${deliveryPerson.name})`);
        deliveryPersonnelNotified++;
      }
    }
  }

  // Clear any existing timeout for this order
  const existingTimeout = preparedOrderTimeouts.get(order.id);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  // Set timeout to notify admin if no delivery person accepts within 5 minutes
  const timeout = setTimeout(async () => {
    console.log(`⏰ TIMEOUT: Order ${order.id} not accepted by any delivery person within 5 minutes`);
    await notifyAdminForManualAssignment(order.id);
    preparedOrderTimeouts.delete(order.id);
  }, PREPARED_ORDER_TIMEOUT_MS);

  preparedOrderTimeouts.set(order.id, timeout);

  if (deliveryPersonnelNotified === 0) {
    console.log(`⚠️ WARNING: No available delivery personnel to notify for order ${order.id}`);
    console.log(`⚠️ Notifying admin immediately for manual assignment`);
    // If no delivery personnel are available, notify admin immediately
    clearTimeout(timeout);
    preparedOrderTimeouts.delete(order.id);
    await notifyAdminForManualAssignment(order.id);
  } else {
    console.log(`✅ Notified ${deliveryPersonnelNotified} delivery personnel about order ${order.id}`);
    console.log(`⏰ Timeout set: Admin will be notified in 5 minutes if no one accepts`);
  }
}

// Function to notify admin when manual assignment is needed
async function notifyAdminForManualAssignment(orderId: string) {
  // Import storage dynamically to avoid circular dependencies
  const { storage } = await import("./storage");

  // Re-fetch current order status to ensure we don't send stale notifications
  const currentOrder = await storage.getOrderById(orderId);

  if (!currentOrder) {
    console.log(`⚠️ Order ${orderId} not found when trying to send manual assignment notification`);
    return;
  }

  // Only notify if order is still waiting for delivery assignment and not yet assigned
  const waitingForDelivery = ["accepted_by_chef", "preparing", "prepared"].includes(currentOrder.status);
  if (!waitingForDelivery || currentOrder.assignedTo) {
    console.log(`✅ Order ${orderId} no longer needs manual assignment (status: ${currentOrder.status}, assigned: ${!!currentOrder.assignedTo})`);
    return;
  }

  const message = JSON.stringify({
    type: "manual_assignment_required",
    data: currentOrder,
    message: `Order #${currentOrder.id.slice(0, 8)} needs manual assignment - no delivery person accepted within timeout`,
    timestamp: new Date().toISOString()
  });

  let adminNotified = false;
  clients.forEach((client) => {
    if (client.type === "admin" && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
      adminNotified = true;
      console.log(`✅ Sent manual assignment notification to admin`);
    }
  });

  if (!adminNotified) {
    console.log(`⚠️ WARNING: No admin WebSocket connected to receive manual assignment notification for order ${currentOrder.id}`);
  }
}

// Function to cancel timeout when delivery person accepts order
export function cancelPreparedOrderTimeout(orderId: string) {
  const timeout = preparedOrderTimeouts.get(orderId);
  if (timeout) {
    clearTimeout(timeout);
    preparedOrderTimeouts.delete(orderId);
    console.log(`✅ Cancelled prepared order timeout for ${orderId} - delivery person accepted`);
  }
}

// Broadcast chef status updates to all connected clients
export function broadcastChefStatusUpdate(chef: any) {
  const message = JSON.stringify({
    type: "chef_status_update",
    data: chef
  });

  console.log(`\n📡 ========== BROADCASTING CHEF STATUS UPDATE ==========`);
  console.log(`Chef ID: ${chef.id}`);
  console.log(`Chef Name: ${chef.name}`);
  console.log(`Status: ${chef.isActive ? "ACTIVE" : "INACTIVE"}`);

  let adminNotified = 0;
  let customerNotified = 0;
  let browserNotified = 0;
  let partnerNotified = false;

  clients.forEach((client, clientId) => {
    if (client.type === "admin" && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
      adminNotified++;
      console.log(`  ✅ Sent to admin ${clientId}`);
    } else if (client.type === "customer" && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
      customerNotified++;
      console.log(`  ✅ Sent to customer ${clientId}`);
    } else if (client.type === "browser" && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
      browserNotified++;
      console.log(`  ✅ Sent to browser ${clientId}`);
    } else if (client.type === "chef" && client.chefId === chef.id && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
      partnerNotified = true;
      console.log(`  ✅ Sent to partner ${clientId}`);
    }
  });

  console.log(`\n📊 Broadcast Summary:`);
  console.log(`  - Admins notified: ${adminNotified}`);
  console.log(`  - Customers notified: ${customerNotified}`);
  console.log(`  - Browsers notified: ${browserNotified}`);
  console.log(`  - Partner notified: ${partnerNotified ? 'YES' : 'NO'}`);
  console.log(`================================================\n`);
}

// Broadcast product availability updates to all connected clients
export function broadcastProductAvailabilityUpdate(product: any) {
  const message = JSON.stringify({
    type: "product_availability_update",
    data: {
      id: product.id,
      name: product.name,
      isAvailable: product.isAvailable,
      stock: product.stockQuantity
    }
  });

  console.log(`\n📡 ========== BROADCASTING PRODUCT AVAILABILITY UPDATE ==========`);
  console.log(`Product ID: ${product.id}`);
  console.log(`Product Name: ${product.name}`);
  console.log(`Available: ${product.isAvailable ? "YES" : "NO"}`);
  console.log(`Stock: ${product.stockQuantity}`);

  let adminNotified = 0;
  let browserNotified = 0;
  let partnerNotified = 0;

  clients.forEach((client, clientId) => {
    if (client.type === "admin" && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
      adminNotified++;
      console.log(`  ✅ Sent to admin ${clientId}`);
    } else if (client.type === "browser" && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
      browserNotified++;
      console.log(`  ✅ Sent to browser ${clientId}`);
    } else if (client.type === "chef" && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
      partnerNotified++;
      console.log(`  ✅ Sent to partner ${clientId}`);
    }
  });

  console.log(`\n📊 Broadcast Summary:`);
  console.log(`  - Admins notified: ${adminNotified}`);
  console.log(`  - Browsers notified: ${browserNotified}`);
  console.log(`  - Partners notified: ${partnerNotified}`);
  console.log(`================================================\n`);
}