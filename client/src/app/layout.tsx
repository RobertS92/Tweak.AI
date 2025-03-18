import React from 'react';
import { ThemeProvider } from 'next-themes';
import cn from 'classnames';
import { fontSans } from '@/utils/fonts';


// This is a placeholder,  replace with your actual NavigationBar component
const NavigationBar = () => <nav>This is the Navigation Bar</nav>;


// New MobileNavigation component
const MobileNavigation = () => {
  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white shadow-lg">
      {/* Add your mobile navigation icons here */}
      <div className="flex justify-around p-4">
        <a href="#">Home</a>
        <a href="#">About</a>
        <a href="#">Contact</a>
      </div>
    </nav>
  );
};

function Layout({ children }) {
  return (
    <div>
      <body className={cn("min-h-screen bg-background font-sans antialiased pb-16 md:pb-0", fontSans.variable)}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NavigationBar />
          {children}
          <MobileNavigation />
        </ThemeProvider>
      </body>
    </div>
  );
}

export default Layout;