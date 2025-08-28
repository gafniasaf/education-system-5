import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MobileCapabilities } from '@/components/mobile/MobileCapabilities';
import { MobileAnalyticsComponent } from '@/components/mobile/MobileAnalyticsComponent';
import { Smartphone, BarChart3 } from 'lucide-react';

const MobileDashboardPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Mobile Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Mobile capabilities, analytics, and native app features
          </p>
        </div>
        
        <Tabs defaultValue="capabilities" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="capabilities" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Mobile Capabilities
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Mobile Analytics
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="capabilities">
            <MobileCapabilities />
          </TabsContent>
          
          <TabsContent value="analytics">
            <MobileAnalyticsComponent />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MobileDashboardPage;