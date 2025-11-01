import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import type { Chef } from "@shared/schema";

export default function AdminChefs() {
  const { data: chefs, isLoading } = useQuery<Chef[]>({
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Chefs & Restaurants</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">View partner chefs and restaurants</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-video bg-slate-200 dark:bg-slate-700"></div>
                <CardContent className="p-4">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : chefs && chefs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {chefs.map((chef) => (
              <Card key={chef.id} data-testid={`card-chef-${chef.id}`}>
                <img src={chef.image} alt={chef.name} className="w-full aspect-video object-cover rounded-t-lg" />
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-1 text-slate-900 dark:text-slate-100">{chef.name}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{chef.description}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium text-slate-900 dark:text-slate-100">{chef.rating}</span>
                    </div>
                    <span className="text-slate-500 dark:text-slate-400">({chef.reviewCount} reviews)</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-slate-600 dark:text-slate-400">No chefs found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
