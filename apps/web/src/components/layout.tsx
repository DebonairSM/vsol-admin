import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useDemo } from '@/contexts/demo-context';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import { 
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  CreditCard, 
  History, 
  LogOut,
  Table,
  Laptop,
  Clock,
  Settings,
  Calendar,
  Eye,
  EyeOff,
  Menu
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Consultants', href: '/consultants', icon: Users },
  { name: 'Equipment', href: '/equipment', icon: Laptop },
  { name: 'Work Hours', href: '/work-hours', icon: Clock },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Audit Log', href: '/audit', icon: History },
  { name: 'Settings', href: '/settings', icon: Settings },
];

function SidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const { user, logout } = useAuth();
  const { isDemoMode, toggleDemoMode } = useDemo();
  const location = useLocation();

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b">
        <Table className="h-8 w-8 text-blue-600" />
        <span className="ml-2 text-xl font-semibold text-gray-900">
          VSol Admin
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href === '/dashboard' && location.pathname === '/');
          
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onLinkClick}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
        {/* Calendly Link */}
        <a
          href="https://calendly.com/vsol/meeting-with-bandeira"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onLinkClick}
          className="flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        >
          <Calendar className="mr-3 h-5 w-5" />
          Schedule Meeting
        </a>
      </nav>

      {/* Demo Mode Toggle */}
      <div className="border-t px-4 py-3">
        <Button
          variant={isDemoMode ? "default" : "outline"}
          size="sm"
          onClick={toggleDemoMode}
          className={`w-full justify-start ${
            isDemoMode 
              ? 'bg-amber-500 hover:bg-amber-600 text-white' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {isDemoMode ? (
            <EyeOff className="mr-2 h-4 w-4" />
          ) : (
            <Eye className="mr-2 h-4 w-4" />
          )}
          Demo Mode {isDemoMode ? 'On' : 'Off'}
        </Button>
      </div>

      {/* User info and logout */}
      <div className="border-t px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{user?.username}</p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout()}
            className="text-gray-500 hover:text-gray-700"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileMenuOpen(true)}
          className="bg-white shadow-md"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile drawer menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent onLinkClick={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:z-50 md:w-64 md:bg-white md:shadow-lg">
        <SidebarContent />
      </div>

      {/* Main content */}
      <div className="pl-0 md:pl-64">
        <main className="pt-16 md:pt-6 pb-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            {children}
          </div>
        </main>
      </div>
      
      {/* Toast notifications */}
      <Toaster />
      <SonnerToaster />
    </div>
  );
}
