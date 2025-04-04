import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import NavBar from '@/components/NavBar';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Play, Download, Copy, Check, RefreshCw, Key, Eye, EyeOff, Layers, Save
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/api/client';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const ApiPlayground = () => {
  const { user } = useAuth();
  const [method, setMethod] = useState('GET');
  const [endpoint, setEndpoint] = useState('/health');
  const [requestBody, setRequestBody] = useState('');
  const [response, setResponse] = useState<string>('');
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [showDevKey, setShowDevKey] = useState(false);
  const [savedRequests, setSavedRequests] = useState<Array<{name: string, method: string, endpoint: string, body: string}>>([]);
  const [requestName, setRequestName] = useState('');
  const [autoFormat, setAutoFormat] = useState(true);
  const [headers, setHeaders] = useState('{\n  "Content-Type": "application/json"\n}');
  
  // Mock developer key - in a real app, this would come from an API or environment variable
  const devSecurityKey = "dev_sk_" + Math.random().toString(36).substring(2, 15);
  
  // Redirect if not logged in or not an employee
  if (!user) {
    return <Navigate to="/employee/login" />;
  } else if (user.user_type !== 'employee') {
    return <Navigate to="/" />;
  }

  useEffect(() => {
    // Load saved requests from localStorage
    const loadedRequests = localStorage.getItem('saved_api_requests');
    if (loadedRequests) {
      try {
        setSavedRequests(JSON.parse(loadedRequests));
      } catch (e) {
        console.error("Failed to load saved requests", e);
      }
    }
  }, []);

  const saveRequest = () => {
    if (!requestName) return;
    
    const newRequest = {
      name: requestName,
      method,
      endpoint,
      body: requestBody
    };
    
    const updatedRequests = [...savedRequests, newRequest];
    setSavedRequests(updatedRequests);
    localStorage.setItem('saved_api_requests', JSON.stringify(updatedRequests));
    setRequestName('');
  };

  const loadRequest = (request: {name: string, method: string, endpoint: string, body: string}) => {
    setMethod(request.method);
    setEndpoint(request.endpoint);
    setRequestBody(request.body);
  };

  const handleSendRequest = async () => {
    setIsLoading(true);
    setResponse('');
    setResponseStatus(null);
    
    try {
      let headersObj = {};
      try {
        headersObj = JSON.parse(headers);
      } catch (e) {
        console.error("Invalid headers JSON", e);
        headersObj = { 'Content-Type': 'application/json' };
      }
      
      let result;
      let requestOptions = {
        headers: headersObj
      };
      
      switch (method) {
        case 'GET':
          result = await apiClient.get(endpoint, requestOptions);
          break;
        case 'POST':
          result = await apiClient.post(endpoint, 
            requestBody ? JSON.parse(requestBody) : {}, 
            requestOptions
          );
          break;
        case 'PUT':
          result = await apiClient.put(endpoint, 
            requestBody ? JSON.parse(requestBody) : {}, 
            requestOptions
          );
          break;
        case 'DELETE':
          result = await apiClient.delete(endpoint, requestOptions);
          break;
        default:
          throw new Error('Unsupported method');
      }
      
      setResponseStatus(result.status);
      setResponse(autoFormat ? JSON.stringify(result.data, null, 2) : JSON.stringify(result.data));
    } catch (error: any) {
      console.error('API request error:', error);
      
      // Format error response
      let errorResponse = {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      };
      
      setResponseStatus(error.response?.status || 500);
      setResponse(autoFormat ? JSON.stringify(errorResponse, null, 2) : JSON.stringify(errorResponse));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyResponse = () => {
    navigator.clipboard.writeText(response);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleDownloadResponse = () => {
    const blob = new Blob([response], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-response-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(requestBody);
      setRequestBody(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.error("Invalid JSON", e);
    }
  };

  // Sample API endpoints
  const endpointSuggestions = {
    'Auth Service': ['/auth/me', '/auth/ping', '/auth/health'],
    'User Service': ['/users/type/customer', '/users/type/restaurant', '/users/type/courier'],
    'Restaurant Service': ['/restaurants', '/restaurants/nearby'],
    'Order Service': ['/orders/status/created', '/orders/status/delivered']
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
          <div className="flex flex-wrap justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">API Playground</h1>
              <p className="text-gray-500">Test API endpoints directly</p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center">
              <div className="flex items-center mr-4">
                <Badge variant="outline" className="text-xs font-mono flex items-center gap-2">
                  <Key className="h-3 w-3" />
                  Dev Key: 
                  <span className="ml-1">
                    {showDevKey ? devSecurityKey : "•".repeat(15)}
                  </span>
                  <button 
                    onClick={() => setShowDevKey(!showDevKey)}
                    className="ml-1 focus:outline-none"
                  >
                    {showDevKey ? (
                      <EyeOff className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                  </button>
                </Badge>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(devSecurityKey);
                  setHasCopied(true);
                  setTimeout(() => setHasCopied(false), 2000);
                }}
              >
                {hasCopied ? "Copied!" : "Copy Key"}
              </Button>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>API Endpoints</CardTitle>
                <CardDescription>
                  Select from common endpoints
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(endpointSuggestions).map(([category, endpoints]) => (
                    <div key={category} className="space-y-2">
                      <h3 className="font-medium text-sm">{category}</h3>
                      <div className="space-y-1">
                        {endpoints.map(ep => (
                          <Button 
                            key={ep} 
                            variant="ghost" 
                            size="sm" 
                            className="w-full justify-start text-left" 
                            onClick={() => setEndpoint(ep)}
                          >
                            {ep}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Saved Requests</CardTitle>
                <CardDescription>
                  Load or save API requests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Input 
                    placeholder="Request name"
                    value={requestName}
                    onChange={(e) => setRequestName(e.target.value)}
                  />
                  <Button onClick={saveRequest} disabled={!requestName}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
                
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {savedRequests.length === 0 ? (
                    <p className="text-sm text-gray-500">No saved requests</p>
                  ) : (
                    savedRequests.map((request, idx) => (
                      <Button 
                        key={idx}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-left"
                        onClick={() => loadRequest(request)}
                      >
                        <div>
                          <span className="font-medium">{request.name}</span>
                          <span className="ml-2 text-xs text-gray-500">{request.method} {request.endpoint}</span>
                        </div>
                      </Button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Request</CardTitle>
                <CardDescription>
                  Configure and send API requests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-4">
                  <div className="w-1/3">
                    <Select value={method} onValueChange={setMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-2/3">
                    <Textarea 
                      value={endpoint} 
                      onChange={(e) => setEndpoint(e.target.value)}
                      placeholder="/api/endpoint"
                      className="resize-none h-10 py-2"
                    />
                  </div>
                </div>
                
                <Tabs defaultValue="body" className="w-full">
                  <TabsList className="w-full">
                    <TabsTrigger value="body" className="flex-1">Body</TabsTrigger>
                    <TabsTrigger value="headers" className="flex-1">Headers</TabsTrigger>
                    <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
                  </TabsList>
                  <TabsContent value="body" className="pt-4">
                    <div className="relative">
                      <Textarea
                        value={requestBody}
                        onChange={(e) => setRequestBody(e.target.value)}
                        placeholder={`{\n  "key": "value"\n}`}
                        className="font-mono h-40 resize-none"
                      />
                      <div className="absolute right-2 top-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={formatJson}>
                              <Layers className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Format JSON</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="headers" className="pt-4">
                    <Textarea
                      value={headers}
                      onChange={(e) => setHeaders(e.target.value)}
                      placeholder={`{\n  "Content-Type": "application/json"\n}`}
                      className="font-mono h-40 resize-none"
                    />
                  </TabsContent>
                  <TabsContent value="settings" className="pt-4">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="format-json" 
                          checked={autoFormat} 
                          onCheckedChange={setAutoFormat}
                        />
                        <label htmlFor="format-json" className="text-sm">
                          Auto-format JSON responses
                        </label>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
                
                <div className="flex justify-end">
                  <Button onClick={handleSendRequest} disabled={isLoading}>
                    <Play className="h-4 w-4 mr-2" />
                    {isLoading ? 'Sending...' : 'Send Request'}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <div className="flex items-center gap-3">
                    <CardTitle>Response</CardTitle>
                    {responseStatus !== null && (
                      <Badge 
                        variant={responseStatus >= 200 && responseStatus < 300 ? "default" : "destructive"}
                        className="text-xs font-mono"
                      >
                        {responseStatus}
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    API response data
                  </CardDescription>
                </div>
                {response && (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={handleCopyResponse}
                    >
                      {hasCopied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={handleDownloadResponse}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleSendRequest}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded-md overflow-auto h-80 text-sm font-mono">
                  {response || 'No response yet. Click "Send Request" to test an endpoint.'}
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiPlayground;
