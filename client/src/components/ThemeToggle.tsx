import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="relative w-10 h-10 p-0 rounded-full bg-gradient-to-br from-yellow-400 via-orange-400 to-red-400 dark:from-blue-900 dark:via-purple-900 dark:to-indigo-900 hover:scale-110 transition-all duration-500 shadow-lg dark:shadow-blue-900/30 shadow-orange-400/30 border-2 border-yellow-300 dark:border-blue-700"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {/* Background overlay for smooth color transition */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 opacity-0 dark:opacity-100 transition-opacity duration-500" />
      
      {/* Sun Icon */}
      <Sun 
        className={`absolute h-5 w-5 text-white transform transition-all duration-500 ${
          theme === 'light' 
            ? 'rotate-0 scale-100 opacity-100' 
            : 'rotate-90 scale-0 opacity-0'
        }`}
        style={{
          filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.7))'
        }}
      />
      
      {/* Moon Icon */}
      <Moon 
        className={`absolute h-4 w-4 text-blue-100 transform transition-all duration-500 ${
          theme === 'dark' 
            ? 'rotate-0 scale-100 opacity-100' 
            : '-rotate-90 scale-0 opacity-0'
        }`}
        style={{
          filter: 'drop-shadow(0 0 6px rgba(147, 197, 253, 0.8))'
        }}
      />
      
      {/* Animated particles/stars effect */}
      <div className={`absolute inset-0 rounded-full transition-opacity duration-500 ${theme === 'dark' ? 'opacity-100' : 'opacity-0'}`}>
        {/* Small twinkling stars */}
        <div className="absolute top-1 right-2 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
        <div className="absolute top-2 left-1 w-0.5 h-0.5 bg-blue-200 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-1 left-2 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-2 right-1 w-0.5 h-0.5 bg-blue-200 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>
      
      {/* Sun rays effect */}
      <div className={`absolute inset-0 rounded-full transition-opacity duration-500 ${theme === 'light' ? 'opacity-100' : 'opacity-0'}`}>
        {/* Rotating sun rays */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '8s' }}>
          <div className="absolute top-0 left-1/2 w-0.5 h-2 bg-yellow-200 rounded-full transform -translate-x-1/2 -translate-y-1" />
          <div className="absolute bottom-0 left-1/2 w-0.5 h-2 bg-yellow-200 rounded-full transform -translate-x-1/2 translate-y-1" />
          <div className="absolute left-0 top-1/2 w-2 h-0.5 bg-yellow-200 rounded-full transform -translate-y-1/2 -translate-x-1" />
          <div className="absolute right-0 top-1/2 w-2 h-0.5 bg-yellow-200 rounded-full transform -translate-y-1/2 translate-x-1" />
        </div>
      </div>
      
      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-300/20 to-orange-300/20 dark:from-blue-400/20 dark:to-purple-400/20 opacity-0 hover:opacity-100 transition-opacity duration-300" />
    </Button>
  );
}
