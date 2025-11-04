import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  onStayLoggedIn: () => void;
  onLogout: () => void;
  warningSeconds?: number;
}

export function SessionTimeoutModal({
  isOpen,
  onStayLoggedIn,
  onLogout,
  warningSeconds = 60
}: SessionTimeoutModalProps) {
  const [countdown, setCountdown] = useState(warningSeconds);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(warningSeconds);
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, onLogout, warningSeconds]);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            <DialogTitle>Session Timeout Warning</DialogTitle>
          </div>
          <DialogDescription className="pt-4">
            <div className="text-center">
              <p className="text-base mb-4">
                Your session is about to expire due to inactivity.
              </p>
              <div className="text-4xl font-bold text-orange-500 mb-4">
                {countdown}
              </div>
              <p className="text-sm text-gray-600">
                seconds remaining
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 mt-4">
          <Button
            onClick={onStayLoggedIn}
            className="flex-1"
            variant="default"
          >
            Stay Logged In
          </Button>
          <Button
            onClick={onLogout}
            className="flex-1"
            variant="outline"
          >
            Logout Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
