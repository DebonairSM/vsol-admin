import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDate } from '@/lib/utils';
import { Plus, Edit, Trash2, Package, CheckCircle } from 'lucide-react';
import {
  useConsultantEquipment,
  useCreateEquipment,
  useUpdateEquipment,
  useDeleteEquipment,
  useMarkEquipmentReturned
} from '@/hooks/use-consultant-equipment';
import type { ConsultantEquipment, CreateEquipmentRequest, UpdateEquipmentRequest } from '@vsol-admin/shared';

interface EquipmentManagementProps {
  consultantId: number;
  isTerminated?: boolean;
}

interface EquipmentFormData {
  deviceName: string;
  model: string;
  purchaseDate: string;
  serialNumber: string;
  returnRequired: boolean;
  notes: string;
}

const initialFormData: EquipmentFormData = {
  deviceName: '',
  model: '',
  purchaseDate: '',
  serialNumber: '',
  returnRequired: true,
  notes: ''
};

export default function EquipmentManagement({ consultantId, isTerminated = false }: EquipmentManagementProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<EquipmentFormData>(initialFormData);

  const { data: equipment = [], isLoading } = useConsultantEquipment(consultantId);
  const createEquipmentMutation = useCreateEquipment();
  const updateEquipmentMutation = useUpdateEquipment();
  const deleteEquipmentMutation = useDeleteEquipment();
  const markReturnedMutation = useMarkEquipmentReturned();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: CreateEquipmentRequest | UpdateEquipmentRequest = {
      deviceName: formData.deviceName,
      model: formData.model || undefined,
      purchaseDate: formData.purchaseDate || undefined,
      serialNumber: formData.serialNumber || undefined,
      returnRequired: formData.returnRequired,
      notes: formData.notes || undefined
    };

    try {
      if (editingId) {
        await updateEquipmentMutation.mutateAsync({
          consultantId,
          equipmentId: editingId,
          data
        });
      } else {
        await createEquipmentMutation.mutateAsync({
          consultantId,
          data: data as CreateEquipmentRequest
        });
      }

      // Reset form
      setFormData(initialFormData);
      setIsAdding(false);
      setEditingId(null);
    } catch (error) {
      console.error('Error saving equipment:', error);
    }
  };

  const handleEdit = (item: ConsultantEquipment) => {
    setFormData({
      deviceName: item.deviceName,
      model: item.model || '',
      purchaseDate: item.purchaseDate ? item.purchaseDate.toISOString().split('T')[0] : '',
      serialNumber: item.serialNumber || '',
      returnRequired: item.returnRequired,
      notes: item.notes || ''
    });
    setEditingId(item.id);
    setIsAdding(true);
  };

  const handleDelete = async (equipmentId: number) => {
    if (confirm('Are you sure you want to delete this equipment?')) {
      try {
        await deleteEquipmentMutation.mutateAsync({ consultantId, equipmentId });
      } catch (error) {
        console.error('Error deleting equipment:', error);
      }
    }
  };

  const handleMarkReturned = async (equipmentId: number) => {
    try {
      await markReturnedMutation.mutateAsync({ consultantId, equipmentId });
    } catch (error) {
      console.error('Error marking equipment as returned:', error);
    }
  };

  const handleCancel = () => {
    setFormData(initialFormData);
    setIsAdding(false);
    setEditingId(null);
  };

  const pendingReturns = equipment.filter(item => item.returnRequired && !item.returnedDate);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Equipment Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading equipment...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Equipment Management
        </CardTitle>
        <CardDescription>
          Manage equipment assigned to this consultant
          {isTerminated && pendingReturns.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {pendingReturns.length} pending return{pendingReturns.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add/Edit Form */}
        {isAdding && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-medium mb-4">
              {editingId ? 'Edit Equipment' : 'Add New Equipment'}
            </h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="deviceName">Device Name *</Label>
                  <Input
                    id="deviceName"
                    value={formData.deviceName}
                    onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                    placeholder="e.g., Notebook Dell, Headset Logitech"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g., Inspiron 15, H390"
                  />
                </div>
                <div>
                  <Label htmlFor="purchaseDate">Purchase Date</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input
                    id="serialNumber"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    placeholder="e.g., ABC123456"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="returnRequired"
                  checked={formData.returnRequired}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, returnRequired: checked as boolean })
                  }
                />
                <Label htmlFor="returnRequired">Return required upon termination</Label>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about this equipment..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit"
                  disabled={createEquipmentMutation.isPending || updateEquipmentMutation.isPending}
                >
                  {editingId ? 'Update Equipment' : 'Add Equipment'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Add Button */}
        {!isAdding && !isTerminated && (
          <Button onClick={() => setIsAdding(true)} className="mb-4">
            <Plus className="w-4 h-4 mr-2" />
            Add Equipment
          </Button>
        )}

        {/* Equipment List */}
        {equipment.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No equipment registered
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Purchase Date</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Return Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.deviceName}
                      {item.notes && (
                        <div className="text-xs text-gray-500 mt-1">
                          {item.notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{item.model || '-'}</TableCell>
                    <TableCell>
                      {item.purchaseDate ? formatDate(item.purchaseDate) : '-'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.serialNumber || '-'}
                    </TableCell>
                    <TableCell>
                      {!item.returnRequired ? (
                        <Badge variant="secondary">Return not required</Badge>
                      ) : item.returnedDate ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Returned {formatDate(item.returnedDate)}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          Pending return
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {!isTerminated && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                        {item.returnRequired && !item.returnedDate && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkReturned(item.id)}
                            disabled={markReturnedMutation.isPending}
                          >
                            Mark Returned
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
