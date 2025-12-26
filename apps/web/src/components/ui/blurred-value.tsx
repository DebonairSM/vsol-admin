import { useDemo } from '@/contexts/demo-context';
import { cn } from '@/lib/utils';

interface BlurredValueProps {
  children: React.ReactNode;
  className?: string;
}

export function BlurredValue({ children, className }: BlurredValueProps) {
  const { isDemoMode } = useDemo();
  
  return (
    <span
      className={cn(
        'transition-all duration-200',
        isDemoMode && 'blur-sm select-none',
        className
      )}
    >
      {children}
    </span>
  );
}












