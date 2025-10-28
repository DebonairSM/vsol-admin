import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Trash2, Clock, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export default function WorkHoursPage() {
  const [jsonContent, setJsonContent] = useState('');
  const [importResult, setImportResult] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch all work hours data
  const { data: workHours, isLoading } = useQuery({
    queryKey: ['work-hours'],
    queryFn: () => apiClient.getWorkHours(),
  });

  // Import JSON mutation
  const importMutation = useMutation({
    mutationFn: (jsonContent: string) => apiClient.importWorkHours(jsonContent),
    onSuccess: (result) => {
      setImportResult(result);
      setJsonContent('');
      queryClient.invalidateQueries({ queryKey: ['work-hours'] });
    },
  });

  // Delete year mutation
  const deleteYearMutation = useMutation({
    mutationFn: (year: number) => apiClient.deleteWorkHoursYear(year),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-hours'] });
    },
  });

  const handleImport = () => {
    if (jsonContent.trim()) {
      importMutation.mutate(jsonContent.trim());
    }
  };

  const handleDeleteYear = (year: number) => {
    if (confirm(`Are you sure you want to delete all work hours data for ${year}?`)) {
      deleteYearMutation.mutate(year);
    }
  };

  // Group work hours by year
  const groupedByYear = workHours?.reduce((acc: Record<number, any[]>, item: any) => {
    if (!acc[item.year]) acc[item.year] = [];
    acc[item.year].push(item);
    return acc;
  }, {}) || {};

  const exampleJSON = `[
  {
    "year": 2024,
    "months": [
      {
        "month": "January",
        "monthNumber": 1,
        "weekdays": 23,
        "workHours": 184
      },
      {
        "month": "February", 
        "monthNumber": 2,
        "weekdays": 21,
        "workHours": 168
      },
      {
        "month": "March",
        "monthNumber": 3, 
        "weekdays": 21,
        "workHours": 168
      }
      // ... more months
    ]
  },
  {
    "year": 2025,
    "months": [
      {
        "month": "January",
        "monthNumber": 1,
        "weekdays": 23, 
        "workHours": 184
      }
      // ... more months
    ]
  }
]`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Monthly Work Hours Reference</h1>
        <p className="text-gray-600">
          Import and manage monthly work hours data used for payroll cycle creation and billing validation.
        </p>
      </div>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Work Hours Data
          </CardTitle>
          <CardDescription>
            Paste your AI-generated JSON data to import monthly work hours for each year. This data will be used to suggest 
            appropriate globalWorkHours when creating new payroll cycles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Example format */}
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-2">Expected JSON Format:</h4>
            <div className="bg-gray-50 p-3 rounded-md text-xs font-mono whitespace-pre text-gray-600 overflow-x-auto">
              {exampleJSON}
            </div>
          </div>

          {/* JSON Input */}
          <div>
            <Textarea
              placeholder="Paste your AI-generated JSON data here..."
              value={jsonContent}
              onChange={(e) => setJsonContent(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
          </div>

          {/* Import Button */}
          <div className="flex gap-2">
            <Button 
              onClick={handleImport}
              disabled={!jsonContent.trim() || importMutation.isPending}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {importMutation.isPending ? 'Importing...' : 'Import Data'}
            </Button>
            {jsonContent && (
              <Button 
                variant="outline" 
                onClick={() => setJsonContent('')}
              >
                Clear
              </Button>
            )}
          </div>

          {/* Import Result */}
          {importResult && (
            <Alert className={importResult.errors ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}>
              <div className="flex items-center gap-2">
                {importResult.errors ? (
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
                <AlertDescription className={importResult.errors ? 'text-amber-800' : 'text-green-800'}>
                  <div>
                    <strong>Import completed:</strong> {importResult.imported} new records imported, 
                    {' '}{importResult.updated} records updated across {importResult.yearsProcessed} years.
                  </div>
                  {importResult.errors && (
                    <div className="mt-2">
                      <strong>Errors:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {importResult.errors.map((error: string, index: number) => (
                          <li key={index} className="text-sm">{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {importMutation.isError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Import failed:</strong> {importMutation.error?.message || 'Unknown error occurred'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Current Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Current Work Hours Data
          </CardTitle>
          <CardDescription>
            Manage your imported work hours data. This is used for cycle creation suggestions and anomaly detection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading work hours data...</div>
          ) : Object.keys(groupedByYear).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No work hours data imported yet.</p>
              <p className="text-sm mt-1">Import your AI-generated JSON data above to get started.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedByYear)
                .sort(([a], [b]) => parseInt(b) - parseInt(a)) // Sort years descending
                .map(([year, months]) => (
                  <div key={year}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{year}</h3>
                        <Badge variant="secondary">{months.length} months</Badge>
                        <span className="text-sm text-gray-500">
                          Total: {months.reduce((sum: number, m: any) => sum + m.workHours, 0)} hours
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteYear(parseInt(year))}
                        disabled={deleteYearMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete {year}
                      </Button>
                    </div>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead className="text-right">Weekdays</TableHead>
                          <TableHead className="text-right">Work Hours</TableHead>
                          <TableHead className="text-right">Hours/Day</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {months
                          .sort((a: any, b: any) => a.monthNumber - b.monthNumber)
                          .map((month: any) => (
                            <TableRow key={`${year}-${month.monthNumber}`}>
                              <TableCell className="font-medium">{month.month}</TableCell>
                              <TableCell className="text-right">{month.weekdays}</TableCell>
                              <TableCell className="text-right font-mono">{month.workHours}</TableCell>
                              <TableCell className="text-right text-gray-500">
                                {(month.workHours / month.weekdays).toFixed(1)}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
