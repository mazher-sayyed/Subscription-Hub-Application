import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";

interface Filters {
  search: string;
  category: string;
  costRange: string[];
  status: string[];
  renewalDate: string;
}

interface FilterSidebarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export default function FilterSidebar({ filters, onFiltersChange }: FilterSidebarProps) {
  const updateFilter = (key: keyof Filters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = (key: 'costRange' | 'status', value: string) => {
    const currentArray = filters[key];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateFilter(key, newArray);
  };

  return (
    <Card className="bg-card rounded-lg border border-border shadow-sm sticky top-6" data-testid="filter-sidebar">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Filters</h3>
        
        {/* Search */}
        <div className="mb-6">
          <Label className="block text-sm font-medium text-foreground mb-2">Search</Label>
          <div className="relative">
            <Input
              type="text"
              placeholder="Search subscriptions..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <Label className="block text-sm font-medium text-foreground mb-2">Category</Label>
          <Select value={filters.category || "all"} onValueChange={(value) => updateFilter('category', value === 'all' ? '' : value)}>
            <SelectTrigger data-testid="select-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Streaming">Streaming</SelectItem>
              <SelectItem value="Software">Software</SelectItem>
              <SelectItem value="Fitness">Fitness</SelectItem>
              <SelectItem value="News & Media">News & Media</SelectItem>
              <SelectItem value="Cloud Storage">Cloud Storage</SelectItem>
              <SelectItem value="Productivity">Productivity</SelectItem>
              <SelectItem value="Music">Music</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cost Range */}
        <div className="mb-6">
          <Label className="block text-sm font-medium text-foreground mb-2">Monthly Cost Range</Label>
          <div className="space-y-2">
            {[
              { value: "under-10", label: "Under $10" },
              { value: "10-25", label: "$10 - $25" },
              { value: "25-50", label: "$25 - $50" },
              { value: "over-50", label: "Over $50" }
            ].map((range) => (
              <div key={range.value} className="flex items-center space-x-2">
                <Checkbox
                  id={range.value}
                  checked={filters.costRange.includes(range.value)}
                  onCheckedChange={() => toggleArrayFilter('costRange', range.value)}
                  data-testid={`checkbox-cost-${range.value}`}
                />
                <Label htmlFor={range.value} className="text-sm text-foreground cursor-pointer">
                  {range.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div className="mb-6">
          <Label className="block text-sm font-medium text-foreground mb-2">Status</Label>
          <div className="space-y-2">
            {[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
              { value: "expiring", label: "Expiring Soon" }
            ].map((status) => (
              <div key={status.value} className="flex items-center space-x-2">
                <Checkbox
                  id={status.value}
                  checked={filters.status.includes(status.value)}
                  onCheckedChange={() => toggleArrayFilter('status', status.value)}
                  data-testid={`checkbox-status-${status.value}`}
                />
                <Label htmlFor={status.value} className="text-sm text-foreground cursor-pointer">
                  {status.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Renewal Date */}
        <div>
          <Label className="block text-sm font-medium text-foreground mb-2">Renewal Date</Label>
          <Select value={filters.renewalDate || "all"} onValueChange={(value) => updateFilter('renewalDate', value === 'all' ? '' : value)}>
            <SelectTrigger data-testid="select-renewal-date">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="next-7">Next 7 days</SelectItem>
              <SelectItem value="next-30">Next 30 days</SelectItem>
              <SelectItem value="next-90">Next 3 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
