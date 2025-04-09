
import React, { useState } from 'react';
import { MenuItem } from '@/lib/database.types';
import MenuItemTable from './MenuItemTable';
import AddMenuItemDialog from './AddMenuItemDialog';
import EditMenuItemDialog from './EditMenuItemDialog';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useStorage } from '@/hooks/useStorage';

interface MenuItemsListProps {
  menuItems: MenuItem[];
  restaurantId: string;
  onMenuItemsChange: () => void;
}

const MenuItemsList: React.FC<MenuItemsListProps> = ({
  menuItems,
  restaurantId,
  onMenuItemsChange
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const { uploadFile } = useStorage('restaurant_images');

  const uploadImage = async (imageFile: File | null) => {
    if (!imageFile || !restaurantId) return null;
    
    setIsUploading(true);
    
    try {
      // Upload the file to the menu_items/{restaurantId} folder
      const uploadedUrl = await uploadFile(imageFile, `menu_items/${restaurantId}`);
      
      if (uploadedUrl) {
        toast({
          title: "Success",
          description: "Image uploaded successfully",
        });
        return uploadedUrl;
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again later or use an image URL.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const addMenuItem = async (
    name: string, 
    description: string, 
    price: number, 
    imageUrl: string, 
    imageFile: File | null, 
    available: boolean
  ) => {
    setIsAdding(true);
    
    let finalImageUrl = imageUrl;
    
    if (imageFile) {
      const uploadedUrl = await uploadImage(imageFile);
      if (uploadedUrl) {
        finalImageUrl = uploadedUrl;
      }
    }
    
    const { error } = await supabase
      .from('menu_items')
      .insert({
        name,
        description,
        price,
        image_url: finalImageUrl,
        available,
        restaurant_id: restaurantId,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Could not add menu item",
        variant: "destructive"
      });
    } else {
      onMenuItemsChange();
      toast({
        title: "Success",
        description: "Menu item added successfully",
      });
      setDialogOpen(false);
    }
    setIsAdding(false);
  };

  const updateMenuItem = async (
    name: string, 
    description: string, 
    price: number, 
    imageUrl: string, 
    imageFile: File | null, 
    available: boolean
  ) => {
    if (!selectedMenuItem) return;

    setIsEditing(true);
    
    let finalImageUrl = imageUrl;
    
    if (imageFile) {
      const uploadedUrl = await uploadImage(imageFile);
      if (uploadedUrl) {
        finalImageUrl = uploadedUrl;
      }
    }
    
    const { error } = await supabase
      .from('menu_items')
      .update({
        name,
        description,
        price,
        image_url: finalImageUrl,
        available,
      })
      .eq('id', selectedMenuItem.id);

    if (error) {
      toast({
        title: "Error",
        description: "Could not update menu item",
        variant: "destructive"
      });
    } else {
      onMenuItemsChange();
      setSelectedMenuItem(null);
      toast({
        title: "Success",
        description: "Menu item updated successfully",
      });
      setEditDialogOpen(false);
    }
    setIsEditing(false);
  };

  const deleteMenuItem = async (id: string) => {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Could not delete menu item",
        variant: "destructive"
      });
    } else {
      onMenuItemsChange();
      toast({
        title: "Success",
        description: "Menu item deleted successfully",
      });
    }
  };

  const handleEdit = (item: MenuItem) => {
    setSelectedMenuItem(item);
    setEditDialogOpen(true);
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <AddMenuItemDialog
          isOpen={dialogOpen}
          onOpenChange={setDialogOpen}
          onAddMenuItem={addMenuItem}
          isAdding={isAdding}
          isUploading={isUploading}
        />
      </div>

      <MenuItemTable
        menuItems={menuItems}
        onEdit={handleEdit}
        onDelete={deleteMenuItem}
      />

      <EditMenuItemDialog
        isOpen={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        selectedMenuItem={selectedMenuItem}
        onUpdateMenuItem={updateMenuItem}
        isEditing={isEditing}
        isUploading={isUploading}
      />
    </div>
  );
};

export default MenuItemsList;
