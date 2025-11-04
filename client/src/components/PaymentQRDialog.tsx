import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";

interface PaymentQRDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  amount: number;
}

export default function PaymentQRDialog({ isOpen, onClose, orderId, amount }: PaymentQRDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [upiId] = useState("rotihai@upi");
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const upiUrl = `upi://pay?pa=${upiId}&pn=RotiHai&am=${amount}&cu=INR&tn=Order%20${orderId}`;
      
      QRCode.toCanvas(
        canvasRef.current,
        upiUrl,
        {
          width: 256,
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
          <DialogDescription>Scan QR code to pay with any UPI app</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <canvas ref={canvasRef} data-testid="payment-qr-canvas" />
            </div>

            <div className="text-center space-y-2">
              <p className="text-2xl font-bold">₹{amount}</p>
              <p className="text-sm text-muted-foreground">Order #{orderId.slice(0, 8)}</p>
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
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

          <Button 
            onClick={onClose} 
            className="w-full"
            data-testid="button-close-payment"
          >
            I've Made the Payment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
