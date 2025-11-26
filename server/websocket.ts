import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { verifyToken as verifyAdminToken } from "./adminAuth";
import { verifyToken as verifyDeliveryToken } from "./deliveryAuth";
import jwt from "jsonwebtoken";
import type { Order } from "@shared/schema";

interface ConnectedClient {
  ws: WebSocket;
  type: "admin" | "chef" | "delivery" | "customer";
  id: string;
  chefId?: string;
  orderId?: string;
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
    const type = url.searchParams.get("type") as "admin" | "chef" | "delivery" | "customer";
    const orderId = url.searchParams.get("orderId");

    if (!type) {
      ws.close(1008, "Missing client type");
      return;
    }

    let clientId: string;
    let chefId: string | undefined;
    let customerOrderId: string | undefined;

    try {
      if (type === "customer") {
        if (!orderId) {
          ws.close(1008, "Order ID required for customer connection");
          return;
        }
        clientId = `customer_${orderId}_${Date.now()}`;
        customerOrderId = orderId;
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

    const client: ConnectedClient = { ws, type, id: clientId, chefId, orderId: customerOrderId };
    clients.set(clientId, client);

    console.log(`WebSocket client connected: ${type} ${clientId}${chefId ? ` (chef: ${chefId})` : ""}${customerOrderId ? ` (order: ${customerOrderId})` : ""}`);

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
    } else if (client.type === "chef" && client.chefId === chef.id && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
      partnerNotified = true;
      console.log(`  ✅ Sent to partner ${clientId}`);
    }
  });

  console.log(`\n📊 Broadcast Summary:`);
  console.log(`  - Admins notified: ${adminNotified}`);
  console.log(`  - Customers notified: ${customerNotified}`);
  console.log(`  - Partner notified: ${partnerNotified ? 'YES' : 'NO'}`);
  console.log(`================================================\n`);
}