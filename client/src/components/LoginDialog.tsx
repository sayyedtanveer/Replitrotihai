import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, LogIn, ArrowLeft } from "lucide-react";

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
  prefillPhone?: string;
}

export default function LoginDialog({
  isOpen,
  onClose,
  onLoginSuccess,
  prefillPhone,
}: LoginDialogProps) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetPhone, setResetPhone] = useState("");
  const { toast } = useToast();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone || phone.length !== 10) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive",
      });
      return;
    }

    if (!password) {
      toast({
        title: "Password required",
        description: "Please enter your password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await login(phone, password);
      
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      
      setPhone("");
      setPassword("");
      onClose();
      
      // Call success callback without page reload
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid phone number or password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetPhone || resetPhone.length !== 10) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/user/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: resetPhone }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Password reset successful",
          description: data.message || "A new password has been sent to your registered email",
        });
        setShowForgotPassword(false);
        setResetPhone("");
      } else {
        toast({
          title: "Reset failed",
          description: data.message || "Could not reset password. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset password. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setPhone("");
      setPassword("");
      onClose();
    }
  };

  // Prefill phone when provided (useful when opening dialog from other flows)
  // Update phone state whenever prefillPhone changes while dialog is open
  useEffect(() => {
    if (prefillPhone && isOpen) {
      setPhone(prefillPhone.replace(/\D/g, "").slice(0, 10));
      setResetPhone(prefillPhone.replace(/\D/g, "").slice(0, 10));
    }
  }, [prefillPhone, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-login">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {showForgotPassword && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 mr-1"
                onClick={() => setShowForgotPassword(false)}
                disabled={isLoading}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <LogIn className="h-5 w-5" />
            {showForgotPassword ? "Reset Password" : "Sign In"}
          </DialogTitle>
          <DialogDescription>
            {showForgotPassword
              ? "Enter your phone number to receive a new password"
              : "Enter your phone number and password to access your account"}
          </DialogDescription>
        </DialogHeader>

        {showForgotPassword ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-phone">Phone Number</Label>
              <Input
                id="reset-phone"
                type="tel"
                placeholder="10-digit phone number"
                value={resetPhone}
                onChange={(e) => setResetPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                maxLength={10}
                disabled={isLoading}
                data-testid="input-reset-phone"
                autoComplete="tel"
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                💡 A new temporary password will be sent to your registered email address. 
                Please change it after logging in for security.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={handleForgotPassword}
                className="w-full"
                disabled={isLoading}
                data-testid="button-reset-password"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send New Password"
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetPhone("");
                }}
                disabled={isLoading}
              >
                Back to Login
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="10-digit phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                maxLength={10}
                disabled={isLoading}
                data-testid="input-phone"
                autoComplete="tel"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setResetPhone(phone);
                  }}
                  className="text-xs text-primary hover:underline"
                  disabled={isLoading}
                >
                  Forgot Password?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                data-testid="input-password"
                autoComplete="current-password"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-submit-login"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                Don't have an account? Create one during checkout
              </p>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
