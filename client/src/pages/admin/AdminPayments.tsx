
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Order } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { CheckCircle, Clock, XCircle, CreditCard } from "lucide-react";

export default function AdminPayments() {
  const { toast } = useToast();

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/admin", "orders", "payments"],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/orders?paymentPending=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch orders");
      return response.json();
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async ({ orderId }: { orderId: string }) => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/admin/orders/${orderId}/payment`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentStatus: "confirmed" }),
      });
      if (!response.ok) throw new Error("Failed to confirm payment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin", "orders", "payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/metrics"] });
      toast({
        title: "Payment confirmed",
        description: "Payment status has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to confirm payment",
        variant: "destructive",
      });
    },
  });

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

  const pendingPayments = orders?.filter(
    (order) => order.paymentStatus === "pending" || order.paymentStatus === "paid"
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CreditCard className="w-8 h-8" />
            Payment Confirmation
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Review and confirm pending UPI payments
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-48"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : pendingPayments && pendingPayments.length > 0 ? (
          <div className="space-y-4">
            {pendingPayments.map((order) => (
              <Card key={order.id} data-testid={`card-payment-${order.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">Order #{order.id.slice(0, 8)}</CardTitle>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {order.customerName} • {order.phone}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {format(new Date(order.createdAt), "PPp")}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                        {order.paymentStatus === "pending" && <Clock className="w-3 h-3 mr-1" />}
                        {order.paymentStatus === "paid" && <CheckCircle className="w-3 h-3 mr-1" />}
                        {order.paymentStatus.toUpperCase()}
                      </Badge>
                      {order.paymentQrShown && (
                        <Badge variant="outline" className="text-xs">
                          QR Shown
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Delivery Address
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{order.address}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Items
                    </p>
                    <div className="space-y-1">
                      {(order.items as any[]).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">
                            {item.name} x {item.quantity}
                          </span>
                          <span className="text-slate-900 dark:text-slate-100 font-medium">
                            ₹{item.price * item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">Subtotal:</span>
                          <span className="text-slate-900 dark:text-slate-100">
                            ₹{order.subtotal}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">Delivery Fee:</span>
                          <span className="text-slate-900 dark:text-slate-100">
                            ₹{order.deliveryFee}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold text-lg">
                          <span>Total:</span>
                          <span className="text-primary">₹{order.total}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => confirmPaymentMutation.mutate({ orderId: order.id })}
                        disabled={
                          confirmPaymentMutation.isPending || order.paymentStatus === "confirmed"
                        }
                        className="flex-1"
                        data-testid={`button-confirm-${order.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirm Payment
                      </Button>
                    </div>

                    {order.paymentQrShown && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        💡 Customer was shown UPI QR code. Verify payment in your UPI app before
                        confirming.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
              <p className="text-slate-600 dark:text-slate-400">No pending payments</p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                All payments have been confirmed
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
