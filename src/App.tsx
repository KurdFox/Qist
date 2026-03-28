import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import CustomerManagement from './components/CustomerManagement';
import LoanManagement from './components/LoanManagement';
import InstallmentTracking from './components/InstallmentTracking';
import Activities from './components/Activities';
import Reports from './components/Reports';
import Login from './components/Login';
import ErrorBoundary from './components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

import { ThemeProvider } from './contexts/ThemeContext';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Sync user profile with Firestore
        const userRef = doc(db, 'users', user.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              role: 'user', // Default role
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString()
            });
          } else {
            await setDoc(userRef, {
              lastLogin: new Date().toISOString()
            }, { merge: true });
          }
        } catch (error) {
          console.error("Error syncing user profile:", error);
        }
      }
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-blue-600" size={48} />
          <p className="text-gray-500 dark:text-gray-400 font-bold animate-pulse">کەمێک چاوەڕوانبە...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
            <Route path="/" element={user ? <Layout /> : <Navigate to="/login" />}>
              <Route index element={<Dashboard />} />
              <Route path="customers" element={<CustomerManagement />} />
              <Route path="loans" element={<LoanManagement />} />
              <Route path="installments" element={<InstallmentTracking />} />
              <Route path="activities" element={<Activities />} />
              <Route path="reports" element={<Reports />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
