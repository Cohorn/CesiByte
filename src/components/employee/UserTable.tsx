
import React from 'react';
import { Link } from 'react-router-dom';
import { User } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import { Loader2, MapPin, Trash, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserTableProps {
  users: User[] | null | undefined;
  userType: 'customer' | 'restaurant' | 'courier';
  isDeleting: string | null;
  onDeleteUser: (userId: string) => void;
  noUsersMessage?: string;
}

const UserTable: React.FC<UserTableProps> = ({
  users,
  userType,
  isDeleting,
  onDeleteUser,
  noUsersMessage = "No users found."
}) => {
  const getEditLink = (userId: string) => {
    switch (userType) {
      case 'customer':
        return `/employee/customers/${userId}`;
      case 'restaurant':
        return `/employee/restaurants/${userId}`;
      case 'courier':
        return `/employee/couriers/${userId}`;
      default:
        return '#';
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>
              {userType === 'courier' ? 'Location' : 'Address'}
            </TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!users || users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                {noUsersMessage}
              </TableCell>
            </TableRow>
          ) : (
            users.map((user: User) => (
              <TableRow key={user.id} className={cn(
                "transition-colors hover:bg-muted/50",
                user.id === isDeleting && "opacity-50"
              )}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {userType === 'courier' ? (
                    <div className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                      {`${user.lat.toFixed(4)}, ${user.lng.toFixed(4)}`}
                    </div>
                  ) : (
                    user.address
                  )}
                </TableCell>
                <TableCell>
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                    >
                      <Link to={getEditLink(user.id)}>
                        <UserCog className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteUser(user.id)}
                      disabled={isDeleting === user.id}
                    >
                      {isDeleting === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash className="h-4 w-4 text-red-500" />
                      )}
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default UserTable;
