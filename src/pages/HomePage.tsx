import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PlusCircle, Sparkles, ClipboardList, Rocket } from 'lucide-react';

import { Card, Button, Badge } from '../components/ui';
import PatientWizard from '../components/PatientWizard';
import { createDemoSevereCase } from '../utils/demo';

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [showWizard, setShowWizard] = useState(false);

  return (
    <div className="space-y-3">
      <Card
        title={
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles size={18} />
              <span>{t('home.primary')}</span>
            </div>
            <Badge tone="green">PWA Offline ✅</Badge>
          </div>
        }
        subtitle={i18n.language === 'fa' ? 'محاسبه‌گر دقیق + اوردرهای آماده + ذخیره بیمار + ترندها' : 'Calculator + Order writer + patient storage + trends'}
      >
        <div className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-1 gap-2">
            <Button onClick={() => navigate('/calculator')}>
              🧮 {t('home.goCalculator')}
            </Button>
            <Button variant="soft" onClick={() => navigate('/patients')}>
              <ClipboardList size={18} className="inline" /> {t('home.goPatients')}
            </Button>
            <Button variant="soft" onClick={() => setShowWizard(true)}>
              <PlusCircle size={18} className="inline" /> {t('patient.newPatient')}
            </Button>
          </div>

          <div className="rounded-3xl border border-mint-200 bg-white/50 p-3 text-sm text-mint-900">
            <div className="font-title mb-1">🎯 هدف اصلی</div>
            <ul className="list-disc ps-6 space-y-1">
              <li>ورودی‌های کم ولی کلیدی → خروجی سریع: مایعات، انسولین، پتاسیم، مانیتورینگ</li>
              <li>هشدارهای ایمنی پررنگ: «No insulin bolus»، «Hold insulin if K&lt;3»</li>
              <li>ذخیره‌سازی محلی (IndexedDB)؛ با بستن صفحه دیتا نمی‌پرد ✅</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card
        title={<span className="flex items-center gap-2"><Rocket size={18} /> {t('home.demo')}</span>}
        subtitle={i18n.language === 'fa' ? 'دختر ۱۲ ساله، نیوکِیس، Severe DKA، خروج از DKA در ~۱۲ ساعت' : '12y female, new-onset, severe DKA, resolves ~12h'}
      >
        <Button
          variant="primary"
          onClick={async () => {
            await createDemoSevereCase();
            navigate('/calculator');
          }}
        >
          🚀 Load demo
        </Button>
      </Card>

      {showWizard && (
        <Card title="🧩 ایجاد بیمار" subtitle="سریع، مرحله‌ای، با امکان پرش به محاسبه‌گر">
          <PatientWizard
            onCancel={() => setShowWizard(false)}
            onDone={() => {
              setShowWizard(false);
              navigate('/calculator');
            }}
            allowSkipAssessment
          />
        </Card>
      )}

      <div className="text-center text-xs text-mint-900/60">
        <span>{t('app.designer')}</span>
      </div>
    </div>
  );
}
