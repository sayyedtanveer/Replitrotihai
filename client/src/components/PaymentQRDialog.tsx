import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Loader2, Copy, Smartphone, AlertCircle, CheckCircle2 } from "lucide-react";
import { SiGooglepay, SiPhonepe, SiPaytm } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { useLocation } from "wouter";
import { generateUPIIntent, getPaymentAppDeepLink, isMobileDevice } from "@/lib/upi-payment";

interface PaymentQRDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  amount: number;
  customerName: string;
  phone: string;
  email?: string;
  address: string;
  accountCreated?: boolean;
  defaultPassword?: string;
  onPaymentConfirmed?: (transactionId: string) => void;
}

export default function PaymentQRDialog({ 
  isOpen, 
  onClose, 
  orderId, 
  amount, 
  customerName, 
  phone, 
  email, 
  address,
  accountCreated = false,
  defaultPassword = "",
  onPaymentConfirmed
}: PaymentQRDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [upiId] = useState("rotihai@paytm");
  const [hasPaid, setHasPaid] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [upiIntent, setUpiIntent] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isMobile = isMobileDevice();

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const intent = generateUPIIntent({
        upiId: upiId,
        name: "RotiHai",
        amount: amount,
        transactionNote: `Order #${orderId.slice(0, 8)}`,
      });

      setUpiIntent(intent);

      const qrSize = window.innerWidth < 768 ? 200 : 256;

      QRCode.toCanvas(
        canvasRef.current,
        intent,
        {
          width: qrSize,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        },
        (error) => {
          if (error) {
            console.error("Error generating QR code:", error);
            toast({
              title: "Error",
              description: "Failed to generate payment QR code",
              variant: "destructive",
            });
          }
        }
      );
    }
  }, [isOpen, upiId, amount, orderId, toast]);

  const copyUpiId = () => {
    navigator.clipboard.writeText(upiId);
    toast({
      title: "Copied!",
      description: "UPI ID copied to clipboard",
    });
  };

  const handlePayWithApp = (app: "gpay" | "phonepe" | "paytm") => {
    try {
      const deepLink = getPaymentAppDeepLink(app, upiIntent);
      window.location.href = deepLink;
      
      toast({
        title: "Opening Payment App",
        description: `Redirecting to ${app === "gpay" ? "Google Pay" : app === "phonepe" ? "PhonePe" : "Paytm"}...`,
      });
    } catch (error) {
      console.error("Error opening payment app:", error);
      toast({
        title: "Error",
        description: "Failed to open payment app. Please scan QR code instead.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmPayment = async () => {
    if (!hasPaid) {
      toast({
        title: "Confirmation Required",
        description: "Please confirm that you have completed the payment.",
        variant: "destructive",
      });
      return;
    }

    setIsConfirming(true);
    try {
      const txnId = `TXN${Date.now()}`;
      
      // If custom payment confirmed handler is provided (for subscriptions), use it
      if (onPaymentConfirmed) {
        await onPaymentConfirmed(txnId);
        // Don't close dialog here - let the mutation handler do it
        return;
      }

      // Otherwise, handle as order payment
      const response = await fetch(`/api/orders/${orderId}/payment-confirmed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        let errorMessage = "Failed to confirm payment";
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } else {
            // Handle HTML or other non-JSON responses
            const errorText = await response.text();
            console.error("Non-JSON error response:", errorText);
            errorMessage = "Server error occurred. Please try again.";
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
        }
        throw new Error(errorMessage);
      }

      toast({
        title: "✓ Payment Confirmed!",
        description: "Your order has been submitted. We'll verify the payment shortly.",
      });

      // Navigate to tracking page
      setLocation(`/track/${orderId}`);
      setTimeout(() => {
        onClose();
      }, 100);
    } catch (error) {
      console.error("Error confirming payment:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to confirm payment. Please contact support.";
      toast({
        title: "Confirmation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      // Prevent closing the dialog by clicking outside or pressing Escape if the user has
      // already marked the payment as paid or confirmation is in progress. This avoids
      // the user accidentally closing the dialog after paying but before clicking
      // "Confirm Payment" which would leave the admin unaware of the payment.
      if (hasPaid || isConfirming) {
        toast({
          title: "Payment pending",
          description: "You've indicated payment — please click 'Confirm Payment' so we can verify it. Closing is disabled until you confirm.",
          variant: "destructive",
        });
        return;
      }

      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
          <DialogDescription>Scan QR code to pay with any UPI app</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col items-center justify-center space-y-3 sm:space-y-4 py-2 sm:py-4">
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm">
              <canvas ref={canvasRef} data-testid="payment-qr-canvas" className="w-full max-w-[240px] h-auto" />
            </div>

            <div className="text-center space-y-1 sm:space-y-2">
              <p className="text-xl sm:text-2xl font-bold">₹{amount}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Order #{orderId.slice(0, 8)}</p>
            </div>
          </div>

          <div className="border-t pt-3 sm:pt-4 space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between bg-muted/50 p-2 sm:p-3 rounded-lg">
              <span className="text-sm font-medium">UPI ID: {upiId}</span>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={copyUpiId}
                data-testid="button-copy-upi"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            {accountCreated && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                    <span className="text-green-600 dark:text-green-300 text-lg">✓</span>
                  </div>
                  <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                    Account Created Successfully!
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-green-200 dark:border-green-700">
                  <p className="text-xs text-muted-foreground mb-2">Your Login Credentials:</p>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Phone:</span>
                      <span className="font-mono font-semibold text-sm">{phone}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Password:</span>
                      <span className="font-mono font-bold text-sm text-green-600 dark:text-green-400">
                        {defaultPassword || phone?.slice(-6)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    💡 <strong>Tip:</strong> Your password is always the last 6 digits of your phone number. You can login anytime to track your orders!
                  </p>
                </div>
              </div>
            )}

            {/* Payment App Buttons (Mobile) */}
            {isMobile && upiIntent && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Quick Pay with App</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      className="flex flex-col items-center gap-1 h-auto py-3"
                      onClick={() => handlePayWithApp("gpay")}
                      data-testid="button-pay-gpay"
                    >
                      <SiGooglepay className="h-6 w-6" />
                      <span className="text-xs">GPay</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex flex-col items-center gap-1 h-auto py-3"
                      onClick={() => handlePayWithApp("phonepe")}
                      data-testid="button-pay-phonepe"
                    >
                      <SiPhonepe className="h-6 w-6" />
                      <span className="text-xs">PhonePe</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex flex-col items-center gap-1 h-auto py-3"
                      onClick={() => handlePayWithApp("paytm")}
                      data-testid="button-pay-paytm"
                    >
                      <SiPaytm className="h-6 w-6" />
                      <span className="text-xs">Paytm</span>
                    </Button>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Manual Payment Confirmation */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Important:</strong> After completing payment, check the box below and click "Confirm Payment".
              </AlertDescription>
            </Alert>

            <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
              <Checkbox
                id="payment-confirm"
                checked={hasPaid}
                onCheckedChange={(checked) => setHasPaid(checked as boolean)}
                data-testid="checkbox-payment-confirmed"
              />
              <label
                htmlFor="payment-confirm"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                I have completed the payment of ₹{amount}
              </label>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">How to pay:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Open any UPI app (PhonePe, Google Pay, Paytm, etc.)</li>
                <li>Scan the QR code above</li>
                <li>Verify the amount and complete the payment</li>
                <li>Wait for our confirmation (usually within 5 minutes)</li>
              </ol>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onClose()}
              className="flex-1"
              data-testid="button-cancel-payment"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={!hasPaid || isConfirming}
              className="flex-1"
              data-testid="button-confirm-payment"
            >
              {isConfirming ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm Payment
                </>
              )}
            </Button>
          </div>
          
          <p className="text-xs text-center text-muted-foreground">
            After confirmation, you'll be redirected to track your order. Our team will verify your payment within 5 minutes.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}