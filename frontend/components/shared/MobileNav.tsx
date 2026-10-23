'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { role } = useAuthStore();

  if (!role) return null;

  const coupleNavItems = [
    { icon: '🏠', label: 'Home', path: '/couple' },
    { icon: '🎨', label: 'Vision', path: '/couple/vision' },
    { icon: '🖼️', label: 'Moodboard', path: '/couple/moodboard' },
    { icon: '🛒', label: 'Cart', path: '/couple/cart' },
    { icon: '💬', label: 'Messages', path: '/couple/messages' },
  ];

  const plannerNavItems = [
    { icon: '📊', label: 'Home', path: '/planner' },
    { icon: '🔍', label: 'Leads', path: '/planner/leads' },
    { icon: '🖼️', label: 'Profile', path: '/planner/profile' },
  ];
  const vendorNavItems = [
    { icon: '🏠', label: 'Home', path: '/vendor' },
    { icon: '📥', label: 'Requests', path: '/vendor/inquiries' },
    { icon: '🖼️', label: 'Portfolio', path: '/vendor/portfolio' },
    { icon: '👤', label: 'Profile', path: '/vendor/profile' },
  ];

  const navItems =
    role === 'couple' ? coupleNavItems : role === 'planner' ? plannerNavItems : vendorNavItems;

  const themeColor = role === 'couple' ? '#1E4636' : '#3A2563';

  return (
    <nav className="mobile-nav md:hidden">
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            style={{
              color: isActive ? themeColor : '#1E4636',
            }}
          >
            <span className="text-xl mb-1">{item.icon}</span>
            <span className="text-xs">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
