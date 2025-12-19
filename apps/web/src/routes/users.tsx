import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Mail, Key, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function UsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);

  const { data: consultantUsers, isLoading } = useQuery({
    queryKey: ['consultant-users'],
    queryFn: () => apiClient.getConsultantUsers(),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, sendEmail }: { userId: number; sendEmail: boolean }) => {
      return apiClient.resetUserPassword(userId, sendEmail);
    },
    onSuccess: (data) => {
      toast({
        title: 'Password Reset',
        description: `Password reset successfully. New password: ${data.newPassword}`,
      });
      setShowResetDialog(false);
      setResetUserId(null);
      queryClient.invalidateQueries({ queryKey: ['consultant-users'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Reset Failed',
        description: error.message || 'Failed to reset password',
        variant: 'destructive',
      });
    },
  });

  const sendCredentialsMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiClient.sendUserCredentials(userId);
    },
    onSuccess: () => {
      toast({
        title: 'Email Sent',
        description: 'Credentials email sent successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['consultant-users'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Send Failed',
        description: error.message || 'Failed to send email',
        variant: 'destructive',
      });
    },
  });

  const handleResetPassword = (userId: number) => {
    setResetUserId(userId);
    setShowResetDialog(true);
  };

  const confirmResetPassword = (sendEmail: boolean) => {
    if (resetUserId) {
      resetPasswordMutation.mutate({ userId: resetUserId, sendEmail });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage consultant accounts and credentials
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Consultant Accounts</CardTitle>
          <CardDescription>
            View and manage consultant user accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : consultantUsers && consultantUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Consultant</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consultantUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      {user.consultant ? (
                        <Link
                          to={`/consultants/${user.consultant.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {user.consultant.name}
                        </Link>
                      ) : (
                        <span className="text-gray-400">No consultant linked</span>
                      )}
                    </TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.consultant?.email || 'N/A'}</TableCell>
                    <TableCell>
                      {user.mustChangePassword ? (
                        <Badge variant="destructive">Password Change Required</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResetPassword(user.id)}
                          disabled={resetPasswordMutation.isPending}
                        >
                          <Key className="h-4 w-4 mr-1" />
                          Reset Password
                        </Button>
                        {user.consultant?.email && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => sendCredentialsMutation.mutate(user.id)}
                            disabled={sendCredentialsMutation.isPending}
                          >
                            <Mail className="h-4 w-4 mr-1" />
                            Send Credentials
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-gray-500">No consultant accounts found</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset the user's password to the default value and require them to change it on next login.
              Would you like to send the new credentials via email?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmResetPassword(false)}
              disabled={resetPasswordMutation.isPending}
            >
              Reset Only
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => confirmResetPassword(true)}
              disabled={resetPasswordMutation.isPending}
            >
              Reset & Send Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

