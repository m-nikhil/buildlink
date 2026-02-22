import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, CheckCircle, Smartphone, Bell, Wifi } from 'lucide-react';
import { Header } from '@/components/Header';
import { MobileNav } from '@/components/MobileNav';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const features = [
    {
      icon: Smartphone,
      title: 'Works Like a Native App',
      description: 'Add to your home screen for quick access',
    },
    {
      icon: Bell,
      title: 'Push Notifications',
      description: 'Get notified about new matches and messages',
    },
    {
      icon: Wifi,
      title: 'Works Offline',
      description: 'Browse your connections even without internet',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-2xl mx-auto px-4 py-6 md:py-8 pb-20 md:pb-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Install BuildLink</h1>
          <p className="text-muted-foreground">
            Get the full app experience on your device
          </p>
        </div>

        {isInstalled ? (
          <Card className="mb-8">
            <CardContent className="flex flex-col items-center py-8">
              <CheckCircle className="h-16 w-16 text-primary mb-4" />
              <h2 className="text-xl font-semibold mb-2">Already Installed!</h2>
              <p className="text-muted-foreground text-center">
                BuildLink is installed on your device. Open it from your home screen.
              </p>
            </CardContent>
          </Card>
        ) : isIOS ? (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Install on iOS</CardTitle>
              <CardDescription>Follow these steps to install BuildLink</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <p>Tap the <strong>Share</strong> button in Safari (the square with an arrow)</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <p>Scroll down and tap <strong>"Add to Home Screen"</strong></p>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <p>Tap <strong>"Add"</strong> in the top right corner</p>
              </div>
            </CardContent>
          </Card>
        ) : deferredPrompt ? (
          <Card className="mb-8">
            <CardContent className="flex flex-col items-center py-8">
              <Button onClick={handleInstall} size="lg" className="gap-2">
                <Download className="h-5 w-5" />
                Install BuildLink
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                Click to add BuildLink to your home screen
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Install on Android/Desktop</CardTitle>
              <CardDescription>Use your browser menu to install</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <p>Tap the <strong>menu button</strong> (three dots) in your browser</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <p>Tap <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong></p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* What is a PWA? Explainer */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">What is this? Is it an app?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              BuildLink is a <strong className="text-foreground">Progressive Web App (PWA)</strong> — it's a website that can be installed on your phone or computer and used just like a regular app.
            </p>
            <p>
              You won't find it in the App Store or Google Play. Instead, you install it directly from your browser. It still gets updates automatically, works offline, and sits on your home screen like any other app.
            </p>
            <p>
              PWAs are used by companies like Twitter, Starbucks, and Pinterest. They're fast, lightweight, and don't take up much storage.
            </p>
            <p className="pt-1">
              <span className="text-foreground font-medium">Curious to learn more?</span>{' '}
              <a 
                href="https://web.dev/explore/progressive-web-apps" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                web.dev/progressive-web-apps
              </a>
            </p>
          </CardContent>
        </Card>
      </main>
      <MobileNav />
    </div>
  );
}
