
import React, { useState, useRef, useEffect } from 'react';
import { MenuItem } from '@/lib/database.types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from "@/components/ui/switch";
import { Upload, X } from 'lucide-react';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

interface EditMenuItemDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMenuItem: MenuItem | null;
  onUpdateMenuItem: (name: string, description: string, price: number, imageUrl: string, imageFile: File | null, available: boolean) => void;
  isEditing: boolean;
  isUploading: boolean;
}

const EditMenuItemDialog: React.FC<EditMenuItemDialogProps> = ({
  isOpen,
  onOpenChange,
  selectedMenuItem,
  onUpdateMenuItem,
  isEditing,
  isUploading
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [available, setAvailable] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (selectedMenuItem) {
      setName(selectedMenuItem.name);
      setDescription(selectedMenuItem.description);
      setPrice(selectedMenuItem.price);
      setImageUrl(selectedMenuItem.image_url || '');
      setImagePreview(selectedMenuItem.image_url || null);
      setAvailable(selectedMenuItem.available);
    }
  }, [selectedMenuItem]);

  const handleSubmit = () => {
    onUpdateMenuItem(name, description, price, imageUrl, imageFile, available);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE) {
      alert("Image file is too large. Maximum size is 5MB.");
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert("Selected file is not an image.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setImageFile(file);
  };

  const clearImageSelection = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setImageFile(null);
    setImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Menu Item</DialogTitle>
          <DialogDescription>
            Update an item from your restaurant menu.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-name" className="text-right">
              Name
            </Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-description" className="text-right">
              Description
            </Label>
            <Textarea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-price" className="text-right">
              Price
            </Label>
            <Input type="number" id="edit-price" value={price} onChange={(e) => setPrice(parseFloat(e.target.value))} className="col-span-3" />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
              Image
            </Label>
            <div className="col-span-3">
              {imagePreview ? (
                <div className="relative w-full h-40 mb-2">
                  <img 
                    src={imagePreview} 
                    alt="Selected preview" 
                    className="w-full h-full object-cover rounded-md"
                  />
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-2 right-2 h-8 w-8 rounded-full"
                    onClick={clearImageSelection}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload New Image
                    </Button>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    className="hidden"
                    accept="image/*"
                  />
                  <div>
                    <Label htmlFor="edit-image-url" className="text-sm text-muted-foreground">
                      Or enter an image URL
                    </Label>
                    <Input 
                      id="edit-image-url"
                      placeholder="https://..." 
                      value={imageUrl} 
                      onChange={(e) => setImageUrl(e.target.value)} 
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
                      
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-available" className="text-right">
              Available
            </Label>
            <div className="col-span-3">
              <Switch id="edit-available" checked={available} onCheckedChange={(checked) => setAvailable(checked)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isEditing || isUploading}>
            {isEditing ? 'Updating...' : isUploading ? 'Uploading Image...' : 'Update Menu Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditMenuItemDialog;
