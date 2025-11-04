import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePayoneerPayees } from '@/hooks/use-payoneer';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { RefreshCw, Settings, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function PayoneerPayeesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = usePayoneerPayees();
  const [searchTerm, setSearchTerm] = useState('');

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['payoneer', 'payees'] });
    refetch();
  };

  const filteredPayees = data?.payees?.filter(payee => {
    const search = searchTerm.toLowerCase();
    return (
      payee.email.toLowerCase().includes(search) ||
      payee.firstName.toLowerCase().includes(search) ||
      payee.lastName.toLowerCase().includes(search) ||
      payee.payeeId.toLowerCase().includes(search)
    );
  }) || [];

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'active') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
    } else if (statusLower === 'inactive') {
      return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Inactive</Badge>;
    } else if (statusLower === 'pending') {
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  if (error) {
    const errorMessage = (error as any)?.response?.data?.message || (error as Error).message;
    const isConfigError = errorMessage.includes('configuration') || errorMessage.includes('credentials');

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payoneer Payees</h1>
          <p className="text-gray-600">View and manage Payoneer payee data</p>
        </div>

        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {isConfigError ? 'Configuration Required' : 'Error Loading Payees'}
                </h3>
                <p className="text-gray-600 mt-2">
                  {errorMessage}
                </p>
              </div>
              {isConfigError && (
                <Link to="/settings">
                  <Button>
                    <Settings className="mr-2 h-4 w-4" />
                    Configure Payoneer
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
        <div className="text-lg">Loading payees...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payoneer Payees</h1>
          <p className="text-gray-600">View and manage Payoneer payee data</p>
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
          <CardTitle>Payees ({data?.count || 0})</CardTitle>
          <CardDescription>
            Payees from your Payoneer Mass Payouts account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search by name, email, or payee ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          {filteredPayees.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchTerm ? 'No payees found matching your search' : 'No payees found'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayees.map((payee) => (
                    <TableRow key={payee.payeeId}>
                      <TableCell className="font-mono text-sm">
                        {payee.payeeId}
                      </TableCell>
                      <TableCell>
                        {payee.firstName} {payee.lastName}
                      </TableCell>
                      <TableCell>{payee.email}</TableCell>
                      <TableCell>{getStatusBadge(payee.status)}</TableCell>
                      <TableCell>
                        {payee.paymentMethod || <span className="text-gray-400">—</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {searchTerm && (
            <div className="mt-4 text-sm text-gray-500">
              Showing {filteredPayees.length} of {data?.count || 0} payees
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

