import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { 
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { 
  LayoutDashboard, 
  FileText, 
  User,
  Laptop,
  LogOut,
  Menu
} from 'lucide-react';

const consultantNavigation = [
  { name: 'Dashboard', href: '/consultant', icon: LayoutDashboard },
  { name: 'Upload Invoice', href: '/consultant/invoices', icon: FileText },
  { name: 'My Profile', href: '/consultant/profile', icon: User },
  { name: 'My Equipment', href: '/consultant/equipment', icon: Laptop },
];

function ConsultantSidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b">
        <img src="/vsol-logo-25-c.png" alt="VSol Logo" className="h-8 w-auto" />
        <span className="ml-2 text-xl font-semibold text-gray-900">
          Company Portal
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {consultantNavigation.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href === '/consultant' && location.pathname === '/consultant');
          
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
      </nav>

      {/* User Info & Logout */}
      <div className="border-t px-4 py-3 space-y-2">
        <div className="text-sm text-gray-600">
          <div className="font-medium text-gray-900">{user?.username}</div>
          <div className="text-xs text-gray-500">Consultant</div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            logout();
            onLinkClick?.();
          }}
          className="w-full justify-start"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}

export default function ConsultantLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b px-4 py-3 flex items-center justify-between">
        <img src="/vsol-logo-25-c.png" alt="VSol Logo" className="h-6 w-auto" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      {/* Mobile sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <ConsultantSidebarContent onLinkClick={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:flex-shrink-0">
          <div className="flex w-64 flex-col fixed h-screen bg-white border-r">
            <ConsultantSidebarContent />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:pl-64 pt-16 lg:pt-0">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

