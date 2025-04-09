
import React from 'react';
import { type MenuItem as MenuItemType } from '@/lib/database.types';
import { Image as ImageIcon, Edit, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from "@/components/ui/table";

const DEFAULT_MENU_ITEM_IMAGE = 'https://placehold.co/600x400/orange/white?text=Menu+Item';

interface MenuItemProps {
  item: MenuItemType;
  onEdit: (item: MenuItemType) => void;
  onDelete: (id: string) => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ item, onEdit, onDelete }) => {
  return (
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
        <p className="line-clamp-2">{item.description}</p>
      </TableCell>
      <TableCell>${item.price.toFixed(2)}</TableCell>
      <TableCell className="hidden sm:table-cell">{item.available ? 'Yes' : 'No'}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button variant="destructive" size="icon" onClick={() => onDelete(item.id)}>
            <Trash className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default MenuItem;
