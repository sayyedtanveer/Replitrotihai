import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ApplyReferralParams {
  referralCode: string;
  userToken: string;
}

export function useApplyReferral() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ referralCode, userToken }: ApplyReferralParams) => {
      const response = await fetch("/api/user/apply-referral", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ referralCode }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to apply referral code");
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["/api/user/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/referrals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/referral-eligibility"] });
      
      toast({
        title: "✓ Success!",
        description: `Referral bonus of ₹${data.bonus || 50} added to your wallet!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to apply referral",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
