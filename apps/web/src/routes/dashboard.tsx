import { Link } from 'react-router-dom';
import { useCycles } from '@/hooks/use-cycles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BlurredValue } from '@/components/ui/blurred-value';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Calendar, DollarSign, Users, FileText, CalendarCheck, Sparkles } from 'lucide-react';

export default function DashboardPage() {
  const { data: cycles, isLoading } = useCycles();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  const latestCycle = cycles?.[0]; // Cycles are sorted by createdAt desc
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">Company Portal - Golden Sheet Management</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <a
              href="https://calendly.com/vsol/meeting-with-bandeira"
              target="_blank"
              rel="noopener noreferrer"
            >
              <CalendarCheck className="mr-2 h-4 w-4" />
              Schedule Meeting
            </a>
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <Link to="/cycles/new">
              <Plus className="mr-2 h-4 w-4" />
              New Cycle
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
              <BlurredValue>{formatCurrency(yearlyBonusTotal)}</BlurredValue>
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
              {cycles.slice(0, 5).map((cycle: any, index: number) => {
                const isLatest = index === 0;
                return (
                  <Link
                    key={cycle.id}
                    to={`/cycles/${cycle.id}`}
                    className={`
                      relative flex items-center justify-between p-4 rounded-lg transition-all duration-200
                      ${isLatest 
                        ? 'border-2 border-blue-500/30 bg-gradient-to-r from-blue-50/50 to-transparent shadow-md hover:shadow-lg hover:border-blue-500/50' 
                        : 'border rounded-lg hover:bg-gray-50 hover:border-gray-300'
                      }
                    `}
                  >
                    {isLatest && (
                      <div className="absolute -top-2 -right-2">
                        <Badge 
                          variant="default" 
                          className="bg-blue-600 text-white shadow-sm flex items-center gap-1 px-2 py-0.5"
                        >
                          <Sparkles className="h-3 w-3" />
                          Latest
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {isLatest && (
                        <div className="w-1 h-12 bg-gradient-to-b from-blue-500 to-blue-400 rounded-full flex-shrink-0" />
                      )}
                      <div className={`${isLatest ? 'flex-1' : ''} min-w-0`}>
                        <div className="flex items-center gap-2">
                          <h3 className={`font-medium text-sm sm:text-base truncate ${isLatest ? 'text-blue-900' : 'text-gray-900'}`}>
                            {cycle.monthLabel}
                          </h3>
                        </div>
                        <p className={`text-xs sm:text-sm ${isLatest ? 'text-blue-700' : 'text-gray-600'}`}>
                          Created {formatDate(cycle.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-medium text-sm sm:text-base ${isLatest ? 'text-blue-900' : 'text-gray-900'}`}>
                        {cycle.globalWorkHours} hours
                      </p>
                      <p className={`text-xs sm:text-sm ${isLatest ? 'text-blue-700' : 'text-gray-600'}`}>
                        {cycle.omnigoBonus ? <BlurredValue>{formatCurrency(cycle.omnigoBonus)}</BlurredValue> : 'No bonus'}
                      </p>
                    </div>
                  </Link>
                );
              })}
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
