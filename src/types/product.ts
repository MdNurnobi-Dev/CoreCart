export type ProductType = 'physical' | 'digital' | 'service' | 'subscription' | 'bundle';

export interface ProductTypeOption {
  id: ProductType;
  label: string;
  shortLabel: string;
  icon: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  description: string;
  deliveryTag: string;
}

export const PRODUCT_TYPE_OPTIONS: ProductTypeOption[] = [
  {
    id: 'physical',
    label: 'Physical Product',
    shortLabel: 'Physical',
    icon: '📦',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-200',
    description: 'Tangible hardware or device delivered via courier with parcel tracking',
    deliveryTag: 'Courier Delivery'
  },
  {
    id: 'digital',
    label: 'Digital Product',
    shortLabel: 'Digital',
    icon: '⚡',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    description: 'Instant downloadable software, license key, digital manual, or firmware',
    deliveryTag: 'Instant Download'
  },
  {
    id: 'service',
    label: 'Service & Warranty',
    shortLabel: 'Service',
    icon: '🛠️',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
    description: 'Technical repair, device configuration, installation, or warranty plan',
    deliveryTag: 'Service & Support'
  },
  {
    id: 'subscription',
    label: 'Subscription / Plan',
    shortLabel: 'Subscription',
    icon: '🔄',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
    description: 'Recurring tech cloud service, membership, or maintenance license',
    deliveryTag: 'Recurring Access'
  },
  {
    id: 'bundle',
    label: 'Combo / Tech Bundle',
    shortLabel: 'Bundle',
    icon: '🎁',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    badgeBorder: 'border-indigo-200',
    description: 'Multi-item kit, accessory package, or curated gadget combo',
    deliveryTag: 'Package Kit'
  }
];

export function getProductTypeConfig(type?: string): ProductTypeOption {
  const normalized = (type || 'physical').toLowerCase().trim();
  const match = PRODUCT_TYPE_OPTIONS.find(o => o.id === normalized);
  return match || PRODUCT_TYPE_OPTIONS[0];
}
