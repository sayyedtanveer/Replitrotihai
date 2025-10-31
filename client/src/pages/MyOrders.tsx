
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag } from "lucide-react";

export default function MyOrders() {
  // TODO: Fetch actual orders from API
  const orders = [];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Orders</h1>
            <p className="text-muted-foreground">Track and manage your orders</p>
          </div>

          {orders.length === 0 ? (
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
              {/* Orders will be displayed here */}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
