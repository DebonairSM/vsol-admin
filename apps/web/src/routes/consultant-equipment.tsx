import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useCreateConsultantEquipment, useUpdateConsultantEquipment } from '@/hooks/use-consultant-equipment';
import { Plus, Edit, Loader2 } from 'lucide-react';
import type { ConsultantEquipment, CreateConsultantEquipmentRequest, UpdateEquipmentRequest } from '@vsol-admin/shared';
import { formatDate } from '@/lib/utils';

export default function ConsultantEquipmentPage() {
  const { data: equipment, isLoading } = useQuery({
    queryKey: ['consultant-equipment'],
    queryFn: () => apiClient.getConsultantEquipment(),
  });

  const { toast } = useToast();
  const createEquipment = useCreateConsultantEquipment();
  const updateEquipment = useUpdateConsultantEquipment();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<ConsultantEquipment | null>(null);
  const [formData, setFormData] = useState<CreateConsultantEquipmentRequest>({
    deviceName: '',
    model: '',
    purchaseDate: undefined,
    serialNumber: '',
    returnRequired: true,
    notes: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const formatDateForInput = (dateValue: any): string | undefined => {
    if (!dateValue) return undefined;
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return undefined;
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return undefined;
    }
  };

  const resetForm = () => {
    setFormData({
      deviceName: '',
      model: '',
      purchaseDate: undefined,
      serialNumber: '',
      returnRequired: true,
      notes: ''
    });
    setFormErrors({});
  };

  const handleOpenAddDialog = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (item: ConsultantEquipment) => {
    setEditingEquipment(item);
    setFormData({
      deviceName: item.deviceName,
      model: item.model || '',
      purchaseDate: item.purchaseDate ? new Date(item.purchaseDate).toISOString() : undefined,
      serialNumber: item.serialNumber || '',
      returnRequired: item.returnRequired,
      notes: item.notes || ''
    });
    setFormErrors({});
    setIsEditDialogOpen(true);
  };

  const handleCloseAddDialog = () => {
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingEquipment(null);
    resetForm();
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.deviceName || formData.deviceName.trim() === '') {
      errors.deviceName = 'Device name is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitAdd = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const submitData: CreateConsultantEquipmentRequest = {
        deviceName: formData.deviceName.trim(),
        model: formData.model?.trim() || undefined,
        purchaseDate: formData.purchaseDate ? formData.purchaseDate : undefined,
        serialNumber: formData.serialNumber?.trim() || undefined,
        returnRequired: formData.returnRequired,
        notes: formData.notes?.trim() || undefined
      };

      await createEquipment.mutateAsync(submitData);
      toast({
        title: 'Success',
        description: 'Equipment added successfully.',
      });
      handleCloseAddDialog();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to add equipment';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleSubmitEdit = async () => {
    if (!validateForm() || !editingEquipment) {
      return;
    }

    try {
      const submitData: UpdateEquipmentRequest = {
        deviceName: formData.deviceName.trim(),
        model: formData.model?.trim() || null,
        purchaseDate: formData.purchaseDate ? formData.purchaseDate : null,
        serialNumber: formData.serialNumber?.trim() || null,
        returnRequired: formData.returnRequired,
        notes: formData.notes?.trim() || null
      };

      await updateEquipment.mutateAsync({
        equipmentId: editingEquipment.id,
        data: submitData
      });
      toast({
        title: 'Success',
        description: 'Equipment updated successfully.',
      });
      handleCloseEditDialog();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to update equipment';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Equipment</h1>
          <p className="mt-2 text-sm text-gray-600">
            View and manage your equipment inventory
          </p>
        </div>
        <Button onClick={handleOpenAddDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Equipment
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Equipment List</CardTitle>
          <CardDescription>
            Equipment in your inventory
          </CardDescription>
        </CardHeader>
        <CardContent>
          {equipment && equipment.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device Name</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Purchase Date</TableHead>
                  <TableHead>Return Required</TableHead>
                  <TableHead>Returned Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.deviceName}</TableCell>
                    <TableCell>{item.model || 'N/A'}</TableCell>
                    <TableCell>{item.serialNumber || 'N/A'}</TableCell>
                    <TableCell>{item.purchaseDate ? formatDate(new Date(item.purchaseDate)) : 'N/A'}</TableCell>
                    <TableCell>{item.returnRequired ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{item.returnedDate ? formatDate(new Date(item.returnedDate)) : 'N/A'}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditDialog(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No equipment records found</p>
              <Button onClick={handleOpenAddDialog} className="mt-4" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Equipment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Equipment Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Equipment</DialogTitle>
            <DialogDescription>
              Add a new equipment item to your inventory
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="deviceName">Device Name *</Label>
              <Input
                id="deviceName"
                value={formData.deviceName}
                onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                placeholder="e.g., MacBook Pro, Dell Monitor"
              />
              {formErrors.deviceName && (
                <p className="text-sm text-red-500 mt-1">{formErrors.deviceName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="e.g., 16-inch, 2023"
              />
            </div>

            <div>
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input
                id="serialNumber"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                placeholder="Equipment serial number"
              />
            </div>

            <div>
              <Label htmlFor="purchaseDate">Purchase Date</Label>
              <Input
                id="purchaseDate"
                type="date"
                value={formData.purchaseDate ? formatDateForInput(new Date(formData.purchaseDate)) : ''}
                onChange={(e) => {
                  const dateValue = e.target.value;
                  if (dateValue) {
                    // Convert YYYY-MM-DD to ISO datetime string (midnight UTC)
                    const date = new Date(dateValue + 'T00:00:00Z');
                    setFormData({
                      ...formData,
                      purchaseDate: date.toISOString()
                    });
                  } else {
                    setFormData({
                      ...formData,
                      purchaseDate: undefined
                    });
                  }
                }}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="returnRequired"
                checked={formData.returnRequired}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, returnRequired: checked === true })
                }
              />
              <Label htmlFor="returnRequired" className="cursor-pointer">
                Return required when leaving the company
              </Label>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this equipment"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleCloseAddDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmitAdd} disabled={createEquipment.isPending}>
              {createEquipment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Equipment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Equipment Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Equipment</DialogTitle>
            <DialogDescription>
              Update equipment information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-deviceName">Device Name *</Label>
              <Input
                id="edit-deviceName"
                value={formData.deviceName}
                onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                placeholder="e.g., MacBook Pro, Dell Monitor"
              />
              {formErrors.deviceName && (
                <p className="text-sm text-red-500 mt-1">{formErrors.deviceName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="edit-model">Model</Label>
              <Input
                id="edit-model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="e.g., 16-inch, 2023"
              />
            </div>

            <div>
              <Label htmlFor="edit-serialNumber">Serial Number</Label>
              <Input
                id="edit-serialNumber"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                placeholder="Equipment serial number"
              />
            </div>

            <div>
              <Label htmlFor="edit-purchaseDate">Purchase Date</Label>
              <Input
                id="edit-purchaseDate"
                type="date"
                value={formData.purchaseDate ? formatDateForInput(new Date(formData.purchaseDate)) : ''}
                onChange={(e) => {
                  const dateValue = e.target.value;
                  if (dateValue) {
                    // Convert YYYY-MM-DD to ISO datetime string (midnight UTC)
                    const date = new Date(dateValue + 'T00:00:00Z');
                    setFormData({
                      ...formData,
                      purchaseDate: date.toISOString()
                    });
                  } else {
                    setFormData({
                      ...formData,
                      purchaseDate: undefined
                    });
                  }
                }}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-returnRequired"
                checked={formData.returnRequired}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, returnRequired: checked === true })
                }
              />
              <Label htmlFor="edit-returnRequired" className="cursor-pointer">
                Return required when leaving the company
              </Label>
            </div>

            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this equipment"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleCloseEditDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmitEdit} disabled={updateEquipment.isPending}>
              {updateEquipment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Equipment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
