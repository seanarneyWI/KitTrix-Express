import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'WORKER';
  workCenter?: {
    id: string;
    name: string;
  };
}

interface Session {
  user: User;
}

const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState<string>('');
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const updateDate = () => {
      setCurrentDate(new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }));
    };

    updateDate();
    const interval = setInterval(updateDate, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const mockSession: Session = {
      user: {
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@kittrix.com',
        role: 'ADMIN',
        workCenter: {
          id: 'wc-1',
          name: 'Line A'
        }
      }
    };
    setSession(mockSession);
    setIsLoading(false);
  }, []);

  const getNavItems = () => {
    if (!session) return [];

    const { role } = session.user;

    switch (role) {
      case 'ADMIN':
        return [
          { href: '/', label: 'Dashboard', icon: '📊' },
          { href: '/admin', label: 'Admin', icon: '⚙️' },
          { href: '/analytics', label: 'Analytics', icon: '📈' },
        ];

      case 'SUPERVISOR':
        return [
          { href: '/', label: 'Dashboard', icon: '📊' },
          { href: '/analytics', label: 'Analytics', icon: '📈' },
        ];

      case 'WORKER':
        return [];

      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const handleLogout = () => {
    setSession(null);
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-md border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-1">
            <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              KitTrix
            </div>
            <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
              v1.0
            </span>
            {session && (
              <div className="ml-4 px-3 py-1 bg-gray-100 rounded-full text-sm">
                <span className="font-medium">{session.user.name}</span>
                <span className="text-gray-500 ml-2">({session.user.role})</span>
                {session.user.workCenter && (
                  <span className="text-gray-400 ml-1">• {session.user.workCenter.name}</span>
                )}
              </div>
            )}
          </div>

          {session && navItems.length > 0 && (
            <div className="flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200
                      ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    <span className="text-sm">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              {currentDate}
            </div>
            {session && (
              <button
                onClick={handleLogout}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;