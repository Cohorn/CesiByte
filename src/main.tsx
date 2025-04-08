
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { AuthProvider } from '@/lib/AuthContext'
import { ThemeProvider } from "next-themes"
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Initialize the query client with more conservative settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false, // Disable refetching on window focus for stability
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider attribute="class" defaultTheme="light">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
