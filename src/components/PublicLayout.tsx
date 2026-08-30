import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import CartSidebar from './CartSidebar';
import Footer from './Footer';
import ChatWidget from './ChatWidget';
import ErrorBoundary from './ErrorBoundary';
import CompareFloatingButton from './CompareFloatingButton';

export default function PublicLayout() {
  return (
    <>
      <Navbar />
      <CartSidebar />
      <main className="flex flex-col flex-1">
        <ErrorBoundary isNested title="Failed to load page content">
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
      <ChatWidget />
      <CompareFloatingButton />
    </>
  );
}

