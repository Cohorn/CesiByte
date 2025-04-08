
import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { User } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';
import { 
  Form, FormControl, FormField, FormItem, 
  FormLabel, FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

const profileSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Must be a valid email address.' }),
  address: z.string().min(2, { message: 'Address must be at least 2 characters.' }),
  lat: z.number().or(z.string().transform((val) => parseFloat(val)))
    .refine((val) => !isNaN(val) && val >= -90 && val <= 90, {
      message: 'Latitude must be between -90 and 90.',
    }),
  lng: z.number().or(z.string().transform((val) => parseFloat(val)))
    .refine((val) => !isNaN(val) && val >= -180 && val <= 180, {
      message: 'Longitude must be between -180 and 180.',
    }),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface EditProfileFormProps {
  user: User;
  onSubmit?: (data: ProfileFormData) => Promise<void>;
  isLoading?: boolean;
}

const EditProfileForm: React.FC<EditProfileFormProps> = ({ 
  user, 
  onSubmit = async () => {},
  isLoading = false
}) => {
  const { toast } = useToast();
  
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name || '',
      email: user.email || '',
      address: user.address || '',
      lat: user.lat || 0,
      lng: user.lng || 0,
    },
  });

  const handleSubmit = async (data: ProfileFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        title: "Error",
        description: "There was a problem updating your profile.",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Your name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Your email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="Your address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="lat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Latitude</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="any" 
                    placeholder="Latitude" 
                    {...field}
                    onChange={e => field.onChange(parseFloat(e.target.value))}
                    min="-90"
                    max="90"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lng"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Longitude</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="any" 
                    placeholder="Longitude" 
                    {...field}
                    onChange={e => field.onChange(parseFloat(e.target.value))}
                    min="-180"
                    max="180"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button 
          type="submit" 
          className="w-full"
          disabled={isLoading}
        >
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? 'Saving...' : 'Save Profile'}
        </Button>
      </form>
    </Form>
  );
};

export default EditProfileForm;
