import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Subscription } from "@shared/schema";
import MetricsCards from "../components/metrics-cards";
import FilterSidebar from "../components/filter-sidebar";
import UpcomingRenewals from "../components/upcoming-renewals";
import SubscriptionCard from "../components/subscription-card";
import AddSubscriptionDialog from "../components/add-subscription-dialog";
import UserHeader from "../components/user-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
        {/* Add Subscription Button */}
        <div className="mb-6">
          <Button 
            onClick={() => setShowAddDialog(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="button-add-subscription"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Subscription
          </Button>
        </div>
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
