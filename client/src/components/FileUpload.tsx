import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, CloudUpload, Info, AlertCircle } from "lucide-react";
import { getApiUrl } from "@/lib/api";
import NoCampaignSelected from "@/components/NoCampaignSelected";

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
      console.log('Invalidating queries after CSV upload...');
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] });
      console.log('Queries invalidated, StudentTable should refresh now');
    },
    onError: (error: any) => {
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
      if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
      } else {
        toast({
          title: "Invalid File",
          description: "Please upload a CSV file.",
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
            Upload Student Data
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Campaign Upload
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            dragActive
              ? "border-primary bg-blue-50"
              : "border-gray-300 hover:border-primary"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <CloudUpload className="text-4xl text-gray-400 mb-4 h-16 w-16 mx-auto" />
          {file ? (
            <>
              <p className="text-lg font-medium text-gray-700 mb-2">
                Selected: {file.name}
              </p>
              <p className="text-sm text-gray-500">
                Size: {(file.size / 1024).toFixed(1)} KB
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-gray-700 mb-2">
                Drop your CSV file here
              </p>
              <p className="text-sm text-gray-500 mb-4">or click to browse files</p>
            </>
          )}
          <p className="text-xs text-gray-400">
            Required columns: Name, Email, Section, Subject, Message
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

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
