
import React, { useState, useRef } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth, isDeveloper } from '@/lib/AuthContext';
import NavBar from '@/components/NavBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, Play, Copy, CheckCircle,
  Code, Save, Download, Trash,
  AlertOctagon, Loader2, Database
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/api/client';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type SavedRequest = {
  id: string;
  name: string;
  url: string;
  method: RequestMethod;
  headers: Record<string, string>;
  body: string;
};

// Sample endpoints for different services
const sampleEndpoints = {
  auth: [
    { name: 'Get current user', url: '/auth/me', method: 'GET' },
    { name: 'Login', url: '/auth/login', method: 'POST', body: JSON.stringify({ email: '', password: '' }, null, 2) },
    { name: 'Register', url: '/auth/register', method: 'POST', body: JSON.stringify({ name: '', email: '', password: '', user_type: 'customer' }, null, 2) }
  ],
  orders: [
    { name: 'Get all orders', url: '/orders', method: 'GET' },
    { name: 'Get order by ID', url: '/orders/{id}', method: 'GET' },
    { name: 'Update order status', url: '/orders/{id}/status', method: 'PUT', body: JSON.stringify({ status: 'accepted_by_restaurant' }, null, 2) }
  ],
  restaurants: [
    { name: 'Get all restaurants', url: '/restaurants', method: 'GET' },
    { name: 'Get restaurant by ID', url: '/restaurants/{id}', method: 'GET' },
    { name: 'Update restaurant', url: '/restaurants/{id}', method: 'PUT', body: JSON.stringify({ name: '', address: '', lat: 0, lng: 0 }, null, 2) }
  ],
  users: [
    { name: 'Get all users', url: '/users', method: 'GET' },
    { name: 'Get user by ID', url: '/users/{id}', method: 'GET' },
    { name: 'Get users by type', url: '/users/type/{type}', method: 'GET' }
  ]
};

