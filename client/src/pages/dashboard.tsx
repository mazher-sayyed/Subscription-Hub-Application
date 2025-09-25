import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { type Subscription } from "@shared/schema";
import MetricsCards from "../components/metrics-cards";
import FilterSidebar from "../components/filter-sidebar";
import UpcomingRenewals from "../components/upcoming-renewals";
import SubscriptionCard from "../components/subscription-card";
import AddSubscriptionDialog from "../components/add-subscription-dialog";
import UserHeader from "../components/user-header";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plus, AlertTriangle, ShoppingCart, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Filters {
  search: string;
  category: string;
  costRange: string[];
  status: string[];
  renewalDate: string;
}

export default function Dashboard() {
  const [filters, setFilters] = useState<Filters>({
    search: "",
    category: "",
    costRange: [],
    status: ["active", "expiring"],
    renewalDate: ""
  });
  const [sortBy, setSortBy] = useState("name");
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: subscriptions = [], isLoading } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  // Query for expiring subscriptions (within 30 days)
  const { data: expiringSubscriptions = [] } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions/expiring?days=30"],
  });

  // Calculate expiration urgency (only for future dates)
  const getExpirationUrgency = (expirationDate: string | null) => {
    if (!expirationDate) return null;
    const today = new Date();
    const expiry = new Date(expirationDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Only return urgency for future dates
    if (daysUntilExpiry < 0) return null;
    
    if (daysUntilExpiry <= 3) return { level: 'critical', days: daysUntilExpiry, color: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200' };
    if (daysUntilExpiry <= 7) return { level: 'warning', days: daysUntilExpiry, color: 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-200' };
    if (daysUntilExpiry <= 30) return { level: 'info', days: daysUntilExpiry, color: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200' };
    return null;
  };

  const urgentExpirations = expiringSubscriptions.filter(sub => {
    const urgency = getExpirationUrgency(sub.expirationDate);
    return urgency && urgency.level === 'critical' && urgency.days >= 0; // Double-check for safety
  });

  const totalMonthlySpend = subscriptions.reduce((sum, sub) => {
    const cost = parseFloat(sub.cost);
    return sum + (sub.billingCycle === 'annual' ? cost / 12 : cost);
  }, 0);

  const filteredSubscriptions = subscriptions.filter(sub => {
    // Search filter
    if (filters.search && !sub.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    
    // Category filter
    if (filters.category && filters.category !== "all" && sub.category !== filters.category) {
      return false;
    }
    
    // Status filter
    if (filters.status.length > 0 && !filters.status.includes(sub.status)) {
      return false;
    }
    
    // Cost range filter
    if (filters.costRange.length > 0) {
      const cost = parseFloat(sub.cost);
      const matchesRange = filters.costRange.some(range => {
        switch (range) {
          case "under-10": return cost < 10;
          case "10-25": return cost >= 10 && cost <= 25;
          case "25-50": return cost >= 25 && cost <= 50;
          case "over-50": return cost > 50;
          default: return true;
        }
      });
      if (!matchesRange) return false;
    }
    
    // Renewal date filter
    if (filters.renewalDate) {
      const now = new Date();
      const renewalDate = new Date(sub.renewalDate);
      const daysDiff = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (filters.renewalDate) {
        case "next-7": return daysDiff <= 7 && daysDiff >= 0;
        case "next-30": return daysDiff <= 30 && daysDiff >= 0;
        case "next-90": return daysDiff <= 90 && daysDiff >= 0;
        default: return true;
      }
    }
    
    return true;
  });

  const sortedSubscriptions = [...filteredSubscriptions].sort((a, b) => {
    switch (sortBy) {
      case "cost-high":
        return parseFloat(b.cost) - parseFloat(a.cost);
      case "cost-low":
        return parseFloat(a.cost) - parseFloat(b.cost);
      case "renewal":
        return new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime();
      default:
        return a.name.localeCompare(b.name);
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <UserHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Expiration Alerts */}
        {urgentExpirations.length > 0 && (
          <Alert className="mb-6 bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200" data-testid="alert-expiring-subscriptions">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="font-semibold">Urgent: Subscriptions Expiring Soon!</AlertTitle>
            <AlertDescription className="mt-2">
              {urgentExpirations.length} subscription{urgentExpirations.length > 1 ? 's' : ''} expiring within 3 days:
              {urgentExpirations.slice(0, 3).map(sub => {
                const urgency = getExpirationUrgency(sub.expirationDate);
                return (
                  <div key={sub.id} className="flex items-center gap-2 mt-2" data-testid={`text-expiring-${sub.id}`}>
                    <Clock className="h-3 w-3" />
                    <span className="font-medium">{sub.name}</span> - 
                    <span className="text-red-600 dark:text-red-400">
                      {urgency?.days === 0 ? 'Expires today!' : 
                       urgency?.days === 1 ? 'Expires tomorrow!' : 
                       `Expires in ${urgency?.days} days`}
                    </span>
                  </div>
                );
              })}
              {urgentExpirations.length > 3 && (
                <div className="text-sm mt-2 opacity-75">
                  and {urgentExpirations.length - 3} more...
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={() => setShowAddDialog(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="button-add-subscription"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Subscription
          </Button>
          
          <Link to="/marketplace">
            <Button 
              variant="outline" 
              className="w-full sm:w-auto bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900"
              data-testid="button-browse-services"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Browse Streaming Services
            </Button>
          </Link>
        </div>

        {/* Subscription Summary */}
        {subscriptions.length > 0 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg border border-blue-200 dark:border-blue-800" data-testid="summary-card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100" data-testid="text-total-subscriptions">
                  Total Active Subscriptions: {subscriptions.filter(s => s.status === 'active').length}
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1" data-testid="text-monthly-spend">
                  Estimated Monthly Spend: ${totalMonthlySpend.toFixed(2)}
                </p>
              </div>
              {expiringSubscriptions.length > 0 && (
                <div className="text-right">
                  <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300" data-testid="text-expiring-count">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {expiringSubscriptions.length} expiring in 30 days
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Metrics Cards */}
        <MetricsCards subscriptions={subscriptions} />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filter Sidebar */}
          <div className="lg:col-span-1">
            <FilterSidebar filters={filters} onFiltersChange={setFilters} />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Upcoming Renewals */}
            <UpcomingRenewals subscriptions={subscriptions} />

            {/* All Subscriptions */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground" data-testid="text-all-subscriptions">
                  All Subscriptions
                </h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Sort by:</span>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-48" data-testid="select-sort">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="cost-high">Cost (High to Low)</SelectItem>
                      <SelectItem value="cost-low">Cost (Low to High)</SelectItem>
                      <SelectItem value="renewal">Renewal Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {sortedSubscriptions.length === 0 ? (
                <div className="text-center py-12" data-testid="empty-state">
                  <div className="text-muted-foreground">
                    {filters.search || filters.category || filters.costRange.length > 0 || filters.renewalDate
                      ? "No subscriptions match your filters"
                      : "No subscriptions found"}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" data-testid="subscriptions-grid">
                  {sortedSubscriptions.map((subscription) => (
                    <SubscriptionCard key={subscription.id} subscription={subscription} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AddSubscriptionDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
    </div>
  );
}
