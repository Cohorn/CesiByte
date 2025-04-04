import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import NavBar from '@/components/NavBar';
import { Button } from '@/components/ui/button';
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Search, Code, Download, Copy, Check, ExternalLink, PlusCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { StarRating } from '@/components/ui/star-rating';

interface Component {
  id: string;
  name: string;
  description: string;
  category: string;
  code: string;
  preview: React.ReactNode;
}

const componentsList: Component[] = [
  {
    id: 'nav-bar',
    name: 'Navigation Bar',
    description: 'Main navigation component with responsive design',
    category: 'navigation',
    code: `import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const NavBar = () => {
  return (
    <nav className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="font-bold text-xl">AppName</Link>
        <div className="flex items-center space-x-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild variant="default" size="sm">
            <Link to="/register">Register</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;`,
    preview: (
      <div className="bg-white shadow-sm p-4 rounded-md">
        <div className="flex justify-between items-center">
          <span className="font-bold">AppName</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm">Login</Button>
            <Button size="sm">Register</Button>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'card-component',
    name: 'Content Card',
    description: 'Card component for displaying content with title and actions',
    category: 'display',
    code: `import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const ContentCard = ({ title, description, children }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>Save</Button>
      </CardFooter>
    </Card>
  );
};

export default ContentCard;`,
    preview: (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card description and details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-20 flex items-center justify-center text-gray-500">
            Content goes here
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline">Cancel</Button>
          <Button>Save</Button>
        </CardFooter>
      </Card>
    )
  },
  {
    id: 'data-table',
    name: 'Data Table',
    description: 'Responsive table for displaying and managing data',
    category: 'data',
    code: `import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash } from 'lucide-react';

const DataTable = ({ data = [], columns = [] }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => (
              <TableHead key={index}>{column.label}</TableHead>
            ))}
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, i) => (
            <TableRow key={i}>
              {columns.map((column, j) => (
                <TableCell key={j}>{item[column.key]}</TableCell>
              ))}
              <TableCell>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="icon">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default DataTable;`,
    preview: (
      <div className="rounded-md border w-full">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Email</th>
                <th className="p-2 w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="p-2">John Doe</td>
                <td className="p-2">john@example.com</td>
                <td className="p-2">
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="icon"><Code className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon"><Download className="h-3 w-3" /></Button>
                  </div>
                </td>
              </tr>
              <tr className="border-t">
                <td className="p-2">Jane Smith</td>
                <td className="p-2">jane@example.com</td>
                <td className="p-2">
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="icon"><Code className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon"><Download className="h-3 w-3" /></Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  },
  {
    id: 'rating-component',
    name: 'Star Rating',
    description: 'Interactive star rating component for reviews',
    category: 'inputs',
    code: `import React, { useState } from 'react';
import { Star } from 'lucide-react';

const StarRating = ({ initialValue = 0, onChange }) => {
  const [rating, setRating] = useState(initialValue);
  const [hover, setHover] = useState(0);
  
  const handleRatingChange = (value) => {
    setRating(value);
    if (onChange) onChange(value);
  };
  
  return (
    <div className="flex">
      {[...Array(5)].map((_, i) => {
        const ratingValue = i + 1;
        return (
          <button
            key={i}
            type="button"
            className="p-1 focus:outline-none"
            onClick={() => handleRatingChange(ratingValue)}
            onMouseEnter={() => setHover(ratingValue)}
            onMouseLeave={() => setHover(0)}
          >
            <Star 
              size={24} 
              className={
                ratingValue <= (hover || rating) 
                  ? "text-yellow-400" 
                  : "text-gray-300"
              }
              fill={
                ratingValue <= (hover || rating) 
                  ? "currentColor" 
                  : "none"
              }
            />
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;`,
    preview: (
      <div className="py-4">
        <StarRating value={3} onChange={() => {}} />
      </div>
    )
  },
  {
    id: 'loading-skeleton',
    name: 'Loading Skeleton',
    description: 'Placeholder for loading content',
    category: 'feedback',
    code: `import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const LoadingSkeleton = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[160px]" />
        </div>
      </div>
      <Skeleton className="h-[125px] w-full rounded-md" />
    </div>
  );
};

export default LoadingSkeleton;`,
    preview: (
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[160px]" />
          </div>
        </div>
        <Skeleton className="h-[125px] w-full rounded-md" />
      </div>
    )
  }
];

const ComponentLibrary = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [showOnlyRecent, setShowOnlyRecent] = useState(false);
  
  if (!user) {
    return <Navigate to="/employee/login" />;
  } else if (user.user_type !== 'employee') {
    return <Navigate to="/" />;
  }

  const categories = ['all', ...new Set(componentsList.map(comp => comp.category))];
  
  const filteredComponents = componentsList.filter(comp => {
    const matchesSearch = comp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          comp.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || comp.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleDownloadCode = (component: Component) => {
    const blob = new Blob([component.code], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${component.name.toLowerCase().replace(/\s+/g, '-')}.tsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavBar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link to="/employee/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Component Library</h1>
          <p className="text-gray-500">Browse and download reusable components</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle>Components</CardTitle>
                <CardDescription>
                  Browse available components
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search components..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <Badge 
                      key={category}
                      variant={selectedCategory === category ? 'default' : 'outline'}
                      className="cursor-pointer capitalize"
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch id="recent-toggle" checked={showOnlyRecent} onCheckedChange={setShowOnlyRecent} />
                  <label htmlFor="recent-toggle" className="text-sm">Show recently added only</label>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6 px-4">
                <div className="space-y-2">
                  {filteredComponents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No components found.
                    </div>
                  ) : (
                    filteredComponents.map(component => (
                      <Button
                        key={component.id}
                        variant={selectedComponent?.id === component.id ? "default" : "ghost"}
                        className="w-full justify-start text-left h-auto py-3"
                        onClick={() => setSelectedComponent(component)}
                      >
                        <div>
                          <div className="font-medium">{component.name}</div>
                          <div className="text-xs text-gray-500">{component.description}</div>
                        </div>
                      </Button>
                    ))
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end pt-2">
                <Button variant="outline" size="sm" className="w-full">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create New Component
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          <div className="lg:col-span-2">
            {selectedComponent ? (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{selectedComponent.name}</CardTitle>
                      <CardDescription>{selectedComponent.description}</CardDescription>
                      <Badge variant="outline" className="mt-2 capitalize">{selectedComponent.category}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => handleCopyCode(selectedComponent.code)}
                          >
                            {hasCopied ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{hasCopied ? "Copied!" : "Copy code"}</p>
                        </TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => handleDownloadCode(selectedComponent)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Download component</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="preview">
                    <TabsList className="w-full">
                      <TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger>
                      <TabsTrigger value="code" className="flex-1">Code</TabsTrigger>
                    </TabsList>
                    <TabsContent value="preview" className="p-6 border rounded-md mt-4">
                      <div className="flex justify-center items-center">
                        <AspectRatio ratio={16 / 9} className="bg-muted w-full h-full flex items-center justify-center">
                          {selectedComponent.preview}
                        </AspectRatio>
                      </div>
                    </TabsContent>
                    <TabsContent value="code" className="mt-4">
                      <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm max-h-96">
                        {selectedComponent.code}
                      </pre>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 border rounded-md p-8">
                <div className="text-center">
                  <Code className="h-12 w-12 mx-auto text-gray-400" />
                  <p className="mt-2">Select a component to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComponentLibrary;
