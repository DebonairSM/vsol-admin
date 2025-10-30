import { Link } from 'react-router-dom';
import { useCycles } from '@/hooks/use-cycles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Calendar, DollarSign, Users, FileText, CalendarCheck } from 'lucide-react';

export default function DashboardPage() {
  const { data: cycles, isLoading } = useCycles();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  const latestCycle = cycles?.[0]; // Cycles are sorted by monthLabel desc
  const currentYear = new Date().getFullYear();
  
  // Calculate total bonus for current year
  // Extract year from monthLabel (e.g., "January 2024") or use createdAt year as fallback
  const yearlyBonusTotal = cycles?.reduce((sum, cycle) => {
    let cycleYear: number | null = null;
    
    // Try to extract year from monthLabel (format: "Month YYYY")
    const yearMatch = cycle.monthLabel.match(/\b(\d{4})\b/);
    if (yearMatch) {
      cycleYear = parseInt(yearMatch[1], 10);
    } else {
      // Fallback to createdAt year
      cycleYear = new Date(cycle.createdAt).getFullYear();
    }
    
    if (cycleYear === currentYear && cycle.omnigoBonus) {
      return sum + cycle.omnigoBonus;
    }
    return sum;
  }, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">VSol Admin - Golden Sheet Management</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <a
              href="https://calendly.com/vsol/meeting-with-bandeira"
              target="_blank"
              rel="noopener noreferrer"
            >
              <CalendarCheck className="mr-2 h-4 w-4" />
              Schedule Meeting
            </a>
          </Button>
          <Button asChild>
            <Link to="/cycles/new">
              <Plus className="mr-2 h-4 w-4" />
              New Cycle
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cycles</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cycles?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latest Cycle</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestCycle?.monthLabel || 'None'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Global Work Hours</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestCycle?.globalWorkHours || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Omnigo Bonus</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(yearlyBonusTotal)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Total paid in {currentYear}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Cycles */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payroll Cycles</CardTitle>
          <CardDescription>
            Click on a cycle to view the Golden Sheet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cycles && cycles.length > 0 ? (
            <div className="space-y-3">
              {cycles.slice(0, 5).map((cycle: any) => (
                <Link
                  key={cycle.id}
                  to={`/cycles/${cycle.id}`}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <h3 className="font-medium">{cycle.monthLabel}</h3>
                    <p className="text-sm text-gray-600">
                      Created {formatDate(cycle.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {cycle.globalWorkHours} hours
                    </p>
                    <p className="text-sm text-gray-600">
                      {cycle.omnigoBonus ? formatCurrency(cycle.omnigoBonus) : 'No bonus'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>No payroll cycles found</p>
              <p className="text-sm">Create your first cycle to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
