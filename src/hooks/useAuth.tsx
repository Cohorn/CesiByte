
// This file re-exports the useAuth hook from AuthContext.tsx
// for backward compatibility with existing imports
import { useAuth, isEmployeeType, isDeveloper, isCommercialAgent } from '@/lib/AuthContext';

export { useAuth, isEmployeeType, isDeveloper, isCommercialAgent };
