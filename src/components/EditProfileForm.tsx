import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, UserType } from '@/lib/database.types';
import { Label } from '@/components/ui/label';

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  address: z.string().min(2, {
    message: "Address must be at least 2 characters.",
  }),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export interface EditProfileFormProps {
  user: User;
  onSave: (updatedData: { name: string; address: string; lat: number; lng: number; }) => Promise<void>;
  onUserTypeChange: (type: UserType) => Promise<void>;
}

const EditProfileForm: React.FC<EditProfileFormProps> = ({ user, onSave, onUserTypeChange }) => {
  const { toast } = useToast();
  const { updateProfile, setUserType } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [userType, setUserTypeState] = useState<UserType>(user.user_type);
  const [isChangingUserType, setIsChangingUserType] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user.name,
      address: user.address,
      lat: user.lat,
      lng: user.lng,
    },
  });
  
  useEffect(() => {
    form.reset({
      name: user.name,
      address: user.address,
      lat: user.lat,
      lng: user.lng,
    });
  }, [user, form]);
  
  const onSubmit: SubmitHandler<z.infer<typeof formSchema>> = async (values) => {
    setIsSaving(true);
    try {
      await onSave(values);
      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleUserTypeChange = async (type: UserType) => {
    setIsChangingUserType(true);
    try {
      setUserTypeState(type);
      await onUserTypeChange(type);
      toast({
        title: "Success",
        description: `User type changed to ${type}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user type",
        variant: "destructive",
      });
    } finally {
      setIsChangingUserType(false);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
        <div className="flex space-x-4">
          <FormField
            control={form.control}
            name="lat"
            render={({ field }) => (
              <FormItem className="w-1/2">
                <FormLabel>Latitude</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Latitude" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lng"
            render={({ field }) => (
              <FormItem className="w-1/2">
                <FormLabel>Longitude</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Longitude" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {user.employee_role === 'commercial_service' && (
          <FormField
            control={form.control}
            name="user_type"
            render={() => (
              <FormItem>
                <FormLabel>User Type</FormLabel>
                <Select onValueChange={handleUserTypeChange} defaultValue={userType}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="courier">Courier</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  This will update the user type.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <Button type="submit" disabled={isSaving || isChangingUserType}>
          {isSaving ? "Saving..." : "Update Profile"}
        </Button>
      </form>
    </Form>
  );
};

export default EditProfileForm;
