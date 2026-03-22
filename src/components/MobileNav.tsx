import { Link, useLocation } from 'react-router-dom';
import { Users, UserPlus, Settings, Download, UsersRound } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/groups', icon: UsersRound, label: 'Groups' },
  { href: '/connections', icon: Users, label: 'Connections' },
  { href: '/invite', icon: UserPlus, label: 'Invite' },
  { href: '/install', icon: Download, label: 'Install' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t bg-card/95 backdrop-blur-md safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
