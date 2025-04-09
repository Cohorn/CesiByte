
import React from 'react';
import { MenuItem as MenuItemType } from '@/lib/database.types';
import MenuItem from './MenuItem';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface MenuItemTableProps {
  menuItems: MenuItemType[];
  onEdit: (item: MenuItemType) => void;
  onDelete: (id: string) => void;
}

const MenuItemTable: React.FC<MenuItemTableProps> = ({ menuItems, onEdit, onDelete }) => {
  return (
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
            <MenuItem 
              key={item.id} 
              item={item} 
              onEdit={onEdit} 
              onDelete={onDelete} 
            />
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
  );
};

export default MenuItemTable;
