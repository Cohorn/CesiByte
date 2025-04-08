
import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth, isDeveloper } from '@/lib/AuthContext';
import NavBar from '@/components/NavBar';
import { ArrowLeft, Play, Clipboard, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

// API endpoints configuration
const API_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const BASE_ENDPOINTS = [
  { label: 'Auth Service', value: '/auth' },
  { label: 'User Service', value: '/users' },
  { label: 'Restaurant Service', value: '/restaurants' },
  { label: 'Order Service', value: '/orders' },
  { label: 'Review Service', value: '/reviews' },
  { label: 'Employee Service', value: '/employees' },
];

// Response formatting helper
const formatJSON = (json: any) => {
  try {
    return JSON.stringify(json, null, 2);
  } catch (e) {
    return String(json);
  }
};

// Syntax highlighting for JSON
const JsonDisplay = ({ json }: { json: any }) => {
  const formattedJson = formatJSON(json);
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(formattedJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="relative">
      <div className="absolute top-2 right-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={copyToClipboard}
          className="h-8 w-8 p-0"
        >
          {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
        </Button>
      </div>
      <pre className="bg-gray-800 text-white p-4 rounded-md overflow-auto max-h-[500px] text-xs">
        <code>{formattedJson}</code>
      </pre>
    </div>
  );
};

const ApiPlayground = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [method, setMethod] = useState('GET');
  const [baseEndpoint, setBaseEndpoint] = useState('/users');
  const [path, setPath] = useState('');
  const [requestBody, setRequestBody] = useState('');
  const [requestHeaders, setRequestHeaders] = useState('{\n  "Content-Type": "application/json"\n}');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  
  // Example requests for each endpoint
  const [examples, setExamples] = useState<Record<string, any>>({
    '/auth': {
      'POST /auth/login': {
        method: 'POST',
        path: '/login',
        body: {
          email: 'user@example.com',
          password: 'password123'
        }
      },
      'POST /auth/register': {
        method: 'POST',
        path: '/register',
        body: {
          name: 'New User',
          email: 'newuser@example.com',
          password: 'password123',
          address: '123 Main St',
          lat: 40.7128,
          lng: -74.0060,
          user_type: 'customer'
        }
      }
    },
    '/users': {
      'GET /users': {
        method: 'GET',
        path: '',
        body: {}
      },
      'GET /users/{id}': {
        method: 'GET',
        path: '/{USER_ID}',
        body: {}
      },
      'PUT /users/{id}': {
        method: 'PUT',
        path: '/{USER_ID}',
        body: {
          name: 'Updated Name',
          address: 'New Address'
        }
      }
    },
    '/restaurants': {
      'GET /restaurants': {
        method: 'GET',
        path: '',
        body: {}
      },
      'GET /restaurants/nearby': {
        method: 'GET',
        path: '/nearby?lat=40.7128&lng=-74.0060',
        body: {}
      },
      'GET /restaurants/{id}': {
        method: 'GET',
        path: '/{RESTAURANT_ID}',
        body: {}
      }
    },
    '/orders': {
      'GET /orders': {
        method: 'GET',
        path: '',
        body: {}
      },
      'GET /orders/{id}': {
        method: 'GET',
        path: '/{ORDER_ID}',
        body: {}
      },
      'POST /orders': {
        method: 'POST',
        path: '',
        body: {
          restaurant_id: '{RESTAURANT_ID}',
          items: [
            {
              menu_item_id: '{MENU_ITEM_ID}',
              quantity: 2,
              special_instructions: 'Extra sauce'
            }
          ],
          delivery_address: '123 Main St',
          lat: 40.7128,
          lng: -74.0060
        }
      }
    },
    '/reviews': {
      'GET /reviews/restaurant/{id}': {
        method: 'GET',
        path: '/restaurant/{RESTAURANT_ID}',
        body: {}
      },
      'POST /reviews': {
        method: 'POST',
        path: '',
        body: {
          restaurant_id: '{RESTAURANT_ID}',
          rating: 5,
          comment: 'Great food and service!'
        }
      }
    },
    '/employees': {
      'GET /employees': {
        method: 'GET',
        path: '',
        body: {}
      },
      'GET /employees/stats': {
        method: 'GET',
        path: '/stats',
        body: {}
      }
    }
  });
  
  // Function to load an example request
  const loadExample = (exampleKey: string) => {
    const example = examples[baseEndpoint]?.[exampleKey];
    if (example) {
      setMethod(example.method);
      setPath(example.path);
      setRequestBody(JSON.stringify(example.body, null, 2));
    }
  };
  
  // Redirect if not logged in or not a developer
  if (!user) {
    return <Navigate to="/login" />;
  } else if (!isDeveloper(user)) {
    return <Navigate to="/employee/dashboard" />;
  }
  
  // Execute API request
  const executeRequest = async () => {
    setLoading(true);
    setResponse(null);
    setError(null);
    setStatusCode(null);
    setResponseTime(null);
    
    try {
      const url = `${baseEndpoint}${path}`;
      let headers = {};
      try {
        headers = JSON.parse(requestHeaders);
      } catch (e) {
        toast({
          title: "Invalid Headers Format",
          description: "Please check your headers JSON format",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      let data = undefined;
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        try {
          data = requestBody ? JSON.parse(requestBody) : undefined;
        } catch (e) {
          toast({
            title: "Invalid Request Body",
            description: "Please check your request body JSON format",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }
      
      const startTime = performance.now();
      
      const response = await axios({
        method: method.toLowerCase(),
        url,
        data,
        headers
      });
      
      const endTime = performance.now();
      
      setResponse(response.data);
      setStatusCode(response.status);
      setResponseTime(endTime - startTime);
      
      toast({
        title: "Request Successful",
        description: `${method} ${url} completed in ${(endTime - startTime).toFixed(2)}ms`,
        // Fix: Change 'success' to 'default' as it's a valid variant
        variant: "default",
      });
    } catch (err: any) {
      console.error("API request error:", err);
      
      setError(err.message);
      if (err.response) {
        setStatusCode(err.response.status);
        setResponse(err.response.data);
      }
      
      toast({
        title: "Request Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle keyboard shortcut (Ctrl+Enter to execute)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      executeRequest();
    }
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
          <h1 className="text-2xl font-bold">API Playground</h1>
          <p className="text-gray-500">Test API endpoints directly from your browser</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Examples</CardTitle>
                <CardDescription>
                  Select an example to get started
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Select 
                  value={baseEndpoint} 
                  onValueChange={(value) => {
                    setBaseEndpoint(value);
                    setPath('');
                    setRequestBody('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {BASE_ENDPOINTS.map((endpoint) => (
                      <SelectItem key={endpoint.value} value={endpoint.value}>
                        {endpoint.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="mt-4 space-y-2">
                  {examples[baseEndpoint] && Object.keys(examples[baseEndpoint]).map((exampleKey) => (
                    <Button 
                      key={exampleKey}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left"
                      onClick={() => loadExample(exampleKey)}
                    >
                      {exampleKey}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>• Press <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl</kbd> + <kbd className="px-2 py-1 bg-gray-100 rounded">Enter</kbd> to execute request</p>
                <p>• Requests are sent to the internal API</p>
                <p>• Admin privileges are required for some endpoints</p>
                <p>• Response time includes network latency</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Request</CardTitle>
                <CardDescription>
                  Configure your API request
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger className="w-28">
                      <SelectValue placeholder="Method" />
                    </SelectTrigger>
                    <SelectContent>
                      {API_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="flex-1 flex">
                    <div className="bg-gray-100 border border-r-0 border-gray-300 rounded-l-md px-2 flex items-center text-gray-500 text-sm">
                      {baseEndpoint}
                    </div>
                    <Input
                      value={path}
                      onChange={(e) => setPath(e.target.value)}
                      placeholder="Path"
                      className="rounded-l-none flex-1"
                    />
                  </div>
                </div>
                
                <Tabs defaultValue="body" className="w-full">
                  <TabsList>
                    <TabsTrigger value="body">Body</TabsTrigger>
                    <TabsTrigger value="headers">Headers</TabsTrigger>
                  </TabsList>
                  <TabsContent value="body">
                    <Textarea
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                      placeholder="Request body (JSON)"
                      className="font-mono text-sm h-48"
                      onKeyDown={handleKeyDown}
                      disabled={['GET', 'DELETE'].includes(method)}
                    />
                    {['GET', 'DELETE'].includes(method) && (
                      <p className="text-xs text-gray-500 mt-2">
                        Body is not typically used with {method} requests.
                      </p>
                    )}
                  </TabsContent>
                  <TabsContent value="headers">
                    <Textarea
                      value={requestHeaders}
                      onChange={(e) => setRequestHeaders(e.target.value)}
                      placeholder="Request headers (JSON)"
                      className="font-mono text-sm h-48"
                      onKeyDown={handleKeyDown}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="text-sm text-gray-500">
                  Press Ctrl+Enter to execute
                </div>
                <Button 
                  onClick={executeRequest} 
                  disabled={loading}
                  className="flex items-center"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <span className="animate-spin h-4 w-4 mr-2 border-2 border-t-transparent rounded-full"></span>
                      Executing...
                    </span>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Execute
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
            
            {(response || error) && (
              <Card>
                <CardHeader className="flex flex-row items-center">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      Response
                      {statusCode && (
                        <span 
                          className={`text-sm px-2 py-1 rounded-full ${
                            statusCode >= 200 && statusCode < 300 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {statusCode}
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {responseTime && `Completed in ${responseTime.toFixed(2)}ms`}
                    </CardDescription>
                  </div>
                  {error && (
                    <div className="flex items-center text-red-600">
                      <X className="mr-1 h-4 w-4" />
                      Error
                    </div>
                  )}
                  {response && !error && statusCode && statusCode >= 200 && statusCode < 300 && (
                    <div className="flex items-center text-green-600">
                      <Check className="mr-1 h-4 w-4" />
                      {/* Fix: Change 'success' to 'default' as it's a valid variant */}
                      <span className="text-sm">Success</span>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {error && !response && (
                    <div className="text-red-600 mb-4">
                      {error}
                    </div>
                  )}
                  {response && (
                    <JsonDisplay json={response} />
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiPlayground;