const ApiPlayground = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [url, setUrl] = useState<string>('/auth/me');
  const [method, setMethod] = useState<RequestMethod>('GET');
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>([
    { key: 'Content-Type', value: 'application/json' }
  ]);
  const [body, setBody] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedService, setSelectedService] = useState<string>('auth');
  const [useAuthToken, setUseAuthToken] = useState<boolean>(true);
  const [savedRequests, setSavedRequests] = useState<SavedRequest[]>([]);
  const [requestName, setRequestName] = useState<string>('');
  const [isBodyValid, setIsBodyValid] = useState<boolean>(true);
  
  const responseRef = useRef<HTMLDivElement>(null);
  
  // Redirect if not logged in
  if (!user) {
    return <Navigate to="/employee/login" />;
  } 
  
  // Redirect non-developer users
  if (!isDeveloper(user)) {
    return <Navigate to="/employee/dashboard" />;
  }

  const validateJson = (jsonString: string): boolean => {
    if (!jsonString.trim()) return true;
    
    try {
      JSON.parse(jsonString);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleBodyChange = (value: string) => {
    setBody(value);
    setIsBodyValid(validateJson(value));
  };

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const updateHeader = (index: number, key: string, value: string) => {
    const newHeaders = [...headers];
    newHeaders[index] = { key, value };
    setHeaders(newHeaders);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const handleSendRequest = async () => {
    if (method !== 'GET' && !isBodyValid) {
      toast({
        title: "Invalid JSON",
        description: "Please provide valid JSON in the request body",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    setResponse('');
    setResponseStatus(null);
    setResponseTime(null);
    
    try {
      // Convert headers array to object for axios
      const headersObj: Record<string, string> = {};
      headers.forEach(h => {
        if (h.key && h.value) {
          headersObj[h.key] = h.value;
        }
      });
      
      // Add auth token if enabled
      if (useAuthToken) {
        const token = localStorage.getItem('auth_token');
        if (token) {
          headersObj['Authorization'] = `Bearer ${token}`;
        }
      }

      // Start timer
      const startTime = performance.now();
      
      // Make the request
      const config = {
        method,
        url,
        headers: headersObj,
        data: method !== 'GET' && body ? JSON.parse(body) : undefined
      };

      const response = await apiClient.request(config);
      
      // Calculate response time
      const endTime = performance.now();
      setResponseTime(Math.round(endTime - startTime));
      
      // Set response data
      setResponseStatus(response.status);
      setResponse(JSON.stringify(response.data, null, 2));
      
      // Scroll to response
      if (responseRef.current) {
        responseRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error: any) {
      console.error('API request failed:', error);
      
      // Calculate response time even for errors
      const endTime = performance.now();
      setResponseTime(Math.round(endTime - startTime));
      
      // Set error response
      setResponseStatus(error.response?.status || 500);
      setResponse(
        JSON.stringify({
          error: true,
          message: error.message,
          response: error.response?.data || 'No response data',
        }, null, 2)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRequest = () => {
    if (!requestName.trim()) {
      toast({
        title: "Request name required",
        description: "Please provide a name for this request",
        variant: "destructive"
      });
      return;
    }
    
    const headersObj: Record<string, string> = {};
    headers.forEach(h => {
      if (h.key && h.value) {
        headersObj[h.key] = h.value;
      }
    });
    
    const newRequest: SavedRequest = {
      id: Date.now().toString(),
      name: requestName,
      url,
      method,
      headers: headersObj,
      body
    };
    
    setSavedRequests([...savedRequests, newRequest]);
    setRequestName('');
    
    toast({
      title: "Request saved",
      description: `Request "${requestName}" has been saved for future use`,
    });
  };

  const loadSavedRequest = (request: SavedRequest) => {
    setUrl(request.url);
    setMethod(request.method);
    
    // Convert headers object back to array format
    const headersArray = Object.entries(request.headers).map(([key, value]) => ({ key, value }));
    setHeaders(headersArray.length ? headersArray : [{ key: '', value: '' }]);
    
    setBody(request.body || '');
    setRequestName(request.name);
  };

  const deleteSavedRequest = (id: string) => {
    setSavedRequests(savedRequests.filter(req => req.id !== id));
    toast({
      title: "Request deleted",
      description: "The saved request has been deleted",
    });
  };

  const handleLoadSample = (endpoint: any) => {
    setUrl(endpoint.url);
    setMethod(endpoint.method);
    if (endpoint.body) {
      setBody(endpoint.body);
    } else {
      setBody('');
    }
  };

  const handleCopyResponse = () => {
    navigator.clipboard.writeText(response);
    toast({
      title: "Copied to clipboard",
      description: "Response data copied to clipboard",
    });
  };

  const handleDownloadResponse = () => {
    const blob = new Blob([response], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `response-${new Date().toISOString()}.json`;
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
          <h1 className="text-2xl font-bold">API Playground</h1>
          <p className="text-gray-500">Test API endpoints and inspect responses</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Sample Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sample Endpoints</CardTitle>
                <CardDescription>
                  Click to load sample requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="auth" value={selectedService} onValueChange={setSelectedService}>
                  <TabsList className="grid grid-cols-2 mb-4">
                    <TabsTrigger value="auth">Auth</TabsTrigger>
                    <TabsTrigger value="orders">Orders</TabsTrigger>
                    <TabsTrigger value="restaurants">Restaurants</TabsTrigger>
                    <TabsTrigger value="users">Users</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="auth" className="space-y-2">
                    {sampleEndpoints.auth.map((endpoint, index) => (
                      <Button 
                        key={index} 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start text-left font-normal p-2 h-auto"
                        onClick={() => handleLoadSample(endpoint)}
                      >
                        <span className={`mr-2 px-1 rounded text-xs ${
                          endpoint.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                          endpoint.method === 'POST' ? 'bg-green-100 text-green-700' :
                          endpoint.method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {endpoint.method}
                        </span>
                        {endpoint.name}
                      </Button>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="orders" className="space-y-2">
                    {sampleEndpoints.orders.map((endpoint, index) => (
                      <Button 
                        key={index} 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start text-left font-normal p-2 h-auto"
                        onClick={() => handleLoadSample(endpoint)}
                      >
                        <span className={`mr-2 px-1 rounded text-xs ${
                          endpoint.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                          endpoint.method === 'POST' ? 'bg-green-100 text-green-700' :
                          endpoint.method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {endpoint.method}
                        </span>
                        {endpoint.name}
                      </Button>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="restaurants" className="space-y-2">
                    {sampleEndpoints.restaurants.map((endpoint, index) => (
                      <Button 
                        key={index} 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start text-left font-normal p-2 h-auto"
                        onClick={() => handleLoadSample(endpoint)}
                      >
                        <span className={`mr-2 px-1 rounded text-xs ${
                          endpoint.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                          endpoint.method === 'POST' ? 'bg-green-100 text-green-700' :
                          endpoint.method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {endpoint.method}
                        </span>
                        {endpoint.name}
                      </Button>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="users" className="space-y-2">
                    {sampleEndpoints.users.map((endpoint, index) => (
                      <Button 
                        key={index} 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start text-left font-normal p-2 h-auto"
                        onClick={() => handleLoadSample(endpoint)}
                      >
                        <span className={`mr-2 px-1 rounded text-xs ${
                          endpoint.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                          endpoint.method === 'POST' ? 'bg-green-100 text-green-700' :
                          endpoint.method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {endpoint.method}
                        </span>
                        {endpoint.name}
                      </Button>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            
            {/* Saved Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Saved Requests</CardTitle>
                <CardDescription>
                  Your saved API requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {savedRequests.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No saved requests yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {savedRequests.map((req) => (
                      <div 
                        key={req.id}
                        className="flex items-center justify-between border rounded-md p-2"
                      >
                        <div className="flex items-center">
                          <span className={`mr-2 px-1 rounded text-xs ${
                            req.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                            req.method === 'POST' ? 'bg-green-100 text-green-700' :
                            req.method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {req.method}
                          </span>
                          <span className="text-sm truncate max-w-[120px]">
                            {req.name}
                          </span>
                        </div>
                        <div className="flex space-x-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => loadSavedRequest(req)}
                          >
                            <Code className="h-3 w-3" />
                            <span className="sr-only">Load</span>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-red-500"
                            onClick={() => deleteSavedRequest(req.id)}
                          >
                            <Trash className="h-3 w-3" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Main content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Request builder */}
            <Card>
              <CardHeader>
                <CardTitle>Request Builder</CardTitle>
                <CardDescription>
                  Configure your API request
                </CardDescription>
                <div className="flex items-center space-x-2 mt-4">
                  <Switch
                    id="use-auth"
                    checked={useAuthToken}
                    onCheckedChange={setUseAuthToken}
                  />
                  <Label htmlFor="use-auth">Include authentication token</Label>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* URL and Method */}
                  <div className="flex flex-col md:flex-row gap-4">
                    <Select
                      value={method}
                      onValueChange={(value) => setMethod(value as RequestMethod)}
                    >
                      <SelectTrigger className="md:w-[150px]">
                        <SelectValue placeholder="Method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input 
                      placeholder="API endpoint URL" 
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="flex-grow"
                    />
                  </div>
                  
                  {/* Headers */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium">Headers</h3>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={addHeader}
                      >
                        Add Header
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {headers.map((header, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <Input
                            placeholder="Header key"
                            value={header.key}
                            onChange={(e) => updateHeader(index, e.target.value, header.value)}
                            className="flex-1"
                          />
                          <Input
                            placeholder="Header value"
                            value={header.value}
                            onChange={(e) => updateHeader(index, header.key, e.target.value)}
                            className="flex-1"
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeHeader(index)}
                            className="text-red-500"
                          >
                            <Trash className="h-4 w-4" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Request Body */}
                  {method !== 'GET' && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Request Body (JSON)</h3>
                      <Textarea
                        placeholder="Enter JSON request body"
                        value={body}
                        onChange={(e) => handleBodyChange(e.target.value)}
                        className={`font-mono h-40 ${!isBodyValid ? 'border-red-500' : ''}`}
                      />
                      {!isBodyValid && (
                        <p className="text-sm text-red-500">Invalid JSON format</p>
                      )}
                    </div>
                  )}
                  
                  {/* Save and Send Actions */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mt-4">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Input
                        placeholder="Save as..."
                        value={requestName}
                        onChange={(e) => setRequestName(e.target.value)}
                        className="w-full sm:w-auto"
                      />
                      <Button 
                        variant="outline"
                        onClick={handleSaveRequest}
                        disabled={!requestName.trim()}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                    </div>
                    
                    <Button 
                      onClick={handleSendRequest}
                      disabled={isLoading}
                      className="w-full sm:w-auto"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Send Request
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Response */}
            <Card ref={responseRef}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Response</CardTitle>
                    <CardDescription>
                      API response details
                    </CardDescription>
                  </div>
                  {response && responseStatus && (
                    <div className="flex items-center space-x-3">
                      {responseTime !== null && (
                        <span className="text-sm text-gray-500">
                          {responseTime}ms
                        </span>
                      )}
                      <Badge
                        variant={responseStatus >= 200 && responseStatus < 300 ? "success" : "destructive"}
                      >
                        {responseStatus}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!response ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <Database className="h-12 w-12 mb-4 opacity-30" />
                    <p>Send a request to see the response</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute top-2 right-2 flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleCopyResponse}
                      >
                        <Copy className="h-4 w-4" />
                        <span className="sr-only">Copy</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleDownloadResponse}
                      >
                        <Download className="h-4 w-4" />
                        <span className="sr-only">Download</span>
                      </Button>
                    </div>
                    <ScrollArea className="h-[400px] w-full rounded-md border p-4 font-mono bg-gray-50">
                      <pre className="text-sm">{response}</pre>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiPlayground;
