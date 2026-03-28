import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { logOut, auth } from '../firebase';
import { LayoutDashboard, Users, ReceiptText, CreditCard, LogOut, Menu, X, BarChart3, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useTheme } from '../contexts/ThemeContext';

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { name: 'داشبۆرد', path: '/', icon: LayoutDashboard },
    { name: 'کڕیاران', path: '/customers', icon: Users },
    { name: 'قەرزەکان', path: '/loans', icon: ReceiptText },
    { name: 'قیستەکان', path: '/installments', icon: CreditCard },
    { name: 'ڕاپۆرتەکان', path: '/reports', icon: BarChart3 },
  ];

  const handleLogout = async () => {
    await logOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col md:flex-row transition-colors duration-300">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800 shadow-sm sticky top-0 h-screen">
        <div className="p-8 flex items-center justify-between border-b border-gray-50 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg dark:shadow-none">
              <ReceiptText size={24} />
            </div>
            <span className="font-bold text-xl text-gray-900 dark:text-white tracking-tight">سیستەمی قیست</span>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-4 px-4 py-3.5 rounded-2xl font-medium transition-all group",
                  isActive 
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-sm dark:shadow-none" 
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                )
              }
            >
              <item.icon size={20} className={cn("transition-colors", "group-hover:text-blue-600 dark:group-hover:text-blue-400")} />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-6 border-t border-gray-50 dark:border-gray-800 space-y-4">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            {theme === 'light' ? 'باری تاریک' : 'باری ڕووناک'}
          </button>

          <div className="flex items-center gap-3 px-4">
            <img 
              src={auth.currentUser?.photoURL || `https://ui-avatars.com/api/?name=${auth.currentUser?.displayName || 'User'}`} 
              alt="User" 
              className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-800 shadow-sm dark:shadow-none"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{auth.currentUser?.displayName}</span>
              <span className="text-xs text-gray-400 truncate">{auth.currentUser?.email}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all group"
          >
            <LogOut size={20} />
            چوونە دەرەوە
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <ReceiptText size={18} />
          </div>
          <span className="font-bold text-lg dark:text-white">سیستەمی قیست</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed inset-0 z-40 bg-white dark:bg-gray-900 md:hidden pt-20"
          >
            <nav className="p-8 space-y-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-lg transition-all",
                      isActive ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
                    )
                  }
                >
                  <item.icon size={24} />
                  {item.name}
                </NavLink>
              ))}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut size={24} />
                چوونە دەرەوە
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
