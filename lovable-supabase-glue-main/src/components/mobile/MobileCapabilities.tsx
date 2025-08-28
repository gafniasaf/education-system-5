import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Smartphone, 
  Bell, 
  Wifi, 
  WifiOff, 
  Download, 
  Upload,
  RefreshCw,
  Settings,
  Database,
  Battery,
  Signal
} from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { Device } from '@capacitor/device';
import { Network } from '@capacitor/network';
import { useToast } from '@/hooks/use-toast';

interface MobileCapabilitiesProps {
  className?: string;
}

export const MobileCapabilities: React.FC<MobileCapabilitiesProps> = ({ className }) => {
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [networkStatus, setNetworkStatus] = useState<any>(null);
  const [batteryInfo, setBatteryInfo] = useState<any>(null);
  
  const pushNotifications = usePushNotifications();
  const offlineStorage = useOfflineStorage();
  const { toast } = useToast();

  useEffect(() => {
    const initializeDeviceInfo = async () => {
      try {
        const device = await Device.getInfo();
        const network = await Network.getStatus();
        
        setDeviceInfo(device);
        setNetworkStatus(network);
        
        // Get battery info if available
        if ('getBattery' in navigator) {
          const battery = await (navigator as any).getBattery();
          setBatteryInfo({
            level: Math.round(battery.level * 100),
            charging: battery.charging,
          });
        }
      } catch (error) {
        console.error('Error getting device info:', error);
      }
    };

    initializeDeviceInfo();
  }, []);

  const isMobileDevice = deviceInfo?.platform === 'ios' || deviceInfo?.platform === 'android';
  const isNative = deviceInfo?.platform !== 'web';

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Mobile Capabilities Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Device Information */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Device Information
            </h4>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-lg font-bold">{deviceInfo?.platform || 'Web'}</div>
                <div className="text-xs text-muted-foreground">Platform</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-lg font-bold">{deviceInfo?.model || 'Browser'}</div>
                <div className="text-xs text-muted-foreground">Device</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-lg font-bold flex items-center justify-center gap-1">
                  {batteryInfo ? (
                    <>
                      <Battery className="h-4 w-4" />
                      {batteryInfo.level}%
                    </>
                  ) : (
                    'N/A'
                  )}
                </div>
                <div className="text-xs text-muted-foreground">Battery</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-lg font-bold flex items-center justify-center gap-1">
                  {networkStatus?.connected ? (
                    <>
                      <Signal className="h-4 w-4 text-green-600" />
                      {networkStatus.connectionType}
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-4 w-4 text-red-600" />
                      Offline
                    </>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">Connection</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Push Notifications */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Push Notifications
            </h4>
            
            {!isMobileDevice && (
              <Alert className="mb-4">
                <Smartphone className="h-4 w-4" />
                <AlertDescription>
                  Push notifications are only available on mobile devices. Export to mobile app to enable this feature.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Push Notifications</div>
                  <div className="text-sm text-muted-foreground">
                    {pushNotifications.isSupported 
                      ? (pushNotifications.isRegistered ? 'Enabled and registered' : 'Available but not registered')
                      : 'Not supported on this device'
                    }
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {pushNotifications.isRegistered && (
                    <Badge variant="default">Active</Badge>
                  )}
                  {pushNotifications.isLoading && (
                    <Badge variant="secondary">Loading...</Badge>
                  )}
                  {pushNotifications.error && (
                    <Badge variant="destructive">Error</Badge>
                  )}
                </div>
              </div>

              {pushNotifications.isRegistered && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={pushNotifications.sendTestNotification}
                  >
                    Test Notification
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={pushNotifications.unregister}
                  >
                    Disable
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Offline Storage */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Database className="h-4 w-4" />
              Offline Capabilities
            </h4>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {offlineStorage.isOnline ? (
                    <Wifi className="h-4 w-4 text-green-600" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-600" />
                  )}
                  <div>
                    <div className="font-medium">
                      {offlineStorage.isOnline ? 'Online' : 'Offline Mode'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {offlineStorage.isOnline 
                        ? 'All features available' 
                        : 'Working with cached data'
                      }
                    </div>
                  </div>
                </div>
                <Badge variant={offlineStorage.isOnline ? "default" : "secondary"}>
                  {offlineStorage.isOnline ? 'Connected' : 'Offline'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-bold">{offlineStorage.offlineData.assignments.length}</div>
                  <div className="text-xs text-muted-foreground">Assignments</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-bold">{offlineStorage.offlineData.courses.length}</div>
                  <div className="text-xs text-muted-foreground">Courses</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-bold">{offlineStorage.pendingSync.length}</div>
                  <div className="text-xs text-muted-foreground">Pending Sync</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-bold">
                    {offlineStorage.offlineData.lastSync 
                      ? new Date(offlineStorage.offlineData.lastSync).toLocaleDateString()
                      : 'Never'
                    }
                  </div>
                  <div className="text-xs text-muted-foreground">Last Sync</div>
                </div>
              </div>

              {offlineStorage.pendingSync.length > 0 && (
                <Alert>
                  <Upload className="h-4 w-4" />
                  <AlertDescription>
                    You have {offlineStorage.pendingSync.length} changes waiting to sync when back online.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={offlineStorage.syncPendingChanges}
                  disabled={!offlineStorage.isOnline || offlineStorage.pendingSync.length === 0}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Sync Now
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={offlineStorage.clearOfflineStorage}
                  disabled={!offlineStorage.hasOfflineContent}
                >
                  <Database className="h-3 w-3 mr-1" />
                  Clear Cache
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Mobile App Export */}
          <div>
            <h4 className="font-semibold mb-3">Mobile App Export</h4>
            {isNative ? (
              <Alert>
                <Smartphone className="h-4 w-4" />
                <AlertDescription>
                  <strong>You're using the native mobile app!</strong> All mobile features are available.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <Download className="h-4 w-4" />
                <AlertDescription>
                  <strong>Web Version Detected.</strong> For full mobile capabilities, export this project to create native iOS/Android apps.
                  <br />
                  <span className="text-xs">Features like push notifications and offline storage work best in native apps.</span>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};