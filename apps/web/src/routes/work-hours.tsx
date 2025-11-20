import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getMonthlyWorkHoursForYear, type MonthlyWorkHoursData } from '@/lib/work-hours';

export default function WorkHoursPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const [year, setYear] = useState(currentYear);
  const [monthlyData, setMonthlyData] = useState<MonthlyWorkHoursData[]>([]);

  useEffect(() => {
    const data = getMonthlyWorkHoursForYear(year);
    setMonthlyData(data);
  }, [year]);

  const totalWeekdays = monthlyData.reduce((sum, m) => sum + m.weekdays, 0);
  const totalHours = monthlyData.reduce((sum, m) => sum + m.workHours, 0);

  const handleYearChange = (newYear: number) => {
    if (newYear >= 1900 && newYear <= 2500) {
      setYear(newYear);
    }
  };

  const handlePrevYear = () => {
    handleYearChange(year - 1);
  };

  const handleNextYear = () => {
    handleYearChange(year + 1);
  };

  const handleYearInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') return;
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      handleYearChange(numValue);
    }
  };

  const handleYearInputKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const value = (e.target as HTMLInputElement).value;
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue)) {
        handleYearChange(numValue);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-4xl">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                  Weekdays & Work Hours
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400 text-sm">
                  Automatic calendar for any year
                </CardDescription>
                <div className="mt-2">
                  <span className="text-xs uppercase tracking-wider px-3 py-1 rounded-full border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 inline-block">
                    Assumes 8 hours per weekday
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-full px-2 py-1 border border-slate-200 dark:border-slate-700">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrevYear}
                    className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    title="Previous year"
                  >
                    &#x25C0;
                  </Button>
                  <Input
                    type="number"
                    min="1900"
                    max="2500"
                    value={year}
                    onChange={handleYearInputChange}
                    onKeyUp={handleYearInputKeyUp}
                    className="w-24 text-center bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-full h-8 px-3 text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNextYear}
                    className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    title="Next year"
                  >
                    &#x25B6;
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    Current year: {currentYear}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    Weekends ignored for work hours
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 dark:border-slate-800">
                    <TableHead className="text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-medium">
                      Month
                    </TableHead>
                    <TableHead className="text-right text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-medium">
                      Weekdays
                    </TableHead>
                    <TableHead className="text-right text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-medium">
                      Work Hours
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyData.map((month, index) => {
                    const isCurrentMonth = year === currentYear && month.monthNumber === currentMonth;
                    return (
                      <TableRow
                        key={month.monthNumber}
                        className={`border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                          isCurrentMonth
                            ? 'bg-blue-50 dark:bg-blue-950/30 border-l-4 border-l-blue-500 dark:border-l-blue-400'
                            : index % 2 === 0
                            ? 'bg-white dark:bg-slate-900'
                            : 'bg-slate-50/50 dark:bg-slate-800/30'
                        }`}
                      >
                        <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                          {month.month}
                        </TableCell>
                        <TableCell className="text-right text-slate-700 dark:text-slate-300">
                          {month.weekdays}
                        </TableCell>
                        <TableCell className="text-right text-slate-700 dark:text-slate-300 font-mono">
                          {month.workHours}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter className="bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                  <TableRow>
                    <TableCell className="font-bold text-slate-900 dark:text-slate-100 pt-3 pb-3">
                      Total
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100 pt-3 pb-3">
                      {totalWeekdays}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100 pt-3 pb-3 font-mono">
                      {totalHours}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
            <div className="mt-4 flex flex-wrap justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span>
                Logic: counts Monday through Friday for each month and multiplies by 8 hours.
              </span>
              <span>
                Generated for {year} at {new Date().toLocaleTimeString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
