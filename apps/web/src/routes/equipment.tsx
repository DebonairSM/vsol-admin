import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useEquipment, useDeleteEquipment, useUpdateEquipment } from '@/hooks/use-equipment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Laptop, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Package,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface Equipment {
  id: number;
  consultantId: number;
  deviceName: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  returnRequired: boolean;
  returnedDate?: string;
  notes?: string;
  createdAt: string;
  consultant: {
    id: number;
    name: string;
  };
}

export default function EquipmentPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; equipment?: Equipment }>({
    open: false
  });
  const [editingNotes, setEditingNotes] = useState<{ id: number; notes: string } | null>(null);

  const { data: equipment, isLoading, error } = useEquipment();
  const deleteEquipmentMutation = useDeleteEquipment();
  const updateEquipmentMutation = useUpdateEquipment();

  // Filter equipment based on search term
  const filteredEquipment = equipment?.filter((item: Equipment) =>
    item.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.consultant.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleDelete = async () => {
    if (deleteDialog.equipment) {
      try {
        await deleteEquipmentMutation.mutateAsync(deleteDialog.equipment.id);
        setDeleteDialog({ open: false });
      } catch (error) {
        console.error('Failed to delete equipment:', error);
      }
    }
  };

  const handleNotesEdit = (equipment: Equipment) => {
    setEditingNotes({ id: equipment.id, notes: equipment.notes || '' });
  };

  const handleNotesSave = async () => {
    if (editingNotes) {
      try {
        await updateEquipmentMutation.mutateAsync({
          id: editingNotes.id,
          data: { notes: editingNotes.notes }
        });
        setEditingNotes(null);
      } catch (error) {
        console.error('Failed to update notes:', error);
      }
    }
  };

  const getReturnStatus = (equipment: Equipment) => {
    if (!equipment.returnRequired) {
      return { status: 'not-required', label: 'Not Required', variant: 'secondary' as const };
    }
    if (equipment.returnedDate) {
      return { status: 'returned', label: 'Returned', variant: 'default' as const };
    }
    return { status: 'pending', label: 'Pending Return', variant: 'destructive' as const };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-lg">Loading equipment...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-red-600">Error loading equipment: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Laptop className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Equipment Inventory</h1>
        </div>
        <Link to="/equipment/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Equipment
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Equipment</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{equipment?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <Laptop className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {equipment?.filter((item: Equipment) => item.consultantId).length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Returns</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {equipment?.filter((item: Equipment) => item.returnRequired && !item.returnedDate).length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Returned</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {equipment?.filter((item: Equipment) => item.returnedDate).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search equipment by name, model, serial, or consultant..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Equipment Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Device</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Serial Number</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Purchase Date</TableHead>
              <TableHead>Return Status</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEquipment.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No equipment found
                </TableCell>
              </TableRow>
            ) : (
              filteredEquipment.map((item: Equipment) => {
                const returnStatus = getReturnStatus(item);
                
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.deviceName}</TableCell>
                    <TableCell>{item.model || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">{item.serialNumber || '-'}</TableCell>
                    <TableCell>
                      <Link
                        to={`/consultants/${item.consultant.id}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {item.consultant.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {item.purchaseDate 
                        ? format(new Date(item.purchaseDate), 'MMM dd, yyyy')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant={returnStatus.variant}>
                        {returnStatus.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {editingNotes?.id === item.id ? (
                        <div className="flex items-center space-x-2">
                          <Textarea
                            value={editingNotes.notes}
                            onChange={(e) => setEditingNotes({ ...editingNotes, notes: e.target.value })}
                            className="min-h-[60px] text-sm"
                          />
                          <div className="flex flex-col space-y-1">
                            <Button size="sm" onClick={handleNotesSave}>Save</Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setEditingNotes(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <div className="text-sm max-w-xs truncate">
                            {item.notes || '-'}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleNotesEdit(item)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteDialog({ open: true, equipment: item })}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open: boolean) => setDeleteDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Equipment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog.equipment?.deviceName}"? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteEquipmentMutation.isPending}
            >
              {deleteEquipmentMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
