import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTimeDoctorActivity, useTimeDoctorUsers } from '@/hooks/use-timedoctor';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { RefreshCw, Settings, AlertCircle, Calendar } from 'lucide-react';
import { format, subDays } from 'date-fns';

export default function TimeDoctorActivityPage() {
  const queryClient = useQueryClient();
  
  // Default to last 7 days
  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: usersData } = useTimeDoctorUsers();
  const { data, isLoading, error, refetch } = useTimeDoctorActivity({
    from: fromDate,
    to: toDate,
    userId: selectedUserId || undefined
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['timedoctor', 'activity'] });
    refetch();
  };

  const filteredActivities = data?.activities?.filter(activity => {
    const search = searchTerm.toLowerCase();
    return (
      activity.userName.toLowerCase().includes(search) ||
      activity.tasks.toLowerCase().includes(search) ||
      activity.projects.toLowerCase().includes(search)
    );
  }) || [];

  if (error) {
    const errorMessage = (error as any)?.response?.data?.message || (error as Error).message;
    const isConfigError = errorMessage.includes('configuration') || errorMessage.includes('credentials');

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Time Doctor Activity</h1>
          <p className="text-gray-600">View work hours and activity from Time Doctor</p>
        </div>

        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {isConfigError ? 'Configuration Required' : 'Error Loading Activity'}
                </h3>
                <p className="text-gray-600 mt-2">
                  {errorMessage}
                </p>
              </div>
              {isConfigError && (
                <Link to="/settings">
                  <Button>
                    <Settings className="mr-2 h-4 w-4" />
                    Configure Time Doctor
                  </Button>
                </Link>
              )}
              {!isConfigError && (
                <Button onClick={handleRefresh} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading activity...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Time Doctor Activity</h1>
          <p className="text-gray-600">View work hours and activity from Time Doctor</p>
        </div>
        <div className="flex gap-3">
          <Link to="/settings">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </Link>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter activity by date range and user</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromDate">From Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="toDate">To Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="userId">Filter by User</Label>
              <select
                id="userId"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">All Users</option>
                {usersData?.users?.map((user) => (
                  <option key={user.userId} value={user.userId}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by user, task, or project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Records ({data?.count || 0})</CardTitle>
          <CardDescription>
            Work hours tracked from {format(new Date(fromDate), 'MMM dd, yyyy')} to {format(new Date(toDate), 'MMM dd, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredActivities.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchTerm ? 'No activity found matching your search' : 'No activity found for this date range'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Work Hours</TableHead>
                    <TableHead>Tasks</TableHead>
                    <TableHead>Projects</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.map((activity, index) => (
                    <TableRow key={`${activity.userId}-${activity.date}-${index}`}>
                      <TableCell className="font-medium">
                        {activity.userName}
                      </TableCell>
                      <TableCell>
                        {format(new Date(activity.date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        {activity.workHours.toFixed(2)} hrs
                      </TableCell>
                      <TableCell>
                        {activity.tasks || <span className="text-gray-400">—</span>}
                      </TableCell>
                      <TableCell>
                        {activity.projects || <span className="text-gray-400">—</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {searchTerm && (
            <div className="mt-4 text-sm text-gray-500">
              Showing {filteredActivities.length} of {data?.count || 0} activity records
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


