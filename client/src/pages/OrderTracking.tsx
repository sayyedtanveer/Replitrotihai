import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Order } from "@shared/schema";
import { format } from "date-fns";
import {
  CheckCircle,
  Clock,
  Package,
  Truck,
  Home,
  ChefHat,
  MapPin,
  Phone,
  ShoppingBag,
  CreditCard,
  ArrowLeft,
  User, // Import User icon
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { Link } from "wouter";

export default function OrderTracking() {
  const [, params] = useRoute("/track/:orderId");
  const orderId = params?.orderId;
  const [wsConnected, setWsConnected] = useState(false);
  const userToken = localStorage.getItem("userToken");

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ["/api/orders", orderId],
    queryFn: async () => {
      // Don't send auth headers for order tracking - it's publicly accessible by order ID
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Order not found");
        }
        throw new Error("Failed to fetch order");
      }
      return response.json();
    },
    enabled: !!orderId,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!orderId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?type=customer&orderId=${orderId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected for order tracking");
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "order_update") {
        queryClient.setQueryData(["/api/orders", orderId], data.data);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setWsConnected(false);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [orderId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "confirmed":
      case "preparing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "out_for_delivery":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "delivered":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "paid":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "confirmed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200";
    }
  };

  const getOrderProgress = (order: Order) => {
    const steps = [
      {
        key: "placed",
        label: "Order Placed",
        icon: <ShoppingBag className="h-5 w-5" />,
        completed: true,
        description: format(new Date(order.createdAt), "MMM d, h:mm a"),
      },
      {
        key: "payment",
        label: "Payment Confirmed",
        icon: <CreditCard className="h-5 w-5" />,
        completed:
          order.paymentStatus === "confirmed" ||
          order.status === "confirmed" ||
          order.status === "accepted_by_chef" ||
          order.status === "preparing" ||
          order.status === "prepared" ||
          order.status === "assigned" ||
          order.status === "accepted_by_delivery" ||
          order.status === "out_for_delivery" ||
          order.status === "delivered",
        description:
          order.paymentStatus === "pending"
            ? "Waiting for verification"
            : order.approvedAt
            ? format(new Date(order.approvedAt), "MMM d, h:mm a")
            : "Payment verified",
      },
      {
        key: "preparing",
        label: "Preparing",
        icon: <ChefHat className="h-5 w-5" />,
        completed:
          order.status === "accepted_by_chef" ||
          order.status === "preparing" ||
          order.status === "prepared" ||
          order.status === "assigned" ||
          order.status === "accepted_by_delivery" ||
          order.status === "out_for_delivery" ||
          order.status === "delivered",
        description:
          order.status === "accepted_by_chef"
            ? "Chef accepted - preparing your food"
            : order.status === "preparing"
            ? "Chef is preparing your food"
            : order.status === "prepared"
            ? "Food is ready"
            : order.status === "confirmed"
            ? "Waiting for chef to accept"
            : order.status === "out_for_delivery" || order.status === "delivered"
            ? "Preparation complete"
            : "Pending",
      },
      {
        key: "delivery",
        label: order.status === "accepted_by_delivery" || order.status === "assigned"
          ? "Delivery Person Assigned"
          : "Out for Delivery",
        icon: <Truck className="h-5 w-5" />,
        completed: order.status === "accepted_by_delivery" || order.status === "assigned" || order.status === "out_for_delivery" || order.status === "delivered",
        description:
          order.status === "accepted_by_delivery"
            ? order.deliveryPersonName
              ? `Accepted by ${order.deliveryPersonName}${order.deliveryPersonPhone ? ` (${order.deliveryPersonPhone})` : ""}`
              : "Delivery person accepted"
            : order.status === "assigned"
            ? order.deliveryPersonName
              ? `Assigned to ${order.deliveryPersonName}${order.deliveryPersonPhone ? ` (${order.deliveryPersonPhone})` : ""}`
              : "Delivery person assigned"
            : order.status === "out_for_delivery"
            ? order.deliveryPersonName
              ? `${order.deliveryPersonName} is on the way${order.pickedUpAt ? ` (picked up at ${format(new Date(order.pickedUpAt), "h:mm a")})` : ""}`
              : order.pickedUpAt
              ? `On the way (picked up at ${format(new Date(order.pickedUpAt), "h:mm a")})`
              : "On the way"
            : order.status === "delivered"
            ? order.deliveryPersonName ? `Delivered by ${order.deliveryPersonName}` : "Delivered"
            : "Waiting for delivery assignment",
      },
      {
        key: "delivered",
        label: "Delivered",
        icon: <Home className="h-5 w-5" />,
        completed: order.status === "delivered" || order.status === "completed",
        description: order.deliveredAt
          ? format(new Date(order.deliveredAt), "MMM d, h:mm a")
          : "Not yet delivered",
      },
    ];

    return steps;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">Loading order details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
            <p className="text-muted-foreground mb-4">
              We couldn't find the order you're looking for.
            </p>
            <Link href="/">
              <Button data-testid="button-home">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Button variant="ghost" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Track Order</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">Order #{order.id.slice(0, 8)}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Placed on {format(new Date(order.createdAt), "PPpp")}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Badge className={getStatusColor(order.status)} data-testid="badge-status">
                  <Clock className="h-3 w-3 mr-1" />
                  {order.status.toUpperCase().replace("_", " ")}
                </Badge>
                <Badge className={getPaymentStatusColor(order.paymentStatus)} data-testid="badge-payment">
                  <CreditCard className="h-3 w-3 mr-1" />
                  Payment: {order.paymentStatus.toUpperCase()}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        {wsConnected && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-sm text-green-800 dark:text-green-200">
              Live tracking active - updates will appear automatically
            </p>
          </div>
        )}

        {order.paymentStatus === "pending" && (
          <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                    Waiting for Payment Confirmation
                  </h3>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                    Our team is verifying your payment. This usually takes a few minutes. We'll start
                    preparing your order once payment is confirmed.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Status Tracker</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {getOrderProgress(order).map((step, idx) => (
                <div key={step.key} className="flex gap-4 pb-6 last:pb-0">
                  <div className="relative flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center z-10 ${
                        step.completed
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {step.icon}
                    </div>
                    {idx < getOrderProgress(order).length - 1 && (
                      <div
                        className={`w-0.5 h-full absolute top-10 ${
                          step.completed ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    )}
                  </div>

                  <div className="flex-1 -mt-1">
                    <p
                      className={`font-semibold ${
                        step.completed ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{order.customerName}</p>
              <p className="text-sm text-muted-foreground mt-1">{order.address}</p>
              <div className="flex items-center gap-2 mt-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm">{order.phone}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {order.chefName && (
                  <div className="mb-3 pb-2 border-b">
                    <p className="text-xs text-muted-foreground">Prepared by</p>
                    <p className="font-medium flex items-center gap-1">
                      <ChefHat className="h-4 w-4" />
                      {order.chefName}
                    </p>
                  </div>
                )}
                {(order.items as any[]).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>
                      {item.name} x{item.quantity}
                    </span>
                    <span className="font-medium">₹{item.price * item.quantity}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span>₹{order.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Delivery Fee</span>
                    <span>₹{order.deliveryFee}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-base mt-1">
                    <span>Total</span>
                    <span>₹{order.total}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {(order.assignedTo && order.deliveryPersonName) && (
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Delivery Person
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Truck className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{order.deliveryPersonName}</p>
                    {order.deliveryPersonPhone && (
                      <div className="flex items-center gap-2 mt-1">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">{order.deliveryPersonPhone}</p>
                      </div>
                    )}
                  </div>
                </div>
                {order.status === "accepted_by_chef" && (
                  <p className="text-xs text-blue-600 mt-2">
                    🕐 Delivery person is preparing to pick up your order
                  </p>
                )}
                {order.status === "preparing" && (
                  <p className="text-xs text-blue-600 mt-2">
                    👨‍🍳 Food is being prepared - delivery person will pick up soon
                  </p>
                )}
                {order.status === "prepared" && (
                  <p className="text-xs text-blue-600 mt-2">
                    ✅ Food is ready - delivery person is on the way to pick up
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {order.status === "delivered" && (
          <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600 dark:text-green-400" />
              <h3 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-2">
                Order Delivered!
              </h3>
              <p className="text-green-800 dark:text-green-200">
                Thank you for ordering from RotiHai. We hope you enjoyed your meal!
              </p>
              {order.deliveredAt && (
                <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                  Delivered on {format(new Date(order.deliveredAt), "PPpp")}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}