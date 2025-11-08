
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MenuDrawer from "@/components/MenuDrawer";
import CartSidebar from "@/components/CartSidebar";
import ChefListDrawer from "@/components/ChefListDrawer";
import SubscriptionDrawer from "@/components/SubscriptionDrawer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Package, Clock, CheckCircle, XCircle, ChefHat, Truck, Home } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import type { Category } from "../types/category";
import type { Order } from "../types/order";
import type { Chef } from "@shared/schema";

export default function MyOrders() {
  const [, setLocation] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isChefListOpen, setIsChefListOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const { user: replitUser } = useAuth();
  const userToken = localStorage.getItem("userToken");
  const savedUserData = localStorage.getItem("userData");
  const parsedUserData = savedUserData ? JSON.parse(savedUserData) : null;

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const { data: phoneOrders = [], isLoading: phoneOrdersLoading } = useQuery<Order[]>({
  queryKey: ["/api/user/orders", userToken],
  enabled: !!userToken && !replitUser,
  queryFn: async () => {
    const res = await fetch("/api/user/orders", {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    });
    if (!res.ok) throw new Error("Failed to fetch phone orders");
    return res.json();
  }
});

const { data: replitOrders = [], isLoading: replitOrdersLoading } = useQuery<Order[]>({
  queryKey: ["/api/orders"],
  enabled: !!replitUser,
  queryFn: async () => {
    const res = await fetch("/api/orders");
    if (!res.ok) throw new Error("Failed to fetch Replit orders");
    return res.json();
  }
});

  const orders = replitUser ? replitOrders : phoneOrders;
  const isLoading = replitUser ? replitOrdersLoading : phoneOrdersLoading;
  const user = replitUser || (userToken && parsedUserData ? parsedUserData : null);

  const { data: categories = [] } = useQuery<Category[]>({
  queryKey: ["/api/categories"],
  queryFn: async () => {
    const res = await fetch("/api/categories");
    if (!res.ok) throw new Error("Failed to fetch categories");
    return res.json();
  }
});

const { data: chefs = [] } = useQuery<Chef[]>({
  queryKey: ["/api/chefs"],
  queryFn: async () => {
    const res = await fetch("/api/chefs");
    if (!res.ok) throw new Error("Failed to fetch chefs");
    return res.json();
  }
});


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
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "confirmed":
      case "preparing":
        return <Package className="h-4 w-4" />;
      case "delivered":
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "cancelled":
        return <XCircle className="h-4 w-4" />;
      default:
        return <ShoppingBag className="h-4 w-4" />;
    }
  };

  const getOrderProgress = (order: any) => {
    const steps = [
      { 
        key: "placed", 
        label: "Order Placed", 
        icon: <ShoppingBag className="h-5 w-5" />,
        completed: true,
        description: order.paymentStatus === "pending" ? "Waiting for payment" : "Order received"
      },
      { 
        key: "payment", 
        label: "Payment Confirmed", 
        icon: <CheckCircle className="h-5 w-5" />,
        completed: order.paymentStatus === "confirmed" || order.status === "confirmed" || order.status === "preparing" || order.status === "out_for_delivery" || order.status === "delivered",
        description: order.paymentStatus === "pending" ? "Pending verification" : "Payment verified"
      },
      { 
        key: "preparing", 
        label: "Preparing", 
        icon: <ChefHat className="h-5 w-5" />,
        completed: order.status === "preparing" || order.status === "out_for_delivery" || order.status === "delivered",
        description: order.status === "preparing" ? "Chef is preparing" : order.status === "confirmed" ? "Waiting for chef" : "Ready"
      },
      { 
        key: "delivery", 
        label: "Out for Delivery", 
        icon: <Truck className="h-5 w-5" />,
        completed: order.status === "out_for_delivery" || order.status === "delivered",
        description: order.status === "out_for_delivery" ? "On the way" : "Pending pickup"
      },
      { 
        key: "delivered", 
        label: "Delivered", 
        icon: <Home className="h-5 w-5" />,
        completed: order.status === "delivered" || order.status === "completed",
        description: order.status === "delivered" ? "Order delivered" : "Not yet delivered"
      }
    ];

    return steps;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        onMenuClick={() => setIsMenuOpen(true)}
        onCartClick={() => setIsCartOpen(true)}
        onChefListClick={() => setIsChefListOpen(true)}
        onSubscriptionClick={() => setIsSubscriptionOpen(true)}
      />

      <main className="flex-1 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Orders</h1>
            <p className="text-muted-foreground">Track and manage your orders</p>
          </div>

          {!user ? (
            <Card className="text-center py-12">
              <CardContent className="flex flex-col items-center gap-4">
                <ShoppingBag className="h-16 w-16 text-muted-foreground" />
                <div>
                  <CardTitle className="mb-2">No Orders Yet</CardTitle>
                  <CardDescription>
                    Place an order to create an account and track your orders
                  </CardDescription>
                </div>
                <Button onClick={() => setLocation("/")} data-testid="button-go-home">
                  Start Shopping
                </Button>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-muted-foreground">Loading your orders...</p>
              </CardContent>
            </Card>
          ) : orders.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent className="flex flex-col items-center gap-4">
                <ShoppingBag className="h-16 w-16 text-muted-foreground" />
                <div>
                  <CardTitle className="mb-2">No orders yet</CardTitle>
                  <CardDescription>
                    Start ordering delicious food to see your orders here
                  </CardDescription>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order: any) => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">Order #{order.id.slice(0, 8)}</CardTitle>
                        <CardDescription>
                          {format(new Date(order.createdAt), "PPpp")}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(order.status)}
                          {order.status}
                        </span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Order Progress Timeline */}
                      {order.status !== "cancelled" && (
                        <div className="bg-muted/30 dark:bg-muted/20 rounded-lg p-4">
                          <h4 className="font-semibold mb-4 text-sm">Order Status Tracker</h4>
                          <div className="relative">
                            {getOrderProgress(order).map((step, idx) => (
                              <div key={step.key} className="flex gap-4 pb-6 last:pb-0">
                                {/* Timeline Line */}
                                <div className="relative flex flex-col items-center">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 ${
                                    step.completed 
                                      ? "bg-primary text-primary-foreground" 
                                      : "bg-muted text-muted-foreground"
                                  }`}>
                                    {step.icon}
                                  </div>
                                  {idx < getOrderProgress(order).length - 1 && (
                                    <div className={`w-0.5 h-full absolute top-10 ${
                                      step.completed ? "bg-primary" : "bg-muted"
                                    }`} />
                                  )}
                                </div>
                                
                                {/* Step Content */}
                                <div className="flex-1 -mt-1">
                                  <p className={`font-medium ${step.completed ? "text-foreground" : "text-muted-foreground"}`}>
                                    {step.label}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {step.description}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Cancelled Order Message */}
                      {order.status === "cancelled" && (
                        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-red-900 dark:text-red-100">
                            <XCircle className="h-5 w-5" />
                            <p className="font-medium">Order Cancelled</p>
                          </div>
                          {order.rejectionReason && (
                            <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                              Reason: {order.rejectionReason}
                            </p>
                          )}
                        </div>
                      )}

                      <div>
                        <h4 className="font-semibold mb-2">Items</h4>
                        <div className="space-y-2">
                          {order.items.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                {item.name} x {item.quantity}
                              </span>
                              <span className="font-medium">
                                ₹{item.price * item.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="border-t pt-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span>₹{order.subtotal}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Delivery Fee</span>
                          <span>₹{order.deliveryFee}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>Total</span>
                          <span>₹{order.total}</span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p><strong>Delivery to:</strong> {order.address}</p>
                        <p><strong>Contact:</strong> {order.phone}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      <MenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        categories={categories}
        onSubscriptionClick={() => {
          setIsMenuOpen(false);
          setIsSubscriptionOpen(true);
        }}
      />

      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />

 <ChefListDrawer
  isOpen={isChefListOpen}
  onClose={() => setIsChefListOpen(false)}
  category={selectedCategory}
  chefs={chefs}
  onChefClick={(chef) => {
    console.log("Selected chef:", chef);
    // future navigation goes here
  }}
/>


      <SubscriptionDrawer
        isOpen={isSubscriptionOpen}
        onClose={() => setIsSubscriptionOpen(false)}
      />
    </div>
  );
}
