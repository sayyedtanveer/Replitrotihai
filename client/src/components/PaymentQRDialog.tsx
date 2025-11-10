import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Copy, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { useLocation } from "wouter";

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
  defaultPassword = ""
}: PaymentQRDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [upiId] = useState("rotihai@upi");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const upiUrl = `upi://pay?pa=${upiId}&pn=RotiHai&am=${amount}&cu=INR&tn=Order%20${orderId}`;
      
      const isMobile = window.innerWidth < 768;
      const qrSize = isMobile ? 200 : 256;
      
      QRCode.toCanvas(
        canvasRef.current,
        upiUrl,
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

  const handleUserClose = () => {
    onClose();
    setLocation(`/track/${orderId}`);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
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
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-green-900 dark:text-green-100">
                  <User className="h-4 w-4" />
                  <p className="text-sm font-medium">Account Created!</p>
                </div>
                <p className="text-xs text-green-700 dark:text-green-300">
                  Your account has been created. You can now track your orders and access your profile.
                  {defaultPassword && ` Your password is: ${defaultPassword} (last 6 digits of your phone)`}
                </p>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="text-sm font-medium">Waiting for payment confirmation</p>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                After completing the payment, our team will confirm your order manually. You'll receive a confirmation shortly.
              </p>
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

          <div className="space-y-2">
            <Button 
              onClick={handleUserClose} 
              className="w-full"
              data-testid="button-close-payment"
            >
              ✓ I've Completed the Payment - Track Order
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              You'll be redirected to track your order. Our team will verify and confirm your payment within 5 minutes
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
