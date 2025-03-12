'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Home,
  PieChart,
  GitFork,
  LineChart,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navigationItems = [
  {
    name: 'Home',
    href: '/',
    icon: Home
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    children: [
      {
        name: 'Dashboard',
        href: '/analytics',
        icon: PieChart,
      },
      {
        name: 'Delegation Flow',
        href: '/analytics/delegation-flow',
        icon: GitFork,
        isNew: true
      },
    ]
  }
];

export function MainNavigation() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Hide navigation on the homepage
  const isHomePage = pathname === '/';
  if (isHomePage) {
    return null;
  }

  return (
    <header className="py-4 mb-4 w-full">
      <div className="container flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <GitFork className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl hidden sm:inline-block">AlignedStake</span>
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            
            if (item.children) {
              return (
                <DropdownMenu key={item.name}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={cn(
                        "flex items-center gap-1 px-3 py-2"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {item.children.map((child) => {
                      const isChildActive = pathname === child.href;
                      const ChildIcon = child.icon;
                      
                      return (
                        <DropdownMenuItem key={child.name} asChild>
                          <Link 
                            href={child.href}
                            className={cn(
                              "flex w-full items-center gap-2 px-2 py-1.5",
                              isChildActive && "bg-muted"
                            )}
                          >
                            <ChildIcon className="h-4 w-4" />
                            <span>{child.name}</span>
                            {child.isNew && (
                              <span className="ml-auto text-xs bg-primary text-white px-1.5 py-0.5 rounded-full">
                                New
                              </span>
                            )}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-1 px-3 py-2 rounded-md transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        
        {/* Mobile Navigation Toggle */}
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden container mt-4 py-4 border-t">
          <nav className="flex flex-col space-y-2">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              
              return (
                <div key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                    onClick={() => !item.children && setIsMobileMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                  
                  {item.children && (
                    <div className="pl-6 mt-1 space-y-1">
                      {item.children.map((child) => {
                        const isChildActive = pathname === child.href;
                        const ChildIcon = child.icon;
                        
                        return (
                          <Link
                            key={child.name}
                            href={child.href}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 rounded-md transition-colors",
                              isChildActive
                                ? "bg-muted"
                                : "hover:bg-muted/50 text-muted-foreground"
                            )}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <ChildIcon className="h-4 w-4" />
                            <span>{child.name}</span>
                            {child.isNew && (
                              <span className="ml-auto text-xs bg-primary text-white px-1.5 py-0.5 rounded-full">
                                New
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
} 