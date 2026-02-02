import React, { useEffect, useMemo, useState } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { setLanguage } from './i18n/i18n';
import { Home, Users, Calculator, LineChart, Smartphone, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';

import HomePage from './pages/HomePage';
import PatientsPage from './pages/PatientsPage';
import CalculatorPage from './pages/CalculatorPage';
import TrendsPage from './pages/TrendsPage';

type ViewMode = 'mobile' | 'desktop';

function classNames(...cls: (string | false | null | undefined)[]) {
  return cls.filter(Boolean).join(' ');
}

export default function App() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>((localStorage.getItem('viewMode') as ViewMode) || 'mobile');

  useEffect(() => {
    // keep html dir synced
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = i18n.language === 'fa' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  const isMobileFrame = viewMode === 'mobile';

  const NavItem = useMemo(() => {
    return function _NavItem({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
      return (
        <NavLink
          to={to}
          className={({ isActive }) =>
            classNames(
              'flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition',
              isActive ? 'bg-mint-600 text-white shadow' : 'text-mint-800 hover:bg-mint-100'
            )
          }
        >
          <Icon size={18} />
          <span>{label}</span>
        </NavLink>
      );
    };
  }, []);

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-30 px-3 pt-3">
        <div className="glass mx-auto flex max-w-6xl items-center justify-between rounded-3xl px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-mint-400 to-mint-600 text-white shadow"
              title="DKA"
              onClick={() => navigate('/')}
              style={{ cursor: 'pointer' }}
            >
              <span className="font-title text-xl">DKA</span>
            </div>
            <div className="leading-tight">
              <div className="font-title text-xl">
                <span className={i18n.language === 'en' ? 'font-en' : ''}>{t('app.title')}</span>
              </div>
              <div className="text-xs text-mint-800/80">
                <span className={i18n.language === 'en' ? 'font-en' : ''}>{t('app.subtitle')}</span>
                <span className="mx-2">•</span>
                <span>{t('app.slogan')}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View mode */}
            <button
              className="flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-2 text-xs font-semibold text-mint-900 shadow-sm ring-1 ring-mint-200 hover:bg-white"
              onClick={() => {
                const next: ViewMode = viewMode === 'mobile' ? 'desktop' : 'mobile';
                setViewMode(next);
                localStorage.setItem('viewMode', next);
              }}
            >
              {viewMode === 'mobile' ? <Smartphone size={16} /> : <Monitor size={16} />}
              <span>{t('view.toggle')}: {viewMode === 'mobile' ? t('view.mobile') : t('view.desktop')}</span>
            </button>

            {/* Language */}
            <button
              className="rounded-2xl bg-gradient-to-br from-white/80 to-white/60 px-3 py-2 text-xs font-semibold text-mint-900 shadow-sm ring-1 ring-mint-200 hover:from-white"
              onClick={() => {
                const next = i18n.language === 'fa' ? 'en' : 'fa';
                setLanguage(next as 'fa' | 'en');
              }}
              title="FA/EN"
            >
              🌐 {i18n.language.toUpperCase()}
            </button>

            <div className="hidden md:block text-[11px] text-mint-900/70 ps-2">
              {t('app.designer')}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-3 pb-24 pt-4">
        <div className={isMobileFrame ? 'mx-auto phone-frame' : ''}>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/patients" element={<PatientsPage />} />
              <Route path="/calculator" element={<CalculatorPage />} />
              <Route path="/trends" element={<TrendsPage />} />
            </Routes>
          </motion.div>
        </div>
      </div>

      {/* Bottom nav (mobile-friendly) */}
      <div className="fixed bottom-3 left-0 right-0 z-40 px-3">
        <div className="glass mx-auto flex max-w-6xl items-center justify-between gap-2 rounded-3xl p-2">
          <NavItem to="/" icon={Home} label={t('nav.home')} />
          <NavItem to="/patients" icon={Users} label={t('nav.patients')} />
          <NavItem to="/calculator" icon={Calculator} label={t('nav.calculator')} />
          <NavItem to="/trends" icon={LineChart} label={t('nav.trends')} />
        </div>
      </div>
    </div>
  );
}
