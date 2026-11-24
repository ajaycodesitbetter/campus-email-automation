import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, CloudUpload, Info, AlertCircle, FileText, CheckCircle2 } from "lucide-react";
import { getApiUrl } from "@/lib/api";
import NoCampaignSelected from "@/components/NoCampaignSelected";
import { motion, AnimatePresence } from "framer-motion";

interface FileUploadProps {
  campaignId?: number | null;
}

export default function FileUpload({ campaignId }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!campaignId) {
        throw new Error('Please select a campaign first');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('campaignId', campaignId.toString());

      const response = await fetch(getApiUrl('/api/upload-csv'), {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Upload error response:', error);

        // Handle detailed validation errors
        if (error.details && error.details.errors && error.details.errors.length > 0) {
          const errorList = error.details.errors.slice(0, 3).join('; ');
          throw new Error(`Validation failed: ${errorList}${error.details.errors.length > 3 ? '...' : ''}`);
        }

        throw new Error(error.error || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log('CSV Upload Success:', data);
      toast({
        title: "Success",
        description: `CSV processed successfully. ${data.recordCount} records imported.`,
      });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      console.log('Invalidating queries after CSV upload...');
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] });
      console.log('Queries invalidated, StudentTable should refresh now');
    },
    onError: (error: any) => {
      console.error('Upload mutation error:', error);
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const isValidFile = droppedFile.type === 'text/csv' ||
                        droppedFile.name.endsWith('.csv') ||
                        droppedFile.name.endsWith('.xlsx') ||
                        droppedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                        droppedFile.type === 'application/vnd.ms-excel';
      if (isValidFile) {
        setFile(droppedFile);
      } else {
        toast({
          title: "Invalid File",
          description: "Please upload a CSV or Excel file.",
          variant: "destructive",
        });
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (file) {
      if (!window.confirm("Import this file? It replaces the contacts and mail logs in this campaign. Other campaigns are not changed.")) return;
      uploadMutation.mutate(file);
    }
  };

  if (!campaignId) {
    return <NoCampaignSelected action="upload" />;
  }

  return (
    <Card className="shadow-sm border">
      <CardHeader className="border-b border-gray-200">
        <CardTitle className="flex items-center justify-between text-lg font-semibold text-gray-900">
          <div className="flex items-center">
            <Upload className="mr-2 text-primary h-5 w-5" />
            Import your people
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Campaign Upload
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <motion.div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 cursor-pointer ${
            dragActive
              ? "border-primary bg-blue-50 "
              : "border-gray-300 hover:border-primary hover:bg-gray-50"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          aria-label="Choose CSV or Excel file"
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
          onClick={() => fileInputRef.current?.click()}


          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            animate={{
              y: dragActive ? -5 : 0,
              scale: dragActive ? 1.1 : 1
            }}
            transition={{ duration: 0.2 }}
          >
            <CloudUpload className={`text-4xl mb-4 h-16 w-16 mx-auto transition-colors duration-300 ${
              dragActive ? "text-blue-500" : "text-gray-600"
            }`} />
          </motion.div>

          <AnimatePresence mode="wait">
            {file ? (
              <motion.div
                key="file-selected"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-center space-x-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  <p className="text-lg font-medium text-gray-700">
                    {file.name}
                  </p>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-sm text-gray-600">
                  Size: {(file.size / 1024).toFixed(1)} KB
                </p>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="h-1 bg-green-200 rounded-full mx-auto max-w-xs"
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="h-full bg-green-500 rounded-full"
                  />
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="no-file"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-lg font-medium text-gray-700 mb-2">
                  {dragActive ? "Release to upload" : "Drop your CSV or Excel file here"}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  {dragActive ? "" : "or click to browse files"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.p
            className="text-xs text-gray-400 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Supports: CSV, Excel (.xlsx) • Required columns: Name, Email, Section
          </motion.p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            onChange={handleFileSelect}
            className="hidden"
          />
        </motion.div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-600">
            <Info className="mr-2 h-4 w-4" />
            <span>Max file size: 10MB • Supports up to 1000 records</span>
          </div>
          <Button
            onClick={handleUpload}
            disabled={!file || uploadMutation.isPending}
            className="bg-primary hover:bg-blue-700 text-white"
          >
            {uploadMutation.isPending ? "Processing..." : "Process File"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
