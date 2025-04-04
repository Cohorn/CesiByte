
// Export the configured Supabase client from the integrations directory
import { supabase as supabaseClient } from '@/integrations/supabase/client';

// Export the client to be used throughout the application
export const supabase = supabaseClient;
