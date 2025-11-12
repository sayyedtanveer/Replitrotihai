import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Loader2, User, Lock, Mail, ArrowLeft, Camera } from "lucide-react";
import { useLocation } from "wouter";

interface PartnerProfile {
  id: string;
  username: string;
  email: string;
  profilePictureUrl?: string | null;
  chefId: string;
  chefName: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function PartnerProfile() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const partnerToken = localStorage.getItem("partnerToken");
  const [email, setEmail] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data: profile, isLoading } = useQuery<PartnerProfile>({
    queryKey: ["/api/partner/profile"],
    queryFn: async () => {
      const response = await fetch("/api/partner/profile", {
        headers: { Authorization: `Bearer ${partnerToken}` },
      });
      if (!response.ok) throw new Error("Failed to fetch profile");
      return response.json();
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { email?: string; profilePictureUrl?: string }) => {
      const response = await fetch("/api/partner/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${partnerToken}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update profile");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/profile"] });
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setEmail("");
      setProfilePictureUrl("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await fetch("/api/partner/change-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${partnerToken}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to change password");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updateData: { email?: string; profilePictureUrl?: string } = {};
    
    if (email.trim()) {
      if (!email.includes("@")) {
        toast({
          title: "Error",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        return;
      }
      updateData.email = email.trim();
    }
    
    if (profilePictureUrl.trim()) {
      updateData.profilePictureUrl = profilePictureUrl.trim();
    }
    
    if (Object.keys(updateData).length === 0) {
      toast({
        title: "Error",
        description: "Please enter at least one field to update",
        variant: "destructive",
      });
      return;
    }
    
    updateProfileMutation.mutate(updateData);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "All password fields are required",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "New password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/partner/dashboard")}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold">Partner Profile</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </CardTitle>
            <CardDescription>View and update your profile details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={profile?.profilePictureUrl || undefined} alt={profile?.username} />
                <AvatarFallback className="text-2xl">
                  {profile?.username?.charAt(0).toUpperCase() || "P"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">Profile Picture</p>
                <p className="text-xs text-muted-foreground">
                  {profile?.profilePictureUrl ? "Custom picture set" : "Using default avatar"}
                </p>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Username</Label>
              <Input
                value={profile?.username || ""}
                disabled
                data-testid="input-username"
              />
              <p className="text-sm text-muted-foreground">Username cannot be changed</p>
            </div>

            <div className="grid gap-2">
              <Label>Chef/Restaurant</Label>
              <Input
                value={profile?.chefName || ""}
                disabled
                data-testid="input-chef-name"
              />
            </div>

            <div className="grid gap-2">
              <Label>Member Since</Label>
              <Input
                value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : ""}
                disabled
                data-testid="input-created-at"
              />
            </div>

            {profile?.lastLoginAt && (
              <div className="grid gap-2">
                <Label>Last Login</Label>
                <Input
                  value={new Date(profile.lastLoginAt).toLocaleString()}
                  disabled
                  data-testid="input-last-login"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Update Profile
            </CardTitle>
            <CardDescription>Change your email or profile picture</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid gap-2">
                <Label>Current Email</Label>
                <Input
                  value={profile?.email || ""}
                  disabled
                  data-testid="input-current-email"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="new-email">New Email (optional)</Label>
                <Input
                  id="new-email"
                  type="email"
                  placeholder="Enter new email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-new-email"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="profile-picture">Profile Picture URL (optional)</Label>
                <Input
                  id="profile-picture"
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={profilePictureUrl}
                  onChange={(e) => setProfilePictureUrl(e.target.value)}
                  data-testid="input-profile-picture"
                />
                <p className="text-xs text-muted-foreground">
                  Enter a URL to an image (JPG, PNG, etc.) or leave blank to use default avatar
                </p>
              </div>

              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
                data-testid="button-update-profile"
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Profile"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Change Password
            </CardTitle>
            <CardDescription>Update your password to keep your account secure</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  data-testid="input-current-password"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password (min. 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  data-testid="input-new-password"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  data-testid="input-confirm-password"
                />
              </div>

              <Button
                type="submit"
                disabled={changePasswordMutation.isPending}
                data-testid="button-change-password"
              >
                {changePasswordMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Changing...
                  </>
                ) : (
                  "Change Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
