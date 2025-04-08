
import React from 'react';
import { User } from '@/lib/database.types';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

// Define the form schema
const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  address: z.string().min(5, {
    message: 'Address must be at least 5 characters.',
  }),
});

export interface EditProfileFormProps {
  user: User;
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  isLoading: boolean;
}

const EditProfileForm: React.FC<EditProfileFormProps> = ({
  user,
  onSubmit,
  isLoading
}) => {
  // Initialize form with user data
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user.name || '',
      address: user.address || '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Your name" {...field} />
              </FormControl>
              <FormDescription>
                This is your public display name.
              </FormDescription>
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
              <FormDescription>
                This address will be used for deliveries.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </Form>
  );
};

export default EditProfileForm;
