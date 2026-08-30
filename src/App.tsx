/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SettingsProvider } from './context/SettingsContext';
import { ProductProvider } from './context/ProductContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { CompareProvider } from './context/CompareContext';

import PublicLayout from './components/PublicLayout';
import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import Favorites from './pages/Favorites';
import Login from './pages/Login';
import Register from './pages/Register';
import Account from './pages/Account';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import TrackOrder from './pages/TrackOrder';
import Support from './pages/Support';
import CartRedirect from './pages/CartRedirect';

// Admin imports
import AdminLayout from './components/AdminLayout';
import AdminBanners from './pages/AdminBanners';
import AdminHomeSettings from './pages/AdminHomeSettings';
import AdminDashboard from './pages/AdminDashboard';
import AdminProducts from './pages/AdminProducts';
import AdminCategories from './pages/AdminCategories';
import AdminOrders from './pages/AdminOrders';
import AdminHelp from './pages/AdminHelp';
import AdminManualPayments from './pages/AdminManualPayments';
import AdminPaymentGateways from './pages/AdminPaymentGateways';
import AdminUsers from './pages/AdminUsers';
import AdminUserForm from './pages/AdminUserForm';
import AdminSettings from './pages/AdminSettings';
import AdminManage from './pages/AdminManage';
import AdminPages from './pages/AdminPages';
import AdminProductForm from './pages/AdminProductForm';
import AdminLiveChat from './pages/AdminLiveChat';
import AdminSupportMessages from './pages/AdminSupportMessages';
import AdminInvoiceTemplate from './pages/AdminInvoiceTemplate';
import AdminDiscounts from './pages/AdminDiscounts';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminNotificationAPI from './pages/AdminNotificationAPI';
import AdminNotificationTemplates from './pages/AdminNotificationTemplates';
import AdminNotificationControl from './pages/AdminNotificationControl';
import AdminSignupMethods from './pages/AdminSignupMethods';

// Custom Page import
import CustomPage from './pages/CustomPage';
import IphoneOrderDemo from './pages/IphoneOrderDemo';
import ScrollToTop from './components/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';

import { HelmetProvider } from 'react-helmet-async';

export default function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <SettingsProvider>
        <AuthProvider>
          <CartProvider>
            <ProductProvider>
              <FavoritesProvider>
                <CompareProvider>
                  <BrowserRouter>
                  <ScrollToTop />
                  <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col">
                  <Routes>
                    {/* Public Routes with Header/Footer */}
                    <Route element={<PublicLayout />}>
                      <Route path="/" element={<Home />} />
                      <Route path="/product/:slug" element={<ProductDetails />} />
                      <Route path="/product/:id" element={<ProductDetails />} />
                      <Route path="/favorites" element={<Favorites />} />
                      <Route path="/wishlist" element={<Favorites />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/account" element={<Account />} />
                      <Route path="/track-order" element={<TrackOrder />} />
                      <Route path="/track-order/:id" element={<TrackOrder />} />
                      <Route path="/support" element={<Support />} />
                      <Route path="/cart" element={<CartRedirect />} />
                      <Route path="/checkout" element={<Checkout />} />
                      <Route path="/order-success/:id" element={<OrderSuccess />} />
                      <Route path="/iphone-order-confirmed-details" element={<IphoneOrderDemo />} />
                      <Route path="/iphone-order-demo" element={<IphoneOrderDemo />} />
                      <Route path="/iphone-order-confirmed" element={<IphoneOrderDemo />} />
                      {/* Custom pages dynamically routed under /page/:slug */}
                      <Route path="/page/:slug" element={<CustomPage />} />
                    </Route>

                    {/* Admin Nested Routes (Isolated, Full Screen) */}
                    <Route path="/admin" element={<AdminLayout />}>
                      <Route index element={<AdminDashboard />} />
                      <Route path="analytics" element={<AdminAnalytics />} />
                      <Route path="reports" element={<AdminAnalytics />} />
                      <Route path="categories" element={<AdminCategories />} />
                      <Route path="products" element={<AdminProducts />} />
                      <Route path="product/new" element={<AdminProductForm />} />
                      <Route path="product/edit/:id" element={<AdminProductForm />} />
                      <Route path="discounts" element={<AdminDiscounts />} />
                      <Route path="offers" element={<AdminDiscounts />} />
                      <Route path="coupons" element={<AdminDiscounts />} />
                      
                      <Route path="orders" element={<AdminOrders />} />
                      <Route path="manual-payments" element={<AdminManualPayments />} />
                      <Route path="payment-gateways" element={<AdminPaymentGateways />} />
                      <Route path="invoice-template" element={<AdminInvoiceTemplate />} />
                      
                      <Route path="users" element={<AdminUsers />} />
                      <Route path="user/new" element={<AdminUserForm />} />
                      <Route path="user/edit/:id" element={<AdminUserForm />} />
                      
                      {/* Notifications & Settings */}
                      <Route path="notifications/api" element={<AdminNotificationAPI />} />
                      <Route path="notifications/templates" element={<AdminNotificationTemplates />} />
                      <Route path="notifications/control" element={<AdminNotificationControl />} />
                      <Route path="notifications/signup" element={<AdminSignupMethods />} />
                      
                      <Route path="live-chat" element={<AdminLiveChat />} />
                      <Route path="support-messages" element={<AdminSupportMessages />} />
                      <Route path="settings" element={<AdminSettings />} />

          <Route path="customize">
            <Route path="banners" element={<AdminBanners />} />
            <Route path="home" element={<AdminHomeSettings />} />
          </Route>

                      <Route path="manage" element={<AdminManage />} />
                      <Route path="pages" element={<AdminPages />} />
                      <Route path="help" element={<AdminHelp />} />
                    </Route>
                  </Routes>
                </div>
              </BrowserRouter>
              </CompareProvider>
              </FavoritesProvider>
            </ProductProvider>
          </CartProvider>
        </AuthProvider>
        </SettingsProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}
