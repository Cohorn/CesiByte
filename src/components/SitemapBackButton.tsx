
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SitemapBackButtonProps {
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  showText?: boolean;
}

const SitemapBackButton: React.FC<SitemapBackButtonProps> = ({ 
  className,
  size = "sm",
  variant = "outline",
  showText = true
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Don't render if we're already on the sitemap page
  if (location.pathname === '/employee/sitemap') {
    return null;
  }
  
  return (
    <Button 
      variant={variant} 
      size={size} 
      className={cn("flex items-center", className)} 
      onClick={() => navigate('/employee/sitemap')}
    >
      <MapPin className={cn("h-4 w-4", showText && "mr-1")} />
      {showText && <span>Back to Sitemap</span>}
    </Button>
  );
};

export default SitemapBackButton;
