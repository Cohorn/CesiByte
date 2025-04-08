
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User } from '@/lib/database.types';

export interface EditProfileFormProps {
  user: User;
  onSubmit: (formData: any) => Promise<void>;
  isLoading: boolean;
}

const EditProfileForm: React.FC<EditProfileFormProps> = ({ user, onSubmit, isLoading }) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [address, setAddress] = useState(user.address);
  const [lat, setLat] = useState<number>(user.lat || 0);
  const [lng, setLng] = useState<number>(user.lng || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await onSubmit({
      name,
      email,
      address,
      lat,
      lng
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required={!['employee', 'dev', 'com_agent'].includes(user.user_type)}
          disabled={['employee', 'dev', 'com_agent'].includes(user.user_type)}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="lat">Latitude</Label>
          <Input
            id="lat"
            type="number"
            step="any"
            value={lat}
            onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
            required={!['employee', 'dev', 'com_agent'].includes(user.user_type)}
            disabled={['employee', 'dev', 'com_agent'].includes(user.user_type)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="lng">Longitude</Label>
          <Input
            id="lng"
            type="number"
            step="any"
            value={lng}
            onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
            required={!['employee', 'dev', 'com_agent'].includes(user.user_type)}
            disabled={['employee', 'dev', 'com_agent'].includes(user.user_type)}
          />
        </div>
      </div>
      
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  );
};

export default EditProfileForm;
