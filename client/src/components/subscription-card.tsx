import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type Subscription } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Edit, X, RotateCcw, Trash2, ExternalLink, Play } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import EditSubscriptionDialog from "./edit-subscription-dialog";
import { launchService } from "@/utils/launch-helpers";

interface SubscriptionCardProps {
  subscription: Subscription;
}

export default function SubscriptionCard({ subscription }: SubscriptionCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLaunching, setIsLaunching] = useState(false);

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      await apiRequest("PATCH", `/api/subscriptions/${subscription.id}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({ title: "Subscription updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update subscription", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/subscriptions/${subscription.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({ title: "Subscription deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete subscription", variant: "destructive" });
    }
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      active: "status-active",
      inactive: "status-inactive", 
      expiring: "status-expiring"
    };
    
    const labels = {
      active: "Active",
      inactive: "Inactive",
      expiring: "Expiring Soon"
    };

    return (
      <Badge className={`text-xs px-2 py-1 font-medium ${styles[status as keyof typeof styles] || styles.inactive}`}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const handleCancel = () => {
    updateStatusMutation.mutate("inactive");
  };

  const handleReactivate = () => {
    updateStatusMutation.mutate("active");
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this subscription?")) {
      deleteMutation.mutate();
    }
  };

  const handleLaunch = async () => {
    setIsLaunching(true);
    try {
      const success = await launchService(subscription.id, subscription.name);
      if (success) {
        toast({
          title: "Service Launched",
          description: `Opened ${subscription.name} in a new tab`,
        });
        // Refresh subscriptions to update lastUsed timestamp
        queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      } else {
        toast({
          title: "Launch Failed", 
          description: "Unable to launch this service",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Launch Error",
        description: "Failed to launch service. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <>
      <Card className="bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow" data-testid={`card-subscription-${subscription.id}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            {subscription.logoUrl && (
              <img 
                src={subscription.logoUrl} 
                alt={subscription.name}
                className="w-16 h-10 object-contain rounded"
                data-testid={`img-logo-${subscription.id}`}
              />
            )}
            {getStatusBadge(subscription.status)}
          </div>
          
          <h4 className="font-semibold text-foreground mb-2" data-testid={`text-name-${subscription.id}`}>
            {subscription.name}
          </h4>
          <p className="text-muted-foreground text-sm mb-1" data-testid={`text-category-${subscription.id}`}>
            {subscription.category}
          </p>
          <p className="text-2xl font-bold text-foreground mb-4" data-testid={`text-cost-${subscription.id}`}>
            ${subscription.cost}
            <span className="text-sm font-normal text-muted-foreground">/{subscription.billingCycle.slice(0, -2)}</span>
          </p>
          <p className="text-xs text-muted-foreground mb-4" data-testid={`text-renewal-${subscription.id}`}>
            {subscription.status === "inactive" 
              ? `Cancelled: ${new Date(subscription.renewalDate).toLocaleDateString()}`
              : `Next renewal: ${new Date(subscription.renewalDate).toLocaleDateString()}`
            }
          </p>
          
          <div className="flex space-x-2">
            {subscription.status === "active" ? (
              <Button 
                variant="default" 
                size="sm" 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                onClick={handleLaunch}
                disabled={isLaunching}
                data-testid={`button-launch-${subscription.id}`}
              >
                {isLaunching ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent mr-1" />
                    Launching...
                  </>
                ) : (
                  <>
                    <Play className="mr-1 h-3 w-3" />
                    Launch
                  </>
                )}
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                disabled
                data-testid={`button-launch-disabled-${subscription.id}`}
              >
                <ExternalLink className="mr-1 h-3 w-3" />
                Inactive
              </Button>
            )}
            
            <Button 
              variant="secondary" 
              size="sm" 
              className="flex-1"
              onClick={() => setShowEditDialog(true)}
              data-testid={`button-modify-${subscription.id}`}
            >
              <Edit className="mr-1 h-3 w-3" />
              Modify
            </Button>
            
            {subscription.status === "active" ? (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleCancel}
                disabled={updateStatusMutation.isPending}
                data-testid={`button-cancel-${subscription.id}`}
              >
                <X className="h-3 w-3" />
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleReactivate}
                disabled={updateStatusMutation.isPending}
                data-testid={`button-reactivate-${subscription.id}`}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
            
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              data-testid={`button-delete-${subscription.id}`}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <EditSubscriptionDialog 
        subscription={subscription}
        open={showEditDialog} 
        onOpenChange={setShowEditDialog} 
      />
    </>
  );
}
