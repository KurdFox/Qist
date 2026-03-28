import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { logOut, auth } from '../firebase';
import { LayoutDashboard, Users, ReceiptText, CreditCard, LogOut, Menu, X, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-l border-gray-100 shadow-sm sticky top-0 h-screen">
        <div className="p-8 flex items-center gap-3 border-b border-gray-50">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <ReceiptText size={24} />
          </div>
          <span className="font-bold text-xl text-gray-900 tracking-tight">سیستەمی قیست</span>
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
                    ? "bg-blue-50 text-blue-700 shadow-sm" 
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                )
              }
            >
              <item.icon size={20} className={cn("transition-colors", "group-hover:text-blue-600")} />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-6 border-t border-gray-50">
          <div className="flex items-center gap-3 mb-6 px-4">
            <img 
              src={auth.currentUser?.photoURL || `https://ui-avatars.com/api/?name=${auth.currentUser?.displayName || 'User'}`} 
              alt="User" 
              className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-gray-900 truncate">{auth.currentUser?.displayName}</span>
              <span className="text-xs text-gray-400 truncate">{auth.currentUser?.email}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-medium text-red-500 hover:bg-red-50 transition-all group"
          >
            <LogOut size={20} />
            چوونە دەرەوە
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <ReceiptText size={18} />
          </div>
          <span className="font-bold text-lg">سیستەمی قیست</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed inset-0 z-40 bg-white md:hidden pt-20"
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
                      isActive ? "bg-blue-50 text-blue-700" : "text-gray-500"
                    )
                  }
                >
                  <item.icon size={24} />
                  {item.name}
                </NavLink>
              ))}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-lg text-red-500"
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
