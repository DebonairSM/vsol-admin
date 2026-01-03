import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const location = useLocation();
  const sessionExpired = location.state?.sessionExpired;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await login(username, password, keepLoggedIn);
      
      if (!result) {
        // Should not happen, but handle gracefully
        navigate('/dashboard');
        return;
      }
      
      // Check if password change is required
      if (result.mustChangePassword) {
        // Redirect to password change page
        navigate('/consultant/change-password', { 
          state: { 
            username: result.user?.username,
            mustChangePassword: true 
          } 
        });
        return;
      }
      
      // Redirect based on user role
      if (result.user?.role === 'consultant') {
        navigate('/consultant');
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      setError(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <img src="/vsol-logo-25-c.png" alt="VSol Logo" className="h-12 w-auto" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Portal
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Our complete Business Management Solution
          </p>
        </div>

        {/* Show session expired message */}
        {sessionExpired && (
          <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-md">
            <p className="text-sm font-medium">
              Your session expired due to inactivity. Please log in again.
            </p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Sign in to your account</CardTitle>
            <CardDescription>
              Enter your credentials to access the admin panel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Enter your username"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>

              {/* NEW: Keep me logged in checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="keep-logged-in" 
                  checked={keepLoggedIn}
                  onCheckedChange={(checked) => setKeepLoggedIn(checked === true)}
                />
                <label
                  htmlFor="keep-logged-in"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Keep me logged in
                </label>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
