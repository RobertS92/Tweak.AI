
import React from 'react';
import { ThemeProvider } from 'next-themes';
import cn from 'classnames';
import { fontSans } from '@/utils/fonts';
import NavigationBar from '@/components/navigation-bar';
import MobileNavigation from '@/components/mobile-navigation';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Layout({ children }) {
  const isMobile = useIsMobile();

  return (
    <div>
      <body className={cn("min-h-screen bg-background font-sans antialiased", fontSans.variable, {
        'pb-16': isMobile,
        'pb-0': !isMobile
      })}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NavigationBar className="hidden md:block" />
          {children}
          <MobileNavigation className="md:hidden" />
        </ThemeProvider>
      </body>
    </div>
  );
}
