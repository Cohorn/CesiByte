import React, { useState, useEffect, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { MenuItem } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Edit, Plus, Trash, Upload, X, Image as ImageIcon } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { v4 as uuidv4 } from 'uuid';
import { useReviews } from '@/hooks/useReviews';
import RestaurantReviewsList from '@/components/RestaurantReviewsList';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const DEFAULT_MENU_ITEM_IMAGE = 'https://placehold.co/600x400/orange/white?text=Menu+Item';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

const RestaurantMenu = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [available, setAvailable] = useState(true);
  const [restaurantId, setRestaurantId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("items");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  const { user } = useAuth();
  
  const { reviews, reviewers, averageRating, isLoading: reviewsLoading } = useReviews({ 
    restaurantId: restaurantId 
  });

  useEffect(() => {
    const fetchRestaurantId = async () => {
      if (!user) return;

      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (restaurantError) {
        toast({
          title: "Error",
          description: "Could not fetch restaurant data",
          variant: "destructive"
        });
        return;
      }

      setRestaurantId(restaurantData.id);
      fetchMenuItems(restaurantData.id);
    };

    fetchRestaurantId();
  }, [user, toast]);

  const fetchMenuItems = async (restaurantId: string) => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId);

    if (error) {
      toast({
        title: "Error",
        description: "Could not fetch menu items",
        variant: "destructive"
      });
      return;
    }

    setMenuItems(data as MenuItem[]);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE) {
      toast({
        title: "Error",
        description: "Image file is too large. Maximum size is 5MB.",
        variant: "destructive"
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Selected file is not an image.",
        variant: "destructive"
      });
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (editFileInputRef.current) {
      editFileInputRef.current.value = '';
    }
  };

  const uploadImage = async () => {
    if (!imageFile || !restaurantId) return null;
    
    setIsUploading(true);
    
    try {
      const { success, bucketId, error } = await supabase.storage.listBuckets()
        .then(({ data: buckets, error: listError }) => {
          if (listError) {
            console.error('Error listing buckets:', listError);
            return { success: false, bucketId: null, error: "Cannot access storage service" };
          }
          
          if (!buckets || buckets.length === 0) {
            console.error('No storage buckets found');
            return { success: false, bucketId: null, error: "No storage buckets found" };
          }
          
          console.log('Available buckets for menu upload:', buckets.map(b => `${b.id} (${b.name})`).join(', '));
          
          const possibleBucketNames = [
            'restaurant_images',
            'Restaurant Images',
            'restaurant-images',
            'restaurantimages',
            'public',
            'avatars'
          ];
          
          let targetBucket = buckets.find(b => 
            b.id.toLowerCase() === 'restaurant_images' || 
            b.name.toLowerCase() === 'restaurant_images'
          );
          
          if (!targetBucket) {
            targetBucket = buckets.find(b => 
              possibleBucketNames.some(name => 
                b.id.toLowerCase() === name.toLowerCase() || 
                b.name.toLowerCase() === name.toLowerCase()
              )
            );
          }
          
          if (!targetBucket && buckets.length > 0) {
            targetBucket = buckets[0];
          }
          
          if (!targetBucket) {
            return { success: false, bucketId: null, error: "No suitable storage bucket found" };
          }
          
          return { success: true, bucketId: targetBucket.id };
        });
      
      if (!success || !bucketId) {
        console.error(`Storage bucket error: ${error}`);
        toast({
          title: "Error",
          description: "Storage service not available. Please try again later.",
          variant: "destructive"
        });
        return null;
      }
      
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}.${fileExt}`;
      const filePath = `menu_items/${restaurantId}/${fileName}`;
      
      console.log(`Uploading menu item image to ${bucketId}/${filePath}`);
      
      const { error: uploadError, data } = await supabase.storage
        .from(bucketId)
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast({
          title: "Error",
          description: `Upload failed: ${uploadError.message}`,
          variant: "destructive"
        });
        return null;
      }
      
      if (!data?.path) {
        console.error('Upload succeeded but no file path was returned');
        toast({
          title: "Error",
          description: "Upload succeeded but no file path was returned",
          variant: "destructive"
        });
        return null;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from(bucketId)
        .getPublicUrl(data.path);
      
      console.log("Image uploaded successfully:", publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: error instanceof Error 
          ? `Upload error: ${error.message}` 
          : "An unexpected error occurred during upload.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsUploading(false);
      clearImageSelection();
    }
  };

  const addMenuItem = async () => {
    setIsAdding(true);
    
    let finalImageUrl = imageUrl;
    
    if (imageFile) {
      const uploadedUrl = await uploadImage();
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
      fetchMenuItems(restaurantId);
      setName('');
      setDescription('');
      setPrice(0);
      setImageUrl('');
      setImagePreview(null);
      setImageFile(null);
      setAvailable(true);
      toast({
        title: "Success",
        description: "Menu item added successfully",
      });
      setDialogOpen(false);
    }
    setIsAdding(false);
  };

  const updateMenuItem = async () => {
    if (!selectedMenuItem) return;

    setIsEditing(true);
    
    let finalImageUrl = imageUrl;
    
    if (imageFile) {
      const uploadedUrl = await uploadImage();
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
      fetchMenuItems(restaurantId);
      setName('');
      setDescription('');
      setPrice(0);
      setImageUrl('');
      setImagePreview(null);
      setImageFile(null);
      setAvailable(true);
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
      fetchMenuItems(restaurantId);
      toast({
        title: "Success",
        description: "Menu item deleted successfully",
      });
    }
  };

  const handleEdit = (item: MenuItem) => {
    setSelectedMenuItem(item);
    setName(item.name);
    setDescription(item.description);
    setPrice(item.price);
    setImageUrl(item.image_url || '');
    setImagePreview(item.image_url || null);
    setAvailable(item.available);
    setEditDialogOpen(true);
  };

  if (!user || user.user_type !== 'restaurant') {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background w-full">
      <NavBar />
      
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold">Restaurant Dashboard</h1>
              <p className="text-muted-foreground">Manage your menu and reviews</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="items">Menu Items</TabsTrigger>
              <TabsTrigger value="reviews">Customer Reviews</TabsTrigger>
            </TabsList>
            
            <TabsContent value="items" className="mt-4">
              <div className="flex justify-end mb-4">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Menu Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Add Menu Item</DialogTitle>
                      <DialogDescription>
                        Add a new item to your restaurant menu.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                          Name
                        </Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">
                          Description
                        </Label>
                        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="price" className="text-right">
                          Price
                        </Label>
                        <Input type="number" id="price" value={price} onChange={(e) => setPrice(parseFloat(e.target.value))} className="col-span-3" />
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
                                  Upload Image
                                </Button>
                              </div>
                              <input
                                type="file"
                                ref={fileInputRef}
                                onChange={(e) => handleImageSelect(e)}
                                className="hidden"
                                accept="image/*"
                              />
                              <div className="- mt-1">
                                <Label htmlFor="image-url" className="text-sm text-muted-foreground">
                                  Or enter an image URL
                                </Label>
                                <Input 
                                  id="image-url"
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
                        <Label htmlFor="available" className="text-right">
                          Available
                        </Label>
                        <div className="col-span-3">
                          <Switch id="available" checked={available} onCheckedChange={(checked) => setAvailable(checked)} />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={addMenuItem} disabled={isAdding || isUploading}>
                        {isAdding ? 'Adding...' : isUploading ? 'Uploading Image...' : 'Add Menu Item'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="overflow-x-auto rounded-lg border border-border shadow-sm">
                <Table>
                  <TableCaption>A list of your menu items.</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Image</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden md:table-cell">Description</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead className="hidden sm:table-cell">Available</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menuItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.image_url ? (
                            <img 
                              src={item.image_url} 
                              alt={item.name} 
                              className="w-16 h-16 object-cover rounded" 
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = DEFAULT_MENU_ITEM_IMAGE;
                              }}
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-100 flex items-center justify-center rounded">
                              <ImageIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            <p>{item.name}</p>
                            <p className="md:hidden text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-[250px]">
                          <p className="truncate">{item.description}</p>
                        </TableCell>
                        <TableCell>${item.price.toFixed(2)}</TableCell>
                        <TableCell className="hidden sm:table-cell">{item.available ? 'Yes' : 'No'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button variant="destructive" size="icon" onClick={() => deleteMenuItem(item.id)}>
                              <Trash className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {menuItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No menu items found. Add your first menu item to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={6}>
                        {menuItems.length} Total items
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </TabsContent>
            
            <TabsContent value="reviews" className="mt-4">
              <div className="bg-white rounded-lg border border-border shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Customer Reviews</h2>
                {reviewsLoading ? (
                  <p className="text-center py-4">Loading reviews...</p>
                ) : (
                  <RestaurantReviewsList reviews={reviews} reviewers={reviewers} />
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
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
                        onClick={() => editFileInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload New Image
                      </Button>
                    </div>
                    <input
                      type="file"
                      ref={editFileInputRef}
                      onChange={(e) => handleImageSelect(e, true)}
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
            <Button onClick={updateMenuItem} disabled={isEditing || isUploading}>
              {isEditing ? 'Updating...' : isUploading ? 'Uploading Image...' : 'Update Menu Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RestaurantMenu;
