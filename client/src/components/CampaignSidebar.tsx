import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Campaign {
  id: number;
  name: string;
  description: string;
  emoji: string;
  createdAt: string;
}

interface CampaignSidebarProps {
  selectedCampaign: number | null;
  onSelectCampaign: (campaignId: number | null) => void;
}

export default function CampaignSidebar({ selectedCampaign, onSelectCampaign }: CampaignSidebarProps) {
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignEmoji, setNewCampaignEmoji] = useState("📧");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["/api/campaigns"],
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: { name: string; emoji: string; description?: string }) => {
      return apiRequest("POST", "/api/campaigns", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Campaign created successfully!",
      });
      setShowNewCampaign(false);
      setNewCampaignName("");
      setNewCampaignEmoji("📧");
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create campaign",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (campaignId: number) => {
      return apiRequest("DELETE", `/api/campaigns/${campaignId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Campaign deleted successfully!",
      });
      onSelectCampaign(null);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete campaign",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateCampaign = () => {
    if (!newCampaignName.trim()) {
      toast({
        title: "Validation Error",
        description: "Campaign name is required.",
        variant: "destructive",
      });
      return;
    }

    createCampaignMutation.mutate({
      name: newCampaignName.trim(),
      emoji: newCampaignEmoji,
      description: `Email campaign for ${newCampaignName.trim()}`,
    });
  };

  const emojiOptions = ["📧", "🎓", "🎉", "📝", "💼", "🏆", "📚", "🎯", "✨", "🚀"];

  if (isLoading) {
    return (
      <div className="w-80 bg-white border-r border-gray-200 p-4">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <MessageSquare className="mr-2 h-5 w-5 text-primary" />
          Campaigns
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNewCampaign(!showNewCampaign)}
          className="p-2"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Global View Option */}
      <Card 
        className={`mb-4 cursor-pointer transition-all ${
          selectedCampaign === null 
            ? 'ring-2 ring-primary bg-blue-50' 
            : 'hover:bg-gray-50'
        }`}
        onClick={() => onSelectCampaign(null)}
      >
        <CardContent className="p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-lg font-bold">
              📊
            </div>
            <div className="ml-3">
              <h3 className="font-medium text-gray-900">All Campaigns</h3>
              <p className="text-sm text-gray-500">Global overview</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New Campaign Form */}
      {showNewCampaign && (
        <Card className="mb-4 border-2 border-dashed border-primary">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <select
                  value={newCampaignEmoji}
                  onChange={(e) => setNewCampaignEmoji(e.target.value)}
                  className="text-lg p-1 border rounded"
                >
                  {emojiOptions.map(emoji => (
                    <option key={emoji} value={emoji}>{emoji}</option>
                  ))}
                </select>
                <Input
                  placeholder="Campaign name"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  className="flex-1"
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={handleCreateCampaign}
                  disabled={createCampaignMutation.isPending}
                  size="sm"
                  className="flex-1"
                >
                  {createCampaignMutation.isPending ? "Creating..." : "Create"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowNewCampaign(false)}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaign List */}
      <div className="space-y-3">
        {campaigns?.map((campaign: Campaign) => (
          <Card 
            key={campaign.id}
            className={`cursor-pointer transition-all ${
              selectedCampaign === campaign.id 
                ? 'ring-2 ring-primary bg-blue-50' 
                : 'hover:bg-gray-50'
            }`}
            onClick={() => onSelectCampaign(campaign.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg">
                    {campaign.emoji}
                  </div>
                  <div className="ml-3">
                    <h3 className="font-medium text-gray-900">{campaign.name}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(campaign.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCampaignMutation.mutate(campaign.id);
                  }}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {campaigns?.length === 0 && !showNewCampaign && (
        <div className="text-center py-8 text-gray-500">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-sm">No campaigns yet</p>
          <p className="text-xs">Create your first campaign to get started</p>
        </div>
      )}
    </div>
  );
}