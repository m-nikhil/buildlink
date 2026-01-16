import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { BuildLinkLogo } from '@/components/BuildLinkLogo';

export function Header() {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <BuildLinkLogo size="sm" />
          <span className="text-xl font-bold tracking-tight">BuildLink</span>
        </Link>

        {user ? (
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-6">
              <Link 
                to="/" 
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Discover
              </Link>
              <Link 
                to="/connections" 
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Connections
              </Link>
              <Link 
                to="/settings" 
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Preferences
              </Link>
            </nav>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10 border-2 border-primary/20">
                    <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? 'User'} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none">{profile?.full_name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{profile?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile/edit')}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <Button onClick={() => navigate('/auth')} variant="default">
            Sign In
          </Button>
        )}
      </div>
    </header>
  );
}
