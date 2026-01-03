import { useParams, Link } from 'react-router-dom';
import { useConsultantProfile } from '@/hooks/use-consultant-profile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Key, Mail, Copy } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { BlurredValue } from '@/components/ui/blurred-value';
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

type ResetConsultantPasswordResponse = {
  success: boolean;
  message: string;
  userId: number;
  username: string;
  consultantEmail: string | null;
  newPassword: string;
  mustChangePassword: true;
  emailPreview: { to: string; subject: string; html: string; text: string } | null;
  emailSent: boolean;
};

export default function ConsultantProfilePage() {
  const { id } = useParams<{ id: string }>();
  const consultantId = parseInt(id!);
  
  const { data: consultant, isLoading, error } = useConsultantProfile(consultantId);
  const { user } = useAuth();
  const { toast } = useToast();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetResult, setResetResult] = useState<ResetConsultantPasswordResponse | null>(null);

  const resetPasswordMutation = useMutation({
    mutationFn: async (sendEmail: boolean) => {
      return apiClient.resetConsultantPassword(consultantId, sendEmail) as Promise<ResetConsultantPasswordResponse>;
    },
    onSuccess: (data, sendEmail) => {
      setResetResult(data);
      const emailMessage = sendEmail
        ? data.emailSent
          ? 'Email sent.'
          : 'Email not sent (email service not configured).'
        : 'Email not sent.';

      toast({
        title: 'Password reset',
        description: `Temporary password generated. ${emailMessage}`,
      });

      setShowResetDialog(false);
    },
    onError: (err: any) => {
      toast({
        title: 'Reset failed',
        description: err?.message || 'Failed to reset password',
        variant: 'destructive',
      });
    },
  });

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied', description: `${label} copied to clipboard.` });
    } catch {
      toast({ title: 'Copy failed', description: 'Could not copy to clipboard.', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading consultant...</div>
      </div>
    );
  }

  if (error || !consultant) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-red-600">Consultant not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4">
            <Link to="/consultants">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{consultant.name}</h1>
              <p className="mt-2 text-sm text-gray-600">
                Consultant Profile
              </p>
            </div>
          </div>
        </div>
        <Link to={`/consultants/${consultantId}/edit`}>
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Consultant details and information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Name</label>
              <p className="text-sm text-gray-900">{consultant.name}</p>
            </div>
            {consultant.email && (
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-sm text-gray-900">{consultant.email}</p>
              </div>
            )}
            {consultant.phone && (
              <div>
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <p className="text-sm text-gray-900">{consultant.phone}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700">Hourly Rate</label>
              <p className="text-sm text-gray-900">${consultant.hourlyRate?.toFixed(2) || '0.00'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {user?.role === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle>Portal Account</CardTitle>
            <CardDescription>
              Reset the consultant portal password and optionally send credentials by email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => setShowResetDialog(true)}
                disabled={resetPasswordMutation.isPending}
              >
                <Key className="h-4 w-4 mr-2" />
                Reset Password
              </Button>
            </div>

            {resetResult && (
              <div className="space-y-4 rounded-md border bg-white p-4">
                <div className="space-y-1">
                  <div className="text-sm text-gray-600">Username</div>
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-sm">{resetResult.username}</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(resetResult.username, 'Username')}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm text-gray-600">Temporary Password</div>
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-sm">
                      <BlurredValue>{resetResult.newPassword}</BlurredValue>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(resetResult.newPassword, 'Temporary password')}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500">
                    The consultant will be required to change this password on first login.
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    <Mail className="h-4 w-4" />
                    Email Preview
                  </div>
                  {resetResult.emailPreview ? (
                    <div className="space-y-2">
                      <div className="text-sm">
                        <div className="text-gray-600">To</div>
                        <div className="font-mono">{resetResult.emailPreview.to}</div>
                      </div>
                      <div className="text-sm">
                        <div className="text-gray-600">Subject</div>
                        <div>{resetResult.emailPreview.subject}</div>
                      </div>
                      <details className="rounded-md border p-3">
                        <summary className="cursor-pointer text-sm font-medium">Text body</summary>
                        <pre className="mt-2 whitespace-pre-wrap text-xs text-gray-800">
                          {resetResult.emailPreview.text}
                        </pre>
                      </details>
                      <details className="rounded-md border p-3">
                        <summary className="cursor-pointer text-sm font-medium">HTML preview</summary>
                        <div
                          className="mt-2 rounded-md border bg-white p-3 text-sm"
                          dangerouslySetInnerHTML={{ __html: resetResult.emailPreview.html }}
                        />
                      </details>
                      <div className="text-xs text-gray-500">
                        {resetResult.emailSent ? 'Email was sent.' : 'Email was not sent.'}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">No email preview available (missing consultant email).</div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a new strong temporary password and require the consultant to change it on first login.
              Would you like to send the new credentials via email?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetPasswordMutation.mutate(false)}
              disabled={resetPasswordMutation.isPending}
            >
              Reset Only
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => resetPasswordMutation.mutate(true)}
              disabled={resetPasswordMutation.isPending}
            >
              Reset &amp; Send Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
