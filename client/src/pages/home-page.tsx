import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Wallet, Plus, TrendingUp, TrendingDown, DollarSign, Users, Edit, Trash2, Filter, ChevronLeft, ChevronRight, BarChart3, List, PlusCircle } from "lucide-react";
import { Transaction, InsertTransaction, Category } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTransactionSchema } from "@shared/schema";
import { z } from "zod";

const transactionFormSchema = insertTransactionSchema.extend({
  date: z.string().min(1, "Date is required"),
  categoryId: z.string().min(1, "Category is required"),
});

type TransactionForm = z.infer<typeof transactionFormSchema>;

export default function HomePage() {
  const [currentView, setCurrentView] = useState<"dashboard" | "transactions">("dashboard");
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState({
    category: "",
    fromDate: "",
    toDate: "",
  });

  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();

  // Queries
  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.fromDate) params.append('fromDate', filters.fromDate);
      if (filters.toDate) params.append('toDate', filters.toDate);
      
      const url = `/api/transactions${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      return response.json();
    },
    enabled: !!user,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    enabled: !!user,
  });

  // Mutations
  const createTransactionMutation = useMutation({
    mutationFn: async (data: InsertTransaction) => {
      const res = await apiRequest("POST", "/api/transactions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setIsTransactionModalOpen(false);
      setEditingTransaction(null);
      toast({
        title: "Success",
        description: "Transaction created successfully",
      });
    },
  });

  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertTransaction> }) => {
      const res = await apiRequest("PUT", `/api/transactions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setIsTransactionModalOpen(false);
      setEditingTransaction(null);
      toast({
        title: "Success",
        description: "Transaction updated successfully",
      });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
    },
  });

  // Form
  const form = useForm<TransactionForm>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      description: "",
      categoryId: "",
      amount: "0",
      date: new Date().toISOString().split('T')[0],
    },
  });

  const handleSubmit = async (data: TransactionForm) => {
    if (editingTransaction) {
      updateTransactionMutation.mutate({
        id: editingTransaction.id,
        data,
      });
    } else {
      createTransactionMutation.mutate(data);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    form.reset({
      description: transaction.description,
      categoryId: transaction.categoryId,
      amount: transaction.amount,
      date: transaction.date,
    });
    setIsTransactionModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this transaction?")) {
      deleteTransactionMutation.mutate(id);
    }
  };

  const openNewTransactionModal = () => {
    setEditingTransaction(null);
    form.reset({
      description: "",
      categoryId: "",
      amount: "0",
      date: new Date().toISOString().split('T')[0],
    });
    setIsTransactionModalOpen(true);
  };

  // Helper function to get category by ID
  const getCategoryById = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId);
  };

  // Calculate summary data
  const currentMonth = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" });
  const currentDate = new Date();
  const currentMonthTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate.getMonth() === currentDate.getMonth() && 
           transactionDate.getFullYear() === currentDate.getFullYear();
  });

  const monthSummary = currentMonthTransactions.reduce(
    (acc, transaction) => {
      const amount = parseFloat(transaction.amount);
      if (amount > 0) {
        acc.income += amount;
      } else {
        acc.expenses += Math.abs(amount);
      }
      return acc;
    },
    { income: 0, expenses: 0 }
  );

  const balance = monthSummary.income - monthSummary.expenses;

  // Category breakdown
  const categoryBreakdown = currentMonthTransactions
    .filter(t => parseFloat(t.amount) < 0)
    .reduce((acc, transaction) => {
      const category = getCategoryById(transaction.categoryId);
      const categoryName = category?.name || 'Unknown';
      const amount = Math.abs(parseFloat(transaction.amount));
      acc[categoryName] = (acc[categoryName] || 0) + amount;
      return acc;
    }, {} as Record<string, number>);

  const categoryEntries = Object.entries(categoryBreakdown)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  // Recent transactions (last 5)
  const recentTransactions = transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const getCategoryColor = (categoryId: string) => {
    const category = getCategoryById(categoryId);
    return category?.color || "#6B7280";
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = getCategoryById(categoryId);
    return category?.icon || "📦";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg mr-3">
                <Wallet className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-800">FamilyBudget</span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center text-sm text-gray-600">
                <Users className="h-4 w-4 mr-1" />
                <span>Team: {user?.teamId}</span>
              </div>

              <div className="relative">
                <Button
                  variant="ghost"
                  className="w-8 h-8 rounded-full p-0"
                  onClick={() => logoutMutation.mutate()}
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === "dashboard" ? (
          <div>
            {/* Dashboard Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
                <p className="text-gray-600 mt-1">Overview of your family's finances</p>
              </div>
              <Button onClick={openNewTransactionModal}>
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </div>

            {/* Month Selector */}
            <div className="mb-6">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-semibold text-gray-800">{currentMonth}</h2>
                <Button variant="ghost" size="sm">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                      <TrendingDown className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Total Income</p>
                      <p className="text-2xl font-bold text-green-600">
                        ${monthSummary.income.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Total Expenses</p>
                      <p className="text-2xl font-bold text-red-600">
                        ${monthSummary.expenses.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Net Balance</p>
                      <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {balance >= 0 ? '+' : ''}${balance.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Breakdown and Recent Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Expenses by Category */}
              <Card>
                <CardHeader>
                  <CardTitle>Expenses by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  {categoryEntries.length > 0 ? (
                    <div className="space-y-4">
                      {categoryEntries.map(([categoryName, amount]) => (
                        <div key={categoryName} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-gray-500 rounded-full mr-3"></div>
                            <span className="text-gray-700 capitalize">{categoryName}</span>
                          </div>
                          <span className="font-semibold text-gray-800">${amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No expenses this month</p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Transactions */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Recent Transactions</CardTitle>
                    <Button variant="link" onClick={() => setCurrentView("transactions")}>
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {recentTransactions.length > 0 ? (
                    <div className="space-y-3">
                      {recentTransactions.map((transaction) => {
                        const category = getCategoryById(transaction.categoryId);
                        return (
                          <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gray-500 rounded-lg flex items-center justify-center mr-3 text-white text-sm">
                                {getCategoryIcon(transaction.categoryId)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-800">{transaction.description}</p>
                                <p className="text-xs text-gray-600">{new Date(transaction.date).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <span className={`text-sm font-semibold ${parseFloat(transaction.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {parseFloat(transaction.amount) >= 0 ? '+' : ''}${Math.abs(parseFloat(transaction.amount)).toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No transactions yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div>
            {/* Transactions Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Transactions</h1>
                <p className="text-gray-600 mt-1">Manage your family's transactions</p>
              </div>
              <Button onClick={openNewTransactionModal}>
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select value={filters.category || "all"} onValueChange={(value) => setFilters({...filters, category: value === "all" ? "" : value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>From Date</Label>
                    <Input 
                      type="date" 
                      value={filters.fromDate}
                      onChange={(e) => setFilters({...filters, fromDate: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label>To Date</Label>
                    <Input 
                      type="date" 
                      value={filters.toDate}
                      onChange={(e) => setFilters({...filters, toDate: e.target.value})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transactions Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingTransactions ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            Loading transactions...
                          </TableCell>
                        </TableRow>
                      ) : transactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            No transactions found
                          </TableCell>
                        </TableRow>
                      ) : (
                        transactions.map((transaction) => {
                          const category = getCategoryById(transaction.categoryId);
                          return (
                            <TableRow key={transaction.id}>
                              <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                              <TableCell>{transaction.description}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="capitalize">
                                  {category?.name || 'Unknown'}
                                </Badge>
                              </TableCell>
                              <TableCell className={`text-right font-medium ${parseFloat(transaction.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {parseFloat(transaction.amount) >= 0 ? '+' : ''}${Math.abs(parseFloat(transaction.amount)).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex justify-center space-x-2">
                                  <Button variant="ghost" size="sm" onClick={() => handleEdit(transaction)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDelete(transaction.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Transaction Modal */}
        <Dialog open={isTransactionModalOpen} onOpenChange={setIsTransactionModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTransaction ? "Edit Transaction" : "Add Transaction"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Enter description"
                  {...form.register("description")}
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="categoryId">Category</Label>
                <Select value={form.watch("categoryId")} onValueChange={(value) => form.setValue("categoryId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.categoryId && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.categoryId.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="amount">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-8"
                    {...form.register("amount")}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">Enter positive amount for income, negative for expenses</p>
                {form.formState.errors.amount && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.amount.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  {...form.register("date")}
                />
                {form.formState.errors.date && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.date.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsTransactionModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTransactionMutation.isPending || updateTransactionMutation.isPending}
                >
                  {editingTransaction ? "Update Transaction" : "Save Transaction"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t lg:hidden">
        <div className="grid grid-cols-3 h-16">
          <Button
            variant="ghost"
            className={`flex flex-col items-center justify-center text-xs h-full rounded-none ${
              currentView === "dashboard" ? "text-blue-600" : "text-gray-400"
            }`}
            onClick={() => setCurrentView("dashboard")}
          >
            <BarChart3 className="h-5 w-5 mb-1" />
            <span>Dashboard</span>
          </Button>
          <Button
            variant="ghost"
            className={`flex flex-col items-center justify-center text-xs h-full rounded-none ${
              currentView === "transactions" ? "text-blue-600" : "text-gray-400"
            }`}
            onClick={() => setCurrentView("transactions")}
          >
            <List className="h-5 w-5 mb-1" />
            <span>Transactions</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center justify-center text-xs text-gray-400 h-full rounded-none"
            onClick={openNewTransactionModal}
          >
            <PlusCircle className="h-5 w-5 mb-1" />
            <span>Add</span>
          </Button>
        </div>
      </nav>
    </div>
  );
}
