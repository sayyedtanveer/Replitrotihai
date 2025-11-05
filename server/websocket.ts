import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { verifyToken as verifyAdminToken } from "./adminAuth";
import { verifyToken as verifyDeliveryToken } from "./deliveryAuth";
import jwt from "jsonwebtoken";
import type { Order } from "@shared/schema";

interface ConnectedClient {
  ws: WebSocket;
  type: "admin" | "chef" | "delivery";
  id: string;
  chefId?: string;
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
    const type = url.searchParams.get("type") as "admin" | "chef" | "delivery";

    if (!token || !type) {
      ws.close(1008, "Missing authentication");
      return;
    }

    let clientId: string;
    let chefId: string | undefined;

    try {
      if (type === "admin") {
        const payload = verifyAdminToken(token);
        if (!payload) {
          ws.close(1008, "Invalid admin token");
          return;
        }
        clientId = payload.adminId;
      } else if (type === "chef") {
        const JWT_SECRET = process.env.JWT_SECRET || "partner-jwt-secret-change-in-production";
        const payload = jwt.verify(token, JWT_SECRET) as { partnerId: string; chefId: string };
        if (!payload || !payload.chefId) {
          ws.close(1008, "Invalid chef token");
          return;
        }
        clientId = payload.partnerId;
        chefId = payload.chefId;
      } else if (type === "delivery") {
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

    const client: ConnectedClient = { ws, type, id: clientId, chefId };
    clients.set(clientId, client);

    console.log(`WebSocket client connected: ${type} ${clientId}${chefId ? ` (chef: ${chefId})` : ""}`);

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
    }
  });
}

export function notifyDeliveryAssignment(order: Order, deliveryPersonId: string) {
  const client = clients.get(deliveryPersonId);
  if (client && client.type === "delivery") {
    client.ws.send(JSON.stringify({
      type: "order_assigned",
      data: order
    }));
  }
}
