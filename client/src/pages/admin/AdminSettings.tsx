import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Settings, DollarSign, Clock, MapPin, Phone, Mail } from "lucide-react";

export default function AdminSettings() {
  const { toast } = useToast();
  
  // Site Information
  const [siteInfo, setSiteInfo] = useState({
    siteName: "RotiHai",
    tagline: "Fresh Rotis Delivered Ghar Jaisa Swaad",
    contactEmail: "support@rotihai.com",
    contactPhone: "+91 98765 43210",
    supportHours: "9:00 AM - 10:00 PM",
  });

  // Delivery Configuration
  const [deliveryConfig, setDeliveryConfig] = useState({
    baseFee: 40,
    freeDeliveryThreshold: 200,
    deliveryRadius: 10,
    averageDeliveryTime: "25-30 mins",
    expressDeliveryFee: 80,
    expressDeliveryTime: "15-20 mins",
  });

  // Tax Configuration
  const [taxConfig, setTaxConfig] = useState({
    gstEnabled: true,
    gstRate: 5,
    serviceChargeEnabled: false,
    serviceChargeRate: 10,
    packagingChargeEnabled: true,
    packagingCharge: 10,
  });

  // Business Hours
  const [businessHours, setBusinessHours] = useState({
    monday: { enabled: true, open: "09:00", close: "22:00" },
    tuesday: { enabled: true, open: "09:00", close: "22:00" },
    wednesday: { enabled: true, open: "09:00", close: "22:00" },
    thursday: { enabled: true, open: "09:00", close: "22:00" },
    friday: { enabled: true, open: "09:00", close: "22:00" },
    saturday: { enabled: true, open: "09:00", close: "23:00" },
    sunday: { enabled: true, open: "10:00", close: "22:00" },
  });

  const handleSaveSiteInfo = () => {
    toast({
      title: "Settings saved",
      description: "Site information has been updated successfully",
    });
  };

  const handleSaveDeliveryConfig = () => {
    toast({
      title: "Settings saved",
      description: "Delivery configuration has been updated successfully",
    });
  };

  const handleSaveTaxConfig = () => {
    toast({
      title: "Settings saved",
      description: "Tax configuration has been updated successfully",
    });
  };

  const handleSaveBusinessHours = () => {
    toast({
      title: "Settings saved",
      description: "Business hours have been updated successfully",
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2" data-testid="text-settings-title">
            <Settings className="w-8 h-8" />
            Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage site configuration, delivery fees, tax rates, and business hours
          </p>
        </div>

        {/* Quick Links to Specialized Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => window.location.href = '/admin/roti-settings'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Roti Time Settings
              </CardTitle>
              <CardDescription>
                Configure morning block period and delivery cutoff times for Roti orders
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => window.location.href = '/admin/cart-settings'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Cart Settings
              </CardTitle>
              <CardDescription>
                Manage minimum order amounts per category
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => window.location.href = '/admin/delivery-settings'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Delivery Settings
              </CardTitle>
              <CardDescription>
                Configure delivery fees and distance ranges
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="site" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="site" data-testid="tab-site">
              Site Info
            </TabsTrigger>
            <TabsTrigger value="delivery" data-testid="tab-delivery">
              Delivery
            </TabsTrigger>
            <TabsTrigger value="tax" data-testid="tab-tax">
              Tax & Charges
            </TabsTrigger>
            <TabsTrigger value="hours" data-testid="tab-hours">
              Business Hours
            </TabsTrigger>
          </TabsList>

          {/* Site Information */}
          <TabsContent value="site">
            <Card>
              <CardHeader>
                <CardTitle>Site Information</CardTitle>
                <CardDescription>Update your site's basic information and contact details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="siteName">Site Name</Label>
                    <Input
                      id="siteName"
                      value={siteInfo.siteName}
                      onChange={(e) => setSiteInfo({ ...siteInfo, siteName: e.target.value })}
                      data-testid="input-site-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tagline">Tagline</Label>
                    <Input
                      id="tagline"
                      value={siteInfo.tagline}
                      onChange={(e) => setSiteInfo({ ...siteInfo, tagline: e.target.value })}
                      data-testid="input-tagline"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail" className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Contact Email
                    </Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={siteInfo.contactEmail}
                      onChange={(e) => setSiteInfo({ ...siteInfo, contactEmail: e.target.value })}
                      data-testid="input-contact-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone" className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Contact Phone
                    </Label>
                    <Input
                      id="contactPhone"
                      value={siteInfo.contactPhone}
                      onChange={(e) => setSiteInfo({ ...siteInfo, contactPhone: e.target.value })}
                      data-testid="input-contact-phone"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="supportHours">Support Hours</Label>
                    <Input
                      id="supportHours"
                      value={siteInfo.supportHours}
                      onChange={(e) => setSiteInfo({ ...siteInfo, supportHours: e.target.value })}
                      data-testid="input-support-hours"
                    />
                  </div>
                </div>
                <Button onClick={handleSaveSiteInfo} data-testid="button-save-site-info">
                  Save Site Information
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Delivery Configuration */}
          <TabsContent value="delivery">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Delivery Configuration
                </CardTitle>
                <CardDescription>Configure delivery fees, radius, and timing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="baseFee">Base Delivery Fee (₹)</Label>
                    <Input
                      id="baseFee"
                      type="number"
                      value={deliveryConfig.baseFee}
                      onChange={(e) =>
                        setDeliveryConfig({ ...deliveryConfig, baseFee: parseInt(e.target.value) || 0 })
                      }
                      data-testid="input-base-fee"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="freeDeliveryThreshold">Free Delivery Above (₹)</Label>
                    <Input
                      id="freeDeliveryThreshold"
                      type="number"
                      value={deliveryConfig.freeDeliveryThreshold}
                      onChange={(e) =>
                        setDeliveryConfig({
                          ...deliveryConfig,
                          freeDeliveryThreshold: parseInt(e.target.value) || 0,
                        })
                      }
                      data-testid="input-free-delivery-threshold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryRadius" className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Delivery Radius (km)
                    </Label>
                    <Input
                      id="deliveryRadius"
                      type="number"
                      value={deliveryConfig.deliveryRadius}
                      onChange={(e) =>
                        setDeliveryConfig({ ...deliveryConfig, deliveryRadius: parseInt(e.target.value) || 0 })
                      }
                      data-testid="input-delivery-radius"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="averageDeliveryTime" className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Average Delivery Time
                    </Label>
                    <Input
                      id="averageDeliveryTime"
                      value={deliveryConfig.averageDeliveryTime}
                      onChange={(e) =>
                        setDeliveryConfig({ ...deliveryConfig, averageDeliveryTime: e.target.value })
                      }
                      data-testid="input-avg-delivery-time"
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Express Delivery</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="expressDeliveryFee">Express Delivery Fee (₹)</Label>
                      <Input
                        id="expressDeliveryFee"
                        type="number"
                        value={deliveryConfig.expressDeliveryFee}
                        onChange={(e) =>
                          setDeliveryConfig({
                            ...deliveryConfig,
                            expressDeliveryFee: parseInt(e.target.value) || 0,
                          })
                        }
                        data-testid="input-express-fee"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expressDeliveryTime">Express Delivery Time</Label>
                      <Input
                        id="expressDeliveryTime"
                        value={deliveryConfig.expressDeliveryTime}
                        onChange={(e) =>
                          setDeliveryConfig({ ...deliveryConfig, expressDeliveryTime: e.target.value })
                        }
                        data-testid="input-express-time"
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveDeliveryConfig} data-testid="button-save-delivery">
                  Save Delivery Configuration
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tax & Charges */}
          <TabsContent value="tax">
            <Card>
              <CardHeader>
                <CardTitle>Tax & Charges Configuration</CardTitle>
                <CardDescription>Configure GST, service charges, and other fees</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* GST Configuration */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">GST (Goods & Services Tax)</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Enable GST on all orders
                      </p>
                    </div>
                    <Switch
                      checked={taxConfig.gstEnabled}
                      onCheckedChange={(checked) => setTaxConfig({ ...taxConfig, gstEnabled: checked })}
                      data-testid="switch-gst-enabled"
                    />
                  </div>
                  {taxConfig.gstEnabled && (
                    <div className="space-y-2 ml-6">
                      <Label htmlFor="gstRate">GST Rate (%)</Label>
                      <Input
                        id="gstRate"
                        type="number"
                        value={taxConfig.gstRate}
                        onChange={(e) =>
                          setTaxConfig({ ...taxConfig, gstRate: parseFloat(e.target.value) || 0 })
                        }
                        className="max-w-xs"
                        data-testid="input-gst-rate"
                      />
                    </div>
                  )}
                </div>

                <Separator />

                {/* Service Charge */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Service Charge</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Add service charge to orders
                      </p>
                    </div>
                    <Switch
                      checked={taxConfig.serviceChargeEnabled}
                      onCheckedChange={(checked) =>
                        setTaxConfig({ ...taxConfig, serviceChargeEnabled: checked })
                      }
                      data-testid="switch-service-charge"
                    />
                  </div>
                  {taxConfig.serviceChargeEnabled && (
                    <div className="space-y-2 ml-6">
                      <Label htmlFor="serviceChargeRate">Service Charge (%)</Label>
                      <Input
                        id="serviceChargeRate"
                        type="number"
                        value={taxConfig.serviceChargeRate}
                        onChange={(e) =>
                          setTaxConfig({ ...taxConfig, serviceChargeRate: parseFloat(e.target.value) || 0 })
                        }
                        className="max-w-xs"
                        data-testid="input-service-charge-rate"
                      />
                    </div>
                  )}
                </div>

                <Separator />

                {/* Packaging Charge */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Packaging Charge</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Add fixed packaging charge to orders
                      </p>
                    </div>
                    <Switch
                      checked={taxConfig.packagingChargeEnabled}
                      onCheckedChange={(checked) =>
                        setTaxConfig({ ...taxConfig, packagingChargeEnabled: checked })
                      }
                      data-testid="switch-packaging-charge"
                    />
                  </div>
                  {taxConfig.packagingChargeEnabled && (
                    <div className="space-y-2 ml-6">
                      <Label htmlFor="packagingCharge">Packaging Charge (₹)</Label>
                      <Input
                        id="packagingCharge"
                        type="number"
                        value={taxConfig.packagingCharge}
                        onChange={(e) =>
                          setTaxConfig({ ...taxConfig, packagingCharge: parseInt(e.target.value) || 0 })
                        }
                        className="max-w-xs"
                        data-testid="input-packaging-charge"
                      />
                    </div>
                  )}
                </div>

                <Button onClick={handleSaveTaxConfig} data-testid="button-save-tax">
                  Save Tax Configuration
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Business Hours */}
          <TabsContent value="hours">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Business Hours
                </CardTitle>
                <CardDescription>Set your operating hours for each day of the week</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(businessHours).map(([day, hours]) => (
                  <div key={day} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <Switch
                        checked={hours.enabled}
                        onCheckedChange={(checked) =>
                          setBusinessHours({
                            ...businessHours,
                            [day]: { ...hours, enabled: checked },
                          })
                        }
                        data-testid={`switch-${day}-enabled`}
                      />
                      <Label className="min-w-[100px] capitalize">{day}</Label>
                    </div>
                    {hours.enabled && (
                      <>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Open:</Label>
                          <Input
                            type="time"
                            value={hours.open}
                            onChange={(e) =>
                              setBusinessHours({
                                ...businessHours,
                                [day]: { ...hours, open: e.target.value },
                              })
                            }
                            className="w-32"
                            data-testid={`input-${day}-open`}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Close:</Label>
                          <Input
                            type="time"
                            value={hours.close}
                            onChange={(e) =>
                              setBusinessHours({
                                ...businessHours,
                                [day]: { ...hours, close: e.target.value },
                              })
                            }
                            className="w-32"
                            data-testid={`input-${day}-close`}
                          />
                        </div>
                      </>
                    )}
                    {!hours.enabled && (
                      <span className="text-sm text-slate-500 dark:text-slate-400 flex-1 text-right">
                        Closed
                      </span>
                    )}
                  </div>
                ))}

                <Button onClick={handleSaveBusinessHours} data-testid="button-save-hours">
                  Save Business Hours
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
