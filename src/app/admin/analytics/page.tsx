import { AnalyticsDashboard } from './analytics-dashboard';

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-rdy-black">Analytics</h1>
        <p className="mt-1 text-rdy-gray-400">Tenant-wide metrics and performance insights</p>
      </div>
      <AnalyticsDashboard />
    </div>
  );
}
