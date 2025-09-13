'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Minus, 
  UserPlus, 
  UserMinus, 
  AlertTriangle, 
  Target,
  Clock,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMatchEventService } from '@/hooks/use-match-event-service';
import { EventType } from '@/lib/types/entities';

interface QuickEventActionsProps {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  homePlayers: Array<{ id: string; name: string; position: string; }>;
  awayPlayers: Array<{ id: string; name: string; position: string; }>;
  onEventRecorded?: () => void;
}

export function QuickEventActions({ 
  matchId, 
  homeTeamId, 
  awayTeamId, 
  homePlayers, 
  awayPlayers,
  onEventRecorded 
}: QuickEventActionsProps) {
  const [isRecording, setIsRecording] = useState(false);
  const { toast } = useToast();
  const { recordEvent } = useMatchEventService();

  const handleQuickEvent = async (eventType: EventType, teamId: string, playerId?: string) => {
    if (isRecording) return;
    
    setIsRecording(true);
    try {
      await recordEvent({
        match_id: matchId,
        event_type: eventType,
        team_id: teamId,
        player_id: playerId,
        minute: new Date().getMinutes(), // This should be actual match minute
        description: `${eventType.replace('_', ' ')} recorded via quick action`,
        is_important: true
      });
      
      toast({
        title: "Event Recorded",
        description: `${eventType.replace('_', ' ')} has been recorded successfully`,
        variant: "default"
      });
      
      onEventRecorded?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record event. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRecording(false);
    }
  };

  const quickActions = [
    {
      title: "Goals",
      actions: [
        {
          label: "Home Goal",
          icon: <Plus className="h-4 w-4" />,
          eventType: EventType.GOAL,
          teamId: homeTeamId,
          color: "bg-green-500 hover:bg-green-600"
        },
        {
          label: "Away Goal", 
          icon: <Plus className="h-4 w-4" />,
          eventType: EventType.GOAL,
          teamId: awayTeamId,
          color: "bg-green-500 hover:bg-green-600"
        },
        {
          label: "Own Goal",
          icon: <Minus className="h-4 w-4" />,
          eventType: EventType.OWN_GOAL,
          teamId: homeTeamId, // This should be dynamic based on context
          color: "bg-red-500 hover:bg-red-600"
        }
      ]
    },
    {
      title: "Cards",
      actions: [
        {
          label: "Yellow Card",
          icon: <AlertTriangle className="h-4 w-4" />,
          eventType: EventType.YELLOW_CARD,
          teamId: homeTeamId, // This should be dynamic
          color: "bg-yellow-500 hover:bg-yellow-600"
        },
        {
          label: "Red Card",
          icon: <AlertTriangle className="h-4 w-4" />,
          eventType: EventType.RED_CARD,
          teamId: homeTeamId, // This should be dynamic
          color: "bg-red-500 hover:bg-red-600"
        }
      ]
    },
    {
      title: "Substitutions",
      actions: [
        {
          label: "Home Sub",
          icon: <UserPlus className="h-4 w-4" />,
          eventType: EventType.SUBSTITUTION,
          teamId: homeTeamId,
          color: "bg-blue-500 hover:bg-blue-600"
        },
        {
          label: "Away Sub",
          icon: <UserPlus className="h-4 w-4" />,
          eventType: EventType.SUBSTITUTION,
          teamId: awayTeamId,
          color: "bg-blue-500 hover:bg-blue-600"
        }
      ]
    },
    {
      title: "Other Events",
      actions: [
        {
          label: "Foul",
          icon: <Target className="h-4 w-4" />,
          eventType: EventType.FOUL,
          teamId: homeTeamId, // This should be dynamic
          color: "bg-orange-500 hover:bg-orange-600"
        },
        {
          label: "Offside",
          icon: <Clock className="h-4 w-4" />,
          eventType: EventType.OFFSIDE,
          teamId: homeTeamId, // This should be dynamic
          color: "bg-purple-500 hover:bg-purple-600"
        }
      ]
    }
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Quick Event Actions
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Rapidly record common match events with one click
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {quickActions.map((category) => (
          <div key={category.title} className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              {category.title}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {category.actions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className={`${action.color} text-white border-0`}
                  onClick={() => handleQuickEvent(action.eventType, action.teamId)}
                  disabled={isRecording}
                >
                  {action.icon}
                  <span className="ml-2">{action.label}</span>
                </Button>
              ))}
            </div>
          </div>
        ))}
        
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Quick actions record events with default values</span>
            <Badge variant="secondary">
              {isRecording ? "Recording..." : "Ready"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
