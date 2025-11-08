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

  clients.forEach((client) => {
    if (client.type === "admin") {
      client.ws.send(message);
    } else if (client.type === "chef" && client.chefId === order.chefId) {
      client.ws.send(message);
    } else if (client.type === "delivery" && client.id === order.assignedTo) {
      client.ws.send(message);
    } else if (client.type === "customer" && client.orderId === order.id) {
      client.ws.send(message);
    }
  });
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
