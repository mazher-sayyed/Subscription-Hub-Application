import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type AvailableService } from "@shared/schema";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Star, Check, Zap } from "lucide-react";

interface ServiceCardProps {
  service: AvailableService;
  "data-testid"?: string;
}

export default function ServiceCard({ service, "data-testid": testId }: ServiceCardProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [showSubscribeDialog, setShowSubscribeDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const subscriptionMutation = useMutation({
    mutationFn: async (data: { serviceId: string; planId: string }) => {
      return await apiRequest("POST", "/api/subscriptions/subscribe", data);
    },
    onSuccess: () => {
      // Invalidate both subscriptions and expiring subscriptions caches
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/expiring?days=30"] });
      toast({
        title: "Subscribed Successfully!",
        description: `You've been subscribed to ${service.name}.`,
      });
      setShowSubscribeDialog(false);
      setSelectedPlan("");
    },
    onError: (error: any) => {
      let title = "Subscription Failed";
      let description = "Failed to subscribe to the service. Please try again.";
      
      if (error.message && error.message.includes("401")) {
        title = "Authentication Required";
        description = "Please log in to subscribe to services. Refresh the page and sign in.";
      } else if (error.message) {
        description = error.message;
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = () => {
    if (!selectedPlan) {
      toast({
        title: "Please select a plan",
        description: "Choose a subscription plan to continue.",
        variant: "destructive",
      });
      return;
    }

    subscriptionMutation.mutate({
      serviceId: service.id,
      planId: selectedPlan,
    });
  };

  const selectedPlanDetails = service.plans.find((plan: any) => plan.id === selectedPlan);

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-200 dark:hover:border-blue-800" data-testid={testId}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {service.logoUrl && (
              <img
                src={service.logoUrl}
                alt={`${service.name} logo`}
                className="w-12 h-12 object-contain rounded-lg"
                data-testid={`img-service-logo-${service.id}`}
              />
            )}
            <div>
              <CardTitle className="text-xl font-bold" data-testid={`text-service-name-${service.id}`}>
                {service.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" data-testid={`badge-category-${service.id}`}>
                  {service.category}
                </Badge>
                {service.isPopular && (
                  <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-200" data-testid={`badge-popular-${service.id}`}>
                    <Star className="w-3 h-3 mr-1" />
                    Popular
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        <CardDescription className="mt-3" data-testid={`text-service-description-${service.id}`}>
          {service.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Key Features */}
        {service.features && service.features.length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2" data-testid={`text-features-title-${service.id}`}>
              Key Features
            </h4>
            <div className="space-y-1">
              {service.features.slice(0, 3).map((feature: string, index: number) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400" data-testid={`text-feature-${service.id}-${index}`}>
                  <Check className="w-4 h-4 text-green-500 shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pricing Plans */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300" data-testid={`text-plans-title-${service.id}`}>
            Pricing Plans
          </h4>
          {service.plans.map((plan: any, index: number) => (
            <div 
              key={plan.id} 
              className="flex items-center justify-between p-3 rounded-lg border bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
              data-testid={`div-plan-${service.id}-${plan.id}`}
            >
              <div>
                <div className="font-medium" data-testid={`text-plan-name-${service.id}-${plan.id}`}>
                  {plan.name}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400" data-testid={`text-plan-billing-${service.id}-${plan.id}`}>
                  {plan.billingCycle}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg" data-testid={`text-plan-price-${service.id}-${plan.id}`}>
                  ${plan.price}
                </div>
                <div className="text-sm text-gray-500" data-testid={`text-plan-period-${service.id}-${plan.id}`}>
                  per {plan.billingCycle === 'annual' ? 'year' : 'month'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter>
        <Dialog open={showSubscribeDialog} onOpenChange={setShowSubscribeDialog}>
          <DialogTrigger asChild>
            <Button 
              className="w-full group-hover:bg-blue-600 group-hover:text-white transition-colors" 
              size="lg"
              data-testid={`button-subscribe-${service.id}`}
            >
              <Zap className="w-4 h-4 mr-2" />
              Subscribe Now
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" data-testid={`dialog-subscribe-${service.id}`}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3" data-testid={`text-dialog-title-${service.id}`}>
                {service.logoUrl && (
                  <img
                    src={service.logoUrl}
                    alt={`${service.name} logo`}
                    className="w-8 h-8 object-contain rounded"
                  />
                )}
                Subscribe to {service.name}
              </DialogTitle>
              <DialogDescription data-testid={`text-dialog-description-${service.id}`}>
                Choose your subscription plan to get started instantly.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block" data-testid={`text-plan-selector-label-${service.id}`}>
                  Select Plan
                </label>
                <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                  <SelectTrigger data-testid={`select-plan-${service.id}`}>
                    <SelectValue placeholder="Choose a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {service.plans.map((plan: any) => (
                      <SelectItem key={plan.id} value={plan.id} data-testid={`option-plan-${service.id}-${plan.id}`}>
                        <div className="flex items-center justify-between w-full">
                          <span>{plan.name}</span>
                          <span className="ml-4 font-medium">${plan.price}/{plan.billingCycle === 'annual' ? 'year' : 'month'}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPlanDetails && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg" data-testid={`div-plan-details-${service.id}`}>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    {selectedPlanDetails.name} - ${selectedPlanDetails.price}/{selectedPlanDetails.billingCycle === 'annual' ? 'year' : 'month'}
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Your subscription will automatically renew every {selectedPlanDetails.billingCycle === 'annual' ? 'year' : 'month'}.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowSubscribeDialog(false)}
                  className="flex-1"
                  data-testid={`button-cancel-${service.id}`}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubscribe}
                  disabled={!selectedPlan || subscriptionMutation.isPending}
                  className="flex-1"
                  data-testid={`button-confirm-subscribe-${service.id}`}
                >
                  {subscriptionMutation.isPending ? "Subscribing..." : "Subscribe"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}