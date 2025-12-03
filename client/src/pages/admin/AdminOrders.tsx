import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { Order, DeliveryPersonnel } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Search, Filter, Truck, User } from "lucide-react";
import { useState } from "react";

export default function AdminOrders() {
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedOrderForAssignment, setSelectedOrderForAssignment] = useState<Order | null>(null);
  const [selectedDeliveryPersonId, setSelectedDeliveryPersonId] = useState("");
  const itemsPerPage = 100;

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/admin", "orders"],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch orders");
      const allOrders = await response.json();
      // Sort by latest first (descending order by createdAt)
      return allOrders.sort((a: Order, b: Order) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
  });

  const { data: chefs } = useQuery({
    queryKey: ["/api/admin", "chefs"],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/chefs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch chefs");
      return response.json();
    },
  });

  const { data: deliveryPersonnel } = useQuery<DeliveryPersonnel[]>({
    queryKey: ["/api/admin", "delivery-personnel"],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/delivery-personnel", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch delivery personnel");
      return response.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update order status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/metrics"] });
      toast({
        title: "Order updated",
        description: "Order status has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update order status",
        variant: "destructive",
      });
    },
  });

  const assignDeliveryMutation = useMutation({
    mutationFn: async ({ orderId, deliveryPersonId }: { orderId: string; deliveryPersonId: string }) => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/admin/orders/${orderId}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deliveryPersonId }),
      });
      if (!response.ok) throw new Error("Failed to assign delivery person");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin", "delivery-personnel"] });
      setAssignDialogOpen(false);
      setSelectedOrderForAssignment(null);
      setSelectedDeliveryPersonId("");
      toast({
        title: "Delivery assigned",
        description: "Delivery person has been assigned successfully",
      });
    },
    onError: () => {
      toast({
        title: "Assignment failed",
        description: "Failed to assign delivery person",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "confirmed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "accepted_by_chef":
        return "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200";
      case "preparing":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "prepared":
        return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200";
      case "accepted_by_delivery":
        return "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200";
      case "out_for_delivery":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "delivered":
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200";
    }
  };

  const canAssignDelivery = (order: Order) => {
    return order.status === "confirmed" || order.status === "preparing";
  };

  const getDeliveryPersonName = (deliveryPersonId: string | null) => {
    if (!deliveryPersonId || !deliveryPersonnel) return null;
    const person = deliveryPersonnel.find((dp) => dp.id === deliveryPersonId);
    return person ? person.name : "Unknown";
  };

  const availableDeliveryPersonnel = deliveryPersonnel?.filter((dp) =>
    dp.isActive
  ) || [];

  const handleOpenAssignDialog = (order: Order) => {
    setSelectedOrderForAssignment(order);
    setSelectedDeliveryPersonId(order.assignedTo || "");
    setAssignDialogOpen(true);
  };

  const handleAssignDelivery = () => {
    if (!selectedOrderForAssignment || !selectedDeliveryPersonId) {
      toast({
        title: "Validation error",
        description: "Please select a delivery person",
        variant: "destructive",
      });
      return;
    }
    assignDeliveryMutation.mutate({
      orderId: selectedOrderForAssignment.id,
      deliveryPersonId: selectedDeliveryPersonId,
    });
  };

  // Filter and search orders
  const filteredOrders = orders?.filter((order) => {
    const matchesSearch =
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.phone.includes(searchQuery) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Orders</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage customer orders and update their status
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
            Flow: Pending → Confirmed (Admin) → Preparing (Chef) → Out for Delivery (Chef/Delivery) → Delivered (Delivery)
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search by order ID, customer name, or phone..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="prepared">Prepared</SelectItem>
                  <SelectItem value="accepted_by_delivery">Accepted by Delivery</SelectItem>
                  <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">
              Showing {paginatedOrders.length} of {filteredOrders.length} orders
            </p>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12 text-slate-600 dark:text-slate-400">
                Loading orders...
              </div>
            ) : filteredOrders.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Chef</TableHead>
                      <TableHead>Delivery</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedOrders.map((order) => (
                      <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                        <TableCell className="font-medium">
                          #{order.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.customerName}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{order.phone}</p>
                            {order.deliveryTime && (
                              <p className="text-xs font-semibold text-orange-600 bg-orange-50 dark:bg-orange-900 px-2 py-0.5 rounded mt-1 inline-block">
                                🕐 {order.deliveryTime}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            {(order.items as any[]).map((item, idx) => (
                              <p key={idx} className="text-sm">
                                {item.name} x{item.quantity}
                              </p>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">₹{order.total}</TableCell>
                        <TableCell>
                          {order.chefId && chefs ? (
                            <span className="text-sm text-primary">
                              {chefs.find((c: any) => c.id === order.chefId)?.name || "Unknown"}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            {order.assignedTo ? (
                              <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                <User className="h-3 w-3" />
                                {getDeliveryPersonName(order.assignedTo)}
                              </Badge>
                            ) : (
                              <span className="text-sm text-slate-400">Not assigned</span>
                            )}
                            {canAssignDelivery(order) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenAssignDialog(order)}
                                data-testid={`button-assign-delivery-${order.id}`}
                              >
                                <Truck className="h-3 w-3 mr-1" />
                                {order.assignedTo ? "Reassign" : "Assign"}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>
                            {format(new Date(order.createdAt), "MMM d, yyyy")}
                          </div>
                          <div className="text-xs text-slate-500">
                            {format(new Date(order.createdAt), "h:mm a")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(order.status)} data-testid={`badge-status-${order.id}`}>
                            {order.status.replace("_", " ").toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={order.status}
                            onValueChange={(status) => updateStatusMutation.mutate({ orderId: order.id, status })}
                            disabled={updateStatusMutation.isPending}
                          >
                            <SelectTrigger className="w-36" data-testid={`select-status-${order.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="preparing">Preparing</SelectItem>
                              <SelectItem value="prepared">Prepared</SelectItem>
                              <SelectItem value="accepted_by_delivery">Accepted by Delivery</SelectItem>
                              <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="p-4 border-t">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => setCurrentPage(pageNum)}
                                isActive={currentPage === pageNum}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-600 dark:text-slate-400">No orders found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assign Delivery Person Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Delivery Person</DialogTitle>
              <DialogDescription>
                {selectedOrderForAssignment && (
                  <>
                    Assign a delivery person to Order #{selectedOrderForAssignment.id.slice(0, 8)} for {selectedOrderForAssignment.customerName}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {deliveryPersonnel && deliveryPersonnel.length > 0 ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="delivery-person">Select Delivery Person</Label>
                    <Select
                      value={selectedDeliveryPersonId}
                      onValueChange={setSelectedDeliveryPersonId}
                    >
                      <SelectTrigger id="delivery-person" data-testid="select-delivery-person">
                        <SelectValue placeholder="Choose a delivery person" />
                      </SelectTrigger>
                      <SelectContent>
                        {deliveryPersonnel.map((person) => (
                          <SelectItem key={person.id} value={person.id}>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>{person.name}</span>
                              <span className="text-xs text-muted-foreground">• {person.phone}</span>
                              <Badge
                                variant={person.status === "available" ? "default" : "secondary"}
                                className="ml-auto"
                              >
                                {person.status}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Showing {deliveryPersonnel.filter(dp => dp.isActive).length} active delivery personnel.
                    {deliveryPersonnel.filter(dp => !dp.isActive).length} are inactive.
                    {deliveryPersonnel.filter(dp => dp.status !== "available" && dp.isActive).length} are currently busy.
                  </p>
                </>
              ) : (
                <div className="text-center py-8">
                  <Truck className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">No delivery personnel available</p>
                  <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                    Please add delivery personnel to the system
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setAssignDialogOpen(false)}
                disabled={assignDeliveryMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignDelivery}
                disabled={assignDeliveryMutation.isPending || !selectedDeliveryPersonId}
                data-testid="button-confirm-assign"
              >
                {assignDeliveryMutation.isPending ? "Assigning..." : "Assign Delivery"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}