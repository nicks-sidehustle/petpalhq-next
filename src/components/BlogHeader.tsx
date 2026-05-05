"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Search, Menu, X } from "lucide-react";
import Image from "next/image";

export type NavigationView = 'home' | 'post' | 'reviews' | 'about' | 'category' | 'search';

interface BlogHeaderProps {
  currentView: NavigationView;
  onNavigate: (view: NavigationView, options?: { category?: string; query?: string }) => void;
  onSearch: (query: string) => void;
}

export function BlogHeader({ currentView, onNavigate, onSearch }: BlogHeaderProps) {
  const [searchValue, setSearchValue] = useState('');
  const [mobileSearchValue, setMobileSearchValue] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      onSearch(searchValue.trim());
      setSearchValue('');
      setMobileMenuOpen(false);
    }
  };

  const handleMobileSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileSearchValue.trim()) {
      onSearch(mobileSearchValue.trim());
      setMobileSearchValue('');
      setMobileMenuOpen(false);
    }
  };

  const handleNavClick = (view: NavigationView) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  const clearSearch = () => {
    setSearchValue('');
  };

  const clearMobileSearch = () => {
    setMobileSearchValue('');
  };

  const navItems = [
    { name: 'Home', view: 'home' as NavigationView },
    { name: 'Reviews', view: 'reviews' as NavigationView },
    { name: 'About', view: 'about' as NavigationView },
  ];

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-4 py-6 w-full">
        <div className="flex items-center justify-between gap-2">
          <button 
            onClick={() => handleNavClick('home')}
            className="flex items-center hover:opacity-80 transition-opacity min-w-0"
            >
            <Image
              src="/logo.png"
              alt="PetPalHQ Logo"
              width={675}
              height={140}
              className="h-[128px] w-auto max-w-full"
              priority
            />
          </button>
          
          <nav className="hidden md:flex items-center space-x-4 lg:space-x-6">
            {navItems.map((item) => (
              <button
                key={item.view}
                onClick={() => handleNavClick(item.view)}
                className={`transition-colors ${
                  currentView === item.view
                    ? 'text-primary font-medium'
                    : 'text-foreground hover:text-primary'
                }`}
              >
                {item.name}
              </button>
            ))}
          </nav>

          <div className="flex items-center space-x-2">
            {/* Desktop Search */}
            <form onSubmit={handleSearch} className="hidden sm:block">
              <div className="flex items-center gap-2 px-3 py-1.5 border rounded-md bg-input-background w-52 focus-within:ring-2 focus-within:ring-ring">
                <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <input 
                  placeholder="Search articles..." 
                  className="flex-1 bg-transparent border-none outline-none text-sm"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                />
                {searchValue && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="h-4 w-4 text-muted-foreground hover:text-foreground flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </form>
            
            {/* Mobile Menu */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="container mx-auto px-4 py-4 space-y-4">
            {/* Mobile Search */}
            <form onSubmit={handleMobileSearch}>
              <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-input-background focus-within:ring-2 focus-within:ring-ring">
                <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <input 
                  placeholder="Search articles..." 
                  className="flex-1 bg-transparent border-none outline-none text-sm"
                  value={mobileSearchValue}
                  onChange={(e) => setMobileSearchValue(e.target.value)}
                />
                {mobileSearchValue && (
                  <button
                    type="button"
                    onClick={clearMobileSearch}
                    className="h-4 w-4 text-muted-foreground hover:text-foreground flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </form>
            
            {/* Mobile Navigation */}
            <nav className="space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.view}
                  onClick={() => handleNavClick(item.view)}
                  className={`w-full text-left p-2 rounded-lg transition-colors ${
                    currentView === item.view
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
