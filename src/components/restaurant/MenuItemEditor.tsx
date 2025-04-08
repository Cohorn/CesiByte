
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { restaurantApi } from '@/api/services';
import { MenuItem } from '@/lib/database.types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

interface MenuItemEditorProps {
  restaurantId: string;
  item?: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  mode: 'add' | 'edit';
}

const MenuItemEditor: React.FC<MenuItemEditorProps> = ({
  restaurantId,
  item,
  isOpen,
  onClose,
  onSave,
  mode
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [price, setPrice] = useState(item?.price?.toString() || '');
  const [available, setAvailable] = useState(item?.available !== false);

  const validateForm = () => {
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Menu item name is required",
        variant: "destructive"
      });
      return false;
    }
    
    if (!description.trim()) {
      toast({
        title: "Validation Error",
        description: "Menu item description is required",
        variant: "destructive"
      });
      return false;
    }
    
    const priceNumber = parseFloat(price);
    if (isNaN(priceNumber) || priceNumber <= 0) {
      toast({
        title: "Validation Error",
        description: "Price must be a valid positive number",
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const itemData = {
        name,
        description,
        price: parseFloat(price),
        available
      };
      
      if (mode === 'add') {
        await restaurantApi.addMenuItem(restaurantId, itemData);
        toast({
          title: "Success",
          description: "Menu item added successfully"
        });
      } else {
        if (!item) throw new Error("No item to edit");
        await restaurantApi.updateMenuItem(restaurantId, item.id, itemData);
        toast({
          title: "Success",
          description: "Menu item updated successfully"
        });
      }
      
      onSave();
      onClose();
    } catch (error) {
      console.error("Error saving menu item:", error);
      toast({
        title: "Error",
        description: "Failed to save menu item",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => !isLoading && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add New Menu Item' : 'Edit Menu Item'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Item Name *</Label>
            <Input 
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Item name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea 
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Item description"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="price">Price (in $) *</Label>
            <Input 
              id="price"
              type="number"
              step="0.01"
              min="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch 
              id="available" 
              checked={available}
              onCheckedChange={setAvailable}
            />
            <Label htmlFor="available">Available for ordering</Label>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Item'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MenuItemEditor;
