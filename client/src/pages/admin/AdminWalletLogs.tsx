import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet, ArrowUpCircle, ArrowDownCircle, Gift, ShoppingCart, Search, RefreshCw, Calendar } from "lucide-react";
import { format } from "date-fns";

interface WalletTransaction {
  id: string;
  userId: string;
  amount: number;
  type: "credit" | "debit" | "referral_bonus" | "order_discount";
  description: string;
  referenceId: string | null;
  referenceType: string | null;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
  userName?: string;
  userPhone?: string;
}

export default function AdminWalletLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  const { data: transactions = [], isLoading, refetch } = useQuery<WalletTransaction[]>({
    queryKey: ["/api/admin/wallet-transactions", { date: dateFilter }],
  });

  const { data: stats } = useQuery<{
    totalCredits: number;
    totalDebits: number;
    totalReferralBonus: number;
    totalOrderDiscounts: number;
  }>({
    queryKey: ["/api/admin/wallet-stats"],
  });

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.userPhone?.includes(searchTerm) ||
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.referenceId?.includes(searchTerm);

    const matchesType = typeFilter === "all" || tx.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "credit":
        return <Badge variant="default" className="bg-green-600"><ArrowUpCircle className="w-3 h-3 mr-1" />Credit</Badge>;
      case "debit":
        return <Badge variant="destructive"><ArrowDownCircle className="w-3 h-3 mr-1" />Debit</Badge>;
      case "referral_bonus":
        return <Badge variant="secondary" className="bg-purple-600 text-white"><Gift className="w-3 h-3 mr-1" />Referral</Badge>;
      case "order_discount":
        return <Badge variant="outline"><ShoppingCart className="w-3 h-3 mr-1" />Order</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getAmountColor = (type: string) => {
    if (type === "credit" || type === "referral_bonus") return "text-green-600";
    if (type === "debit" || type === "order_discount") return "text-red-600";
    return "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Wallet Transactions</h1>
          <p className="text-muted-foreground">View all wallet transaction logs</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" data-testid="button-refresh">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-total-credits">
              +₹{stats?.totalCredits || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Debits</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-total-debits">
              -₹{stats?.totalDebits || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Referral Bonuses</CardTitle>
            <Gift className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600" data-testid="text-referral-bonus">
              ₹{stats?.totalReferralBonus || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Order Discounts</CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-order-discounts">
              ₹{stats?.totalOrderDiscounts || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>All wallet transactions across users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user, description, or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-type-filter">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
                <SelectItem value="debit">Debit</SelectItem>
                <SelectItem value="referral_bonus">Referral Bonus</SelectItem>
                <SelectItem value="order_discount">Order Discount</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-10 w-[180px]"
                data-testid="input-date-filter"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{tx.userName || "Unknown"}</div>
                          <div className="text-sm text-muted-foreground">{tx.userPhone || "-"}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(tx.type)}</TableCell>
                      <TableCell className={`font-medium ${getAmountColor(tx.type)}`}>
                        {tx.type === "credit" || tx.type === "referral_bonus" ? "+" : "-"}₹{Math.abs(tx.amount)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={tx.description}>
                        {tx.description}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="text-muted-foreground">₹{tx.balanceBefore}</div>
                          <div className="font-medium">₹{tx.balanceAfter}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {tx.referenceType && tx.referenceId ? (
                          <div>
                            <div className="capitalize">{tx.referenceType}</div>
                            <div className="text-muted-foreground font-mono text-xs">
                              {tx.referenceId.slice(0, 8)}...
                            </div>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(tx.createdAt), "dd MMM yyyy HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
