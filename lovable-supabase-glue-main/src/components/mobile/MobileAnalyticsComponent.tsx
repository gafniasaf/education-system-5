import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  Smartphone, 
  Clock, 
  TrendingUp, 
  Wifi, 
  Battery,
  Zap,
  Activity
} from 'lucide-react';
import { useMobileAnalytics } from '@/hooks/useMobileAnalytics';

interface MobileAnalyticsComponentProps {
  className?: string;
}

export const MobileAnalyticsComponent: React.FC<MobileAnalyticsComponentProps> = ({ className }) => {
  const { data, isLoading, error, trackInteraction } = useMobileAnalytics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        {error || 'No analytics data available'}
      </div>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold">{data.sessions}</div>
              <div className="text-xs text-muted-foreground">Total Sessions</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold">{data.avgSessionDuration}m</div>
              <div className="text-xs text-muted-foreground">Avg Session</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-2xl font-bold">{data.totalScreenTime}m</div>
              <div className="text-xs text-muted-foreground">Screen Time</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Zap className="h-6 w-6 text-orange-600" />
              </div>
              <div className="text-2xl font-bold">{data.performanceMetrics.appLaunchTime}s</div>
              <div className="text-xs text-muted-foreground">Launch Time</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Feature Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Most Used Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.mostUsedFeatures.map((feature, index) => (
                  <div key={feature.feature} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{feature.feature}</span>
                      <span className="text-muted-foreground">
                        {feature.usage} uses ({feature.percentage}%)
                      </span>
                    </div>
                    <Progress value={feature.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Network Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                Network Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">WiFi</span>
                    <span className="text-muted-foreground">{data.networkUsage.wifiTime}m</span>
                  </div>
                  <Progress 
                    value={(data.networkUsage.wifiTime / data.totalScreenTime) * 100} 
                    className="h-2" 
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Cellular</span>
                    <span className="text-muted-foreground">{data.networkUsage.cellularTime}m</span>
                  </div>
                  <Progress 
                    value={(data.networkUsage.cellularTime / data.totalScreenTime) * 100} 
                    className="h-2" 
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Offline</span>
                    <span className="text-muted-foreground">{data.networkUsage.offlineTime}m</span>
                  </div>
                  <Progress 
                    value={(data.networkUsage.offlineTime / data.totalScreenTime) * 100} 
                    className="h-2" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Feature Usage Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Feature Usage Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.mostUsedFeatures}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="usage"
                  >
                    {data.mostUsedFeatures.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Battery className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-lg font-bold text-green-600">
                      {data.performanceMetrics.appLaunchTime}s
                    </div>
                    <div className="text-xs text-muted-foreground">App Launch</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-lg font-bold text-blue-600">
                      {data.performanceMetrics.avgLoadTime}s
                    </div>
                    <div className="text-xs text-muted-foreground">Avg Load</div>
                  </div>
                </div>
                
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {data.performanceMetrics.crashCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Crashes (This Week)</div>
                  {data.performanceMetrics.crashCount === 0 && (
                    <Badge variant="default" className="mt-2">Stable</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Device Information */}
        <Card>
          <CardHeader>
            <CardTitle>Device Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="text-sm font-medium">Platform</div>
                <div className="text-lg">{data.deviceInfo.platform}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Device Model</div>
                <div className="text-lg">{data.deviceInfo.model}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">OS Version</div>
                <div className="text-lg">{data.deviceInfo.version}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};