
import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AlertCircle, Check, Clock, Code, Copy, Play, RefreshCw, Save, Terminal, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { apiClient } from '@/api/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// Define the form schema for API requests
const requestFormSchema = z.object({
  url: z.string().min(1, 'URL is required'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  headers: z.string().optional(),
  body: z.string().optional(),
});

type RequestForm = z.infer<typeof requestFormSchema>;

// Define the saved request schema
interface SavedRequest {
  id: string;
  name: string;
  url: string;
  method: string;
  headers: string;
  body: string;
}

// Define API endpoint categories
const endpointCategories = [
  {
    name: 'Users',
    endpoints: [
      { name: 'Get All Users', url: '/users', method: 'GET' },
      { name: 'Get User by ID', url: '/users/{id}', method: 'GET' },
      { name: 'Create User', url: '/users', method: 'POST' },
      { name: 'Update User', url: '/users/{id}', method: 'PUT' },
      { name: 'Delete User', url: '/users/{id}', method: 'DELETE' },
    ],
  },
  {
    name: 'Restaurants',
    endpoints: [
      { name: 'Get All Restaurants', url: '/restaurants', method: 'GET' },
      { name: 'Get Restaurant by ID', url: '/restaurants/{id}', method: 'GET' },
      { name: 'Create Restaurant', url: '/restaurants', method: 'POST' },
      { name: 'Update Restaurant', url: '/restaurants/{id}', method: 'PUT' },
      { name: 'Delete Restaurant', url: '/restaurants/{id}', method: 'DELETE' },
    ],
  },
  {
    name: 'Orders',
    endpoints: [
      { name: 'Get All Orders', url: '/orders', method: 'GET' },
      { name: 'Get Order by ID', url: '/orders/{id}', method: 'GET' },
      { name: 'Get Orders by User', url: '/orders/user/{id}', method: 'GET' },
      { name: 'Get Orders by Restaurant', url: '/orders/restaurant/{id}', method: 'GET' },
      { name: 'Get Orders by Status', url: '/orders/status/{status}', method: 'GET' },
      { name: 'Create Order', url: '/orders', method: 'POST' },
      { name: 'Update Order Status', url: '/orders/{id}/status', method: 'PUT' },
      { name: 'Delete Order', url: '/orders/{id}', method: 'DELETE' },
    ],
  },
  {
    name: 'Reviews',
    endpoints: [
      { name: 'Get Reviews for Restaurant', url: '/reviews/restaurant/{id}', method: 'GET' },
      { name: 'Get Reviews for Courier', url: '/reviews/courier/{id}', method: 'GET' },
      { name: 'Create Review', url: '/reviews', method: 'POST' },
      { name: 'Update Review', url: '/reviews/{id}', method: 'PUT' },
      { name: 'Delete Review', url: '/reviews/{id}', method: 'DELETE' },
    ],
  },
];

const ApiPlayground: React.FC = () => {
  const [responseData, setResponseData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [savedRequests, setSavedRequests] = useState<SavedRequest[]>([]);
  const [activeTab, setActiveTab] = useState('request');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [requestName, setRequestName] = useState('');
  const responseRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Set up the form
  const form = useForm<RequestForm>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      url: '',
      method: 'GET',
      headers: '{\n  "Content-Type": "application/json"\n}',
      body: '',
    },
  });

  // Load saved requests from local storage
  useEffect(() => {
    const savedRequestsJSON = localStorage.getItem('savedApiRequests');
    if (savedRequestsJSON) {
      try {
        const parsed = JSON.parse(savedRequestsJSON);
        setSavedRequests(parsed);
      } catch (e) {
        console.error('Error parsing saved requests:', e);
      }
    }
  }, []);

  const saveRequests = (requests: SavedRequest[]) => {
    localStorage.setItem('savedApiRequests', JSON.stringify(requests));
    setSavedRequests(requests);
  };

  const onSubmit = async (data: RequestForm) => {
    setIsLoading(true);
    setError(null);
    setResponseData(null);
    setResponseTime(null);
    
    const startTime = performance.now();
    
    try {
      let headers = {};
      if (data.headers) {
        try {
          headers = JSON.parse(data.headers);
        } catch (e) {
          setError('Invalid JSON in headers');
          setIsLoading(false);
          return;
        }
      }
      
      let parsedBody;
      if (data.body && ['POST', 'PUT', 'PATCH'].includes(data.method)) {
        try {
          parsedBody = JSON.parse(data.body);
        } catch (e) {
          setError('Invalid JSON in request body');
          setIsLoading(false);
          return;
        }
      }

      const response = await apiClient({
        method: data.method.toLowerCase(),
        url: data.url,
        headers,
        data: parsedBody,
      });
      
      const endTime = performance.now();
      setResponseTime(endTime - startTime);
      setResponseData(response);
      setActiveTab('response');
    } catch (error: any) {
      const endTime = performance.now();
      setResponseTime(endTime - startTime);
      
      console.error('API request error:', error);
      setError(error.message || 'An error occurred');
      setResponseData(error.response || null);
    } finally {
      setIsLoading(false);
      // Scroll to response section
      if (responseRef.current) {
        responseRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleSaveRequest = () => {
    if (!requestName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a name for this request',
        variant: 'destructive',
      });
      return;
    }
    
    const newRequest: SavedRequest = {
      id: crypto.randomUUID(),
      name: requestName,
      url: form.getValues('url'),
      method: form.getValues('method'),
      headers: form.getValues('headers') || '',
      body: form.getValues('body') || '',
    };
    
    const updatedRequests = [...savedRequests, newRequest];
    saveRequests(updatedRequests);
    
    setShowSaveDialog(false);
    setRequestName('');
    
    toast({
      title: 'Success',
      description: 'Request saved successfully',
    });
  };

  const handleLoadRequest = (request: SavedRequest) => {
    form.reset({
      url: request.url,
      method: request.method as any,
      headers: request.headers,
      body: request.body,
    });
    
    toast({
      title: 'Request loaded',
      description: `Loaded "${request.name}"`,
    });
  };

  const handleDeleteRequest = (id: string) => {
    const updatedRequests = savedRequests.filter((req) => req.id !== id);
    saveRequests(updatedRequests);
    
    toast({
      title: 'Request deleted',
      description: 'The saved request has been deleted',
    });
  };

  const handleSelectEndpoint = (url: string, method: string) => {
    // Replace placeholders with empty values for user to fill in
    const processedUrl = url.replace(/{([^}]+)}/g, '');
    
    form.reset({
      url: processedUrl,
      method: method as any,
      headers: form.getValues('headers'),
      body: method === 'GET' ? '' : form.getValues('body') || '{\n  \n}',
    });
  };

  const formatJSON = (json: any) => {
    try {
      if (typeof json === 'string') {
        return JSON.stringify(JSON.parse(json), null, 2);
      }
      return JSON.stringify(json, null, 2);
    } catch (e) {
      return json;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast({
          title: 'Copied!',
          description: 'Content copied to clipboard',
        });
      },
      () => {
        toast({
          title: 'Failed to copy',
          description: 'Could not copy to clipboard',
          variant: 'destructive',
        });
      }
    );
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">API Playground</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>API Endpoints</CardTitle>
              <CardDescription>Select from common endpoints</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <Accordion type="multiple" className="w-full">
                  {endpointCategories.map((category) => (
                    <AccordionItem key={category.name} value={category.name}>
                      <AccordionTrigger>{category.name}</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          {category.endpoints.map((endpoint) => (
                            <div 
                              key={endpoint.name}
                              className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 cursor-pointer"
                              onClick={() => handleSelectEndpoint(endpoint.url, endpoint.method)}
                            >
                              <div>
                                <p className="text-sm font-medium">{endpoint.name}</p>
                                <p className="text-xs text-gray-500">{endpoint.url}</p>
                              </div>
                              <Badge variant={endpoint.method === 'GET' ? 'secondary' : 
                                endpoint.method === 'POST' ? 'success' : 
                                endpoint.method === 'PUT' ? 'outline' : 
                                endpoint.method === 'DELETE' ? 'destructive' : 'default'}>
                                {endpoint.method}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Request</CardTitle>
                  <CardDescription>Configure your API request</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowSaveDialog(true)} disabled={isLoading}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="flex gap-2">
                    <FormField
                      control={form.control}
                      name="method"
                      render={({ field }) => (
                        <FormItem className="w-32">
                          <FormLabel>Method</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={isLoading}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="GET">GET</SelectItem>
                              <SelectItem value="POST">POST</SelectItem>
                              <SelectItem value="PUT">PUT</SelectItem>
                              <SelectItem value="DELETE">DELETE</SelectItem>
                              <SelectItem value="PATCH">PATCH</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="url"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>URL</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="API endpoint path (e.g., /users)"
                              {...field}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="headers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Headers (JSON)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter request headers as JSON"
                            className="font-mono text-sm h-24"
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter request headers in JSON format
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {form.watch('method') !== 'GET' && (
                    <FormField
                      control={form.control}
                      name="body"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Request Body (JSON)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter request body as JSON"
                              className="font-mono text-sm h-40"
                              {...field}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormDescription>
                            Enter request body in JSON format
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => form.reset()}
                      disabled={isLoading}
                    >
                      Reset
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
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
                </form>
              </Form>
            </CardContent>
          </Card>
          
          {/* Saved Requests */}
          {savedRequests.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Saved Requests</CardTitle>
                <CardDescription>Your saved API requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {savedRequests.map((request) => (
                    <div 
                      key={request.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant={request.method === 'GET' ? 'secondary' : 
                          request.method === 'POST' ? 'success' : 
                          request.method === 'PUT' ? 'outline' : 
                          request.method === 'DELETE' ? 'destructive' : 'default'}>
                          {request.method}
                        </Badge>
                        <div>
                          <p className="font-medium">{request.name}</p>
                          <p className="text-xs text-gray-500">{request.url}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleLoadRequest(request)}
                        >
                          <Clock className="h-4 w-4" />
                          <span className="sr-only">Load</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteRequest(request.id)}
                        >
                          <X className="h-4 w-4 text-red-500" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Response Section */}
      <div ref={responseRef}>
        {(responseData || error) && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Response</CardTitle>
                  {responseTime !== null && (
                    <CardDescription>
                      Completed in {responseTime.toFixed(0)}ms
                    </CardDescription>
                  )}
                </div>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[400px]">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="response">Response</TabsTrigger>
                    <TabsTrigger value="headers">Headers</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {error && !responseData && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {responseData && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={
                      responseData.status < 300 ? 'success' : 
                      responseData.status < 400 ? 'secondary' : 
                      'destructive'
                    }>
                      Status: {responseData.status}
                    </Badge>
                    <Badge variant="outline">
                      {responseData.statusText}
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(
                        activeTab === 'response' 
                          ? JSON.stringify(responseData.data, null, 2)
                          : JSON.stringify(responseData.headers, null, 2)
                      )}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                  
                  <TabsContent value="response" className="mt-0">
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto">
                      <pre className="text-sm font-mono">
                        {formatJSON(responseData.data)}
                      </pre>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="headers" className="mt-0">
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto">
                      <pre className="text-sm font-mono">
                        {formatJSON(responseData.headers)}
                      </pre>
                    </div>
                  </TabsContent>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Save Request Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-[400px]">
            <CardHeader>
              <CardTitle>Save Request</CardTitle>
              <CardDescription>Enter a name for this request</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <FormLabel>Request Name</FormLabel>
                  <Input 
                    placeholder="My API Request"
                    value={requestName}
                    onChange={(e) => setRequestName(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowSaveDialog(false);
                      setRequestName('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveRequest}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ApiPlayground;
