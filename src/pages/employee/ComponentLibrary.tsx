
import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth, isDeveloper } from '@/lib/AuthContext';
import NavBar from '@/components/NavBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  ArrowLeft, Search, Code, Copy, 
  ExternalLink, Check, Layers, Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Sample component data
const components = [
  { 
    name: 'Button', 
    description: 'Interactive button element with multiple variants', 
    category: 'Form',
    code: `import { Button } from '@/components/ui/button';

<Button variant="default">Default</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>`
  },
  { 
    name: 'Card', 
    description: 'Container for related information', 
    category: 'Layout',
    code: `import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card Description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card Content</p>
  </CardContent>
  <CardFooter>
    <p>Card Footer</p>
  </CardFooter>
</Card>`
  },
  { 
    name: 'Input', 
    description: 'Text input field for forms', 
    category: 'Form',
    code: `import { Input } from '@/components/ui/input';

<Input type="text" placeholder="Type here..." />`
  },
  { 
    name: 'Badge', 
    description: 'Small status descriptor', 
    category: 'Display',
    code: `import { Badge } from '@/components/ui/badge';

<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="destructive">Destructive</Badge>`
  },
  { 
    name: 'Alert', 
    description: 'Displays important information', 
    category: 'Feedback',
    code: `import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

<Alert>
  <Info className="h-4 w-4" />
  <AlertTitle>Information</AlertTitle>
  <AlertDescription>
    This is an informational alert.
  </AlertDescription>
</Alert>`
  },
  { 
    name: 'Tabs', 
    description: 'Switch between different content views', 
    category: 'Navigation',
    code: `import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

<Tabs defaultValue="account">
  <TabsList>
    <TabsTrigger value="account">Account</TabsTrigger>
    <TabsTrigger value="password">Password</TabsTrigger>
  </TabsList>
  <TabsContent value="account">Account content</TabsContent>
  <TabsContent value="password">Password content</TabsContent>
</Tabs>`
  }
];

const ComponentLibrary = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [copiedComponent, setCopiedComponent] = useState<string | null>(null);
  
  // Redirect if not logged in
  if (!user) {
    return <Navigate to="/employee/login" />;
  } 
  
  // Redirect non-developer users
  if (!isDeveloper(user)) {
    return <Navigate to="/employee/dashboard" />;
  }

  // Get unique categories
  const categories = ['all', ...new Set(components.map(comp => comp.category))];

  // Filter components based on search and category
  const filteredComponents = components.filter(component => {
    const matchesSearch = 
      component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      component.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || component.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleCopyCode = (code: string, name: string) => {
    navigator.clipboard.writeText(code);
    setCopiedComponent(name);
    toast({
      title: "Code Copied",
      description: `${name} component code copied to clipboard`,
    });
    
    // Reset the copied state after 2 seconds
    setTimeout(() => {
      setCopiedComponent(null);
    }, 2000);
  };

  const handleDownloadLibrary = () => {
    // In a real application, this would generate and download a package
    // with the selected components
    toast({
      title: "Feature in Progress",
      description: "Component library download functionality is being developed",
    });
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-2xl font-bold">Component Library</h1>
              <p className="text-gray-500">Browse and use UI components for your projects</p>
            </div>
            <Button 
              onClick={handleDownloadLibrary}
              className="mt-4 md:mt-0"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Library
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                <div>
                  <CardTitle>UI Components</CardTitle>
                  <CardDescription>
                    Reusable components built with Tailwind CSS and React
                  </CardDescription>
                </div>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search components..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" value={selectedCategory} onValueChange={setSelectedCategory}>
                <TabsList className="mb-6">
                  {categories.map(category => (
                    <TabsTrigger 
                      key={category} 
                      value={category}
                      className="capitalize"
                    >
                      {category}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {filteredComponents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No components found matching your search.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {filteredComponents.map((component, index) => (
                      <div key={component.name} className="border rounded-lg overflow-hidden">
                        <div className="flex justify-between items-center bg-gray-50 p-4 border-b">
                          <div>
                            <h3 className="text-lg font-medium">{component.name}</h3>
                            <p className="text-sm text-gray-500">{component.description}</p>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {component.category}
                          </Badge>
                        </div>
                        <div className="p-4 bg-gray-950 relative">
                          <Button 
                            variant="outline" 
                            size="icon"
                            className="absolute top-2 right-2 bg-gray-900 hover:bg-gray-800 border-gray-700"
                            onClick={() => handleCopyCode(component.code, component.name)}
                          >
                            {copiedComponent === component.name ? (
                              <Check className="h-4 w-4 text-green-400" />
                            ) : (
                              <Copy className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                          <pre className="text-gray-300 text-sm overflow-x-auto p-2">
                            <code>{component.code}</code>
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Tabs>
              
              <Separator className="my-8" />
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <h3 className="text-lg font-medium text-blue-800 flex items-center">
                  <Layers className="h-5 w-5 mr-2" />
                  Build Custom Components
                </h3>
                <p className="text-blue-700 mt-2">
                  Need custom components for your project? Use the API playground to test functionality
                  and implement custom components based on these building blocks.
                </p>
                <div className="mt-4">
                  <Button variant="outline" asChild>
                    <Link to="/employee/api-playground">
                      <Code className="h-4 w-4 mr-2" />
                      Go to API Playground
                    </Link>
                  </Button>
                  <Button variant="link" asChild className="ml-2">
                    <a href="https://ui.shadcn.com" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      shadcn/ui Documentation
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ComponentLibrary;
