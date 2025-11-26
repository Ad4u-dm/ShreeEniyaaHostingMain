'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, FileText, Calendar, Loader2 } from 'lucide-react';

interface ReportData {
  userName: string;
  paymentMade: number;
  staffName: string;
  invoiceNumber?: string;
  groupName?: string;
}

export default function StaffReportsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [totalCollection, setTotalCollection] = useState(0);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/daily-invoices?date=${selectedDate}`);
      if (response.ok) {
        const data = await response.json();
        setReportData(data.report || []);
        const total = data.report.reduce((sum: number, item: ReportData) => sum + item.paymentMade, 0);
        setTotalCollection(total);
      } else {
        alert('Failed to fetch report data');
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      alert('Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      const response = await fetch(`/api/reports/daily-invoices/pdf?date=${selectedDate}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `daily-report-${selectedDate}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        alert('Failed to download PDF: ' + (errorData.details || errorData.error));
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const formatIndianNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Daily Collection Report</h1>
          <p className="text-slate-600 mt-1">View and download daily invoice collection reports</p>
        </div>
      </div>

      {/* Filter Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select Date
          </CardTitle>
          <CardDescription>Choose a date to view the collection report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 max-w-xs">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Report Date
              </label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <Button
              onClick={fetchReport}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  View Report
                </>
              )}
            </Button>
            <Button
              onClick={downloadPDF}
              disabled={downloadingPDF || reportData.length === 0}
              variant="outline"
            >
              {downloadingPDF ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Summary */}
      {reportData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Collection</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ₹{formatIndianNumber(totalCollection)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Report Date</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Date(selectedDate).toLocaleDateString('en-IN')}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Table */}
      {reportData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Collection Details</CardTitle>
            <CardDescription>List of all invoices created on {selectedDate}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-300 bg-slate-100">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">S.No</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Invoice No</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Customer Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Group Name</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Collected By</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((item, index) => (
                    <tr key={index} className={`border-b border-slate-100 hover:bg-slate-50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                      <td className="py-3 px-4 text-slate-600">{index + 1}</td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{item.invoiceNumber || 'N/A'}</td>
                      <td className="py-3 px-4 text-slate-900">{item.userName}</td>
                      <td className="py-3 px-4 text-slate-700">{item.groupName || 'N/A'}</td>
                      <td className="py-3 px-4 text-right text-green-600 font-medium">
                        ₹{formatIndianNumber(item.paymentMade)}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{item.staffName}</td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50 border-t-2 border-blue-200 font-bold">
                    <td colSpan={4} className="py-3 px-4 text-slate-900">Total Collection</td>
                    <td className="py-3 px-4 text-right text-green-600 text-lg">
                      ₹{formatIndianNumber(totalCollection)}
                    </td>
                    <td className="py-3 px-4"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && reportData.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-slate-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium">No report data available</p>
              <p className="text-sm mt-1">Select a date and click "View Report" to load collection data</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
