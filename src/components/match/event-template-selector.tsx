'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Clock, 
  TrendingUp, 
  FileText,
  Star,
  Copy,
  Filter
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { eventTemplateService, EventTemplate, EventTemplateCategory } from '@/lib/services/event-template-service';
import { EventType } from '@/lib/types/entities';

interface EventTemplateSelectorProps {
  onTemplateSelected: (template: EventTemplate) => void;
  selectedEventType?: EventType;
  className?: string;
}

export function EventTemplateSelector({ 
  onTemplateSelected, 
  selectedEventType,
  className 
}: EventTemplateSelectorProps) {
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [categories, setCategories] = useState<EventTemplateCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTemplates, setFilteredTemplates] = useState<EventTemplate[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'name'>('popular');
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, activeCategory, selectedEventType, sortBy]);

  const loadTemplates = () => {
    const allTemplates = eventTemplateService.getAllTemplates();
    const allCategories = eventTemplateService.getCategories();
    
    setTemplates(allTemplates);
    setCategories(allCategories);
  };

  const filterTemplates = () => {
    let filtered = [...templates];

    // Filter by search query
    if (searchQuery) {
      filtered = eventTemplateService.searchTemplates(searchQuery);
    }

    // Filter by category
    if (activeCategory !== 'all') {
      filtered = filtered.filter(template => template.category === activeCategory);
    }

    // Filter by event type if specified
    if (selectedEventType) {
      filtered = filtered.filter(template => template.eventType === selectedEventType);
    }

    // Sort templates
    switch (sortBy) {
      case 'popular':
        filtered.sort((a, b) => b.usageCount - a.usageCount);
        break;
      case 'recent':
        filtered.sort((a, b) => {
          const aTime = a.lastUsed?.getTime() || 0;
          const bTime = b.lastUsed?.getTime() || 0;
          return bTime - aTime;
        });
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    setFilteredTemplates(filtered);
  };

  const handleTemplateSelect = (template: EventTemplate) => {
    onTemplateSelected(template);
    toast({
      title: "Template Selected",
      description: `Using template: ${template.name}`,
      variant: "default"
    });
  };

  const handleCopyTemplate = (template: EventTemplate) => {
    navigator.clipboard.writeText(JSON.stringify(template, null, 2));
    toast({
      title: "Template Copied",
      description: "Template data copied to clipboard",
      variant: "default"
    });
  };

  const getEventTypeIcon = (eventType: EventType): string => {
    switch (eventType) {
      case EventType.GOAL:
      case EventType.OWN_GOAL:
      case EventType.PENALTY_GOAL:
        return '⚽';
      case EventType.YELLOW_CARD:
        return '🟨';
      case EventType.RED_CARD:
        return '🟥';
      case EventType.SUBSTITUTION:
        return '🔄';
      case EventType.FOUL:
        return '⚠️';
      case EventType.OFFSIDE:
        return '📐';
      case EventType.CORNER_KICK:
        return '📐';
      default:
        return '📋';
    }
  };

  const getEventTypeColor = (eventType: EventType): string => {
    switch (eventType) {
      case EventType.GOAL:
      case EventType.OWN_GOAL:
      case EventType.PENALTY_GOAL:
        return 'bg-green-100 text-green-800 border-green-200';
      case EventType.YELLOW_CARD:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case EventType.RED_CARD:
        return 'bg-red-100 text-red-800 border-red-200';
      case EventType.SUBSTITUTION:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case EventType.FOUL:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Event Templates
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Select a template to quickly create consistent events
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'popular' | 'recent' | 'name')}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="popular">Most Popular</option>
              <option value="recent">Recently Used</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>
        </div>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">All</TabsTrigger>
            {categories.map((category) => (
              <TabsTrigger key={category.id} value={category.id}>
                <span className="mr-1">{category.icon}</span>
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getEventTypeIcon(template.eventType)}</span>
                      <h4 className="font-medium text-sm">{template.name}</h4>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyTemplate(template);
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-3">
                    {template.description}
                  </p>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getEventTypeColor(template.eventType)}`}
                    >
                      {template.eventType.replace('_', ' ')}
                    </Badge>
                    {template.isImportant && (
                      <Badge variant="outline" className="text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        Important
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {template.usageCount} uses
                    </div>
                    {template.lastUsed && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {template.lastUsed.toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No templates found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
