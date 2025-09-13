import { EventType } from '@/lib/types/entities';

export interface EventTemplate {
  id: string;
  name: string;
  eventType: EventType;
  description: string;
  defaultValues: {
    minute?: number;
    description?: string;
    isImportant?: boolean;
    coordinates?: { x: number; y: number };
    metadata?: Record<string, any>;
  };
  requiredFields: string[];
  optionalFields: string[];
  category: 'goals' | 'cards' | 'substitutions' | 'fouls' | 'other';
  tags: string[];
  usageCount: number;
  lastUsed?: Date;
  createdBy: string;
  createdAt: Date;
  isPublic: boolean;
}

export interface EventTemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  templates: EventTemplate[];
}

export class EventTemplateService {
  private static instance: EventTemplateService;
  private templates: Map<string, EventTemplate> = new Map();
  private categories: Map<string, EventTemplateCategory> = new Map();

  private constructor() {
    this.initializeDefaultTemplates();
  }

  public static getInstance(): EventTemplateService {
    if (!EventTemplateService.instance) {
      EventTemplateService.instance = new EventTemplateService();
    }
    return EventTemplateService.instance;
  }

  private initializeDefaultTemplates(): void {
    const defaultTemplates: EventTemplate[] = [
      // Goal Templates
      {
        id: 'goal-open-play',
        name: 'Open Play Goal',
        eventType: EventType.GOAL,
        description: 'Goal scored from open play',
        defaultValues: {
          isImportant: true,
          description: 'Goal from open play'
        },
        requiredFields: ['player_id', 'team_id', 'minute'],
        optionalFields: ['coordinates', 'assist_player_id'],
        category: 'goals',
        tags: ['goal', 'open-play', 'scoring'],
        usageCount: 0,
        createdBy: 'system',
        createdAt: new Date(),
        isPublic: true
      },
      {
        id: 'goal-penalty',
        name: 'Penalty Goal',
        eventType: EventType.PENALTY_GOAL,
        description: 'Goal scored from penalty kick',
        defaultValues: {
          isImportant: true,
          description: 'Goal from penalty kick'
        },
        requiredFields: ['player_id', 'team_id', 'minute'],
        optionalFields: ['coordinates'],
        category: 'goals',
        tags: ['goal', 'penalty', 'scoring'],
        usageCount: 0,
        createdBy: 'system',
        createdAt: new Date(),
        isPublic: true
      },
      {
        id: 'goal-free-kick',
        name: 'Free Kick Goal',
        eventType: EventType.GOAL,
        description: 'Goal scored from free kick',
        defaultValues: {
          isImportant: true,
          description: 'Goal from free kick'
        },
        requiredFields: ['player_id', 'team_id', 'minute'],
        optionalFields: ['coordinates', 'assist_player_id'],
        category: 'goals',
        tags: ['goal', 'free-kick', 'scoring'],
        usageCount: 0,
        createdBy: 'system',
        createdAt: new Date(),
        isPublic: true
      },

      // Card Templates
      {
        id: 'yellow-card-foul',
        name: 'Yellow Card - Foul',
        eventType: EventType.YELLOW_CARD,
        description: 'Yellow card for foul',
        defaultValues: {
          description: 'Yellow card for foul'
        },
        requiredFields: ['player_id', 'team_id', 'minute'],
        optionalFields: ['coordinates', 'related_player_id'],
        category: 'cards',
        tags: ['yellow-card', 'foul', 'discipline'],
        usageCount: 0,
        createdBy: 'system',
        createdAt: new Date(),
        isPublic: true
      },
      {
        id: 'yellow-card-dissent',
        name: 'Yellow Card - Dissent',
        eventType: EventType.YELLOW_CARD,
        description: 'Yellow card for dissent',
        defaultValues: {
          description: 'Yellow card for dissent'
        },
        requiredFields: ['player_id', 'team_id', 'minute'],
        optionalFields: ['coordinates'],
        category: 'cards',
        tags: ['yellow-card', 'dissent', 'discipline'],
        usageCount: 0,
        createdBy: 'system',
        createdAt: new Date(),
        isPublic: true
      },
      {
        id: 'red-card-serious-foul',
        name: 'Red Card - Serious Foul',
        eventType: EventType.RED_CARD,
        description: 'Red card for serious foul play',
        defaultValues: {
          isImportant: true,
          description: 'Red card for serious foul play'
        },
        requiredFields: ['player_id', 'team_id', 'minute'],
        optionalFields: ['coordinates', 'related_player_id'],
        category: 'cards',
        tags: ['red-card', 'serious-foul', 'discipline'],
        usageCount: 0,
        createdBy: 'system',
        createdAt: new Date(),
        isPublic: true
      },

      // Substitution Templates
      {
        id: 'substitution-tactical',
        name: 'Tactical Substitution',
        eventType: EventType.SUBSTITUTION,
        description: 'Tactical substitution',
        defaultValues: {
          description: 'Tactical substitution'
        },
        requiredFields: ['player_id', 'team_id', 'minute', 'related_player_id'],
        optionalFields: ['coordinates'],
        category: 'substitutions',
        tags: ['substitution', 'tactical', 'change'],
        usageCount: 0,
        createdBy: 'system',
        createdAt: new Date(),
        isPublic: true
      },
      {
        id: 'substitution-injury',
        name: 'Injury Substitution',
        eventType: EventType.SUBSTITUTION,
        description: 'Substitution due to injury',
        defaultValues: {
          description: 'Substitution due to injury'
        },
        requiredFields: ['player_id', 'team_id', 'minute', 'related_player_id'],
        optionalFields: ['coordinates'],
        category: 'substitutions',
        tags: ['substitution', 'injury', 'change'],
        usageCount: 0,
        createdBy: 'system',
        createdAt: new Date(),
        isPublic: true
      },

      // Foul Templates
      {
        id: 'foul-standard',
        name: 'Standard Foul',
        eventType: EventType.FOUL,
        description: 'Standard foul committed',
        defaultValues: {
          description: 'Foul committed'
        },
        requiredFields: ['player_id', 'team_id', 'minute'],
        optionalFields: ['coordinates', 'related_player_id'],
        category: 'fouls',
        tags: ['foul', 'infraction'],
        usageCount: 0,
        createdBy: 'system',
        createdAt: new Date(),
        isPublic: true
      },
      {
        id: 'foul-handball',
        name: 'Handball Foul',
        eventType: EventType.FOUL,
        description: 'Handball foul',
        defaultValues: {
          description: 'Handball foul'
        },
        requiredFields: ['player_id', 'team_id', 'minute'],
        optionalFields: ['coordinates'],
        category: 'fouls',
        tags: ['foul', 'handball', 'infraction'],
        usageCount: 0,
        createdBy: 'system',
        createdAt: new Date(),
        isPublic: true
      },

      // Other Event Templates
      {
        id: 'offside-standard',
        name: 'Offside',
        eventType: EventType.OFFSIDE,
        description: 'Offside offense',
        defaultValues: {
          description: 'Offside offense'
        },
        requiredFields: ['player_id', 'team_id', 'minute'],
        optionalFields: ['coordinates'],
        category: 'other',
        tags: ['offside', 'infraction'],
        usageCount: 0,
        createdBy: 'system',
        createdAt: new Date(),
        isPublic: true
      },
      {
        id: 'corner-kick',
        name: 'Corner Kick',
        eventType: EventType.CORNER_KICK,
        description: 'Corner kick awarded',
        defaultValues: {
          description: 'Corner kick awarded'
        },
        requiredFields: ['team_id', 'minute'],
        optionalFields: ['coordinates'],
        category: 'other',
        tags: ['corner-kick', 'set-piece'],
        usageCount: 0,
        createdBy: 'system',
        createdAt: new Date(),
        isPublic: true
      }
    ];

    // Initialize templates
    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });

    // Initialize categories
    this.initializeCategories();
  }

  private initializeCategories(): void {
    const categories: EventTemplateCategory[] = [
      {
        id: 'goals',
        name: 'Goals',
        description: 'Templates for goal-related events',
        icon: '⚽',
        templates: Array.from(this.templates.values()).filter(t => t.category === 'goals')
      },
      {
        id: 'cards',
        name: 'Cards',
        description: 'Templates for disciplinary events',
        icon: '🟨',
        templates: Array.from(this.templates.values()).filter(t => t.category === 'cards')
      },
      {
        id: 'substitutions',
        name: 'Substitutions',
        description: 'Templates for player substitutions',
        icon: '🔄',
        templates: Array.from(this.templates.values()).filter(t => t.category === 'substitutions')
      },
      {
        id: 'fouls',
        name: 'Fouls',
        description: 'Templates for foul-related events',
        icon: '⚠️',
        templates: Array.from(this.templates.values()).filter(t => t.category === 'fouls')
      },
      {
        id: 'other',
        name: 'Other Events',
        description: 'Templates for other match events',
        icon: '📋',
        templates: Array.from(this.templates.values()).filter(t => t.category === 'other')
      }
    ];

    categories.forEach(category => {
      this.categories.set(category.id, category);
    });
  }

  // Template Management Methods
  public getAllTemplates(): EventTemplate[] {
    return Array.from(this.templates.values());
  }

  public getTemplateById(id: string): EventTemplate | undefined {
    return this.templates.get(id);
  }

  public getTemplatesByCategory(category: string): EventTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  public getTemplatesByEventType(eventType: EventType): EventTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.eventType === eventType);
  }

  public getCategories(): EventTemplateCategory[] {
    return Array.from(this.categories.values());
  }

  public getCategoryById(id: string): EventTemplateCategory | undefined {
    return this.categories.get(id);
  }

  public searchTemplates(query: string): EventTemplate[] {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.templates.values()).filter(template =>
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.description.toLowerCase().includes(lowercaseQuery) ||
      template.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  public getPopularTemplates(limit: number = 10): EventTemplate[] {
    return Array.from(this.templates.values())
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  public getRecentlyUsedTemplates(limit: number = 10): EventTemplate[] {
    return Array.from(this.templates.values())
      .filter(t => t.lastUsed)
      .sort((a, b) => (b.lastUsed?.getTime() || 0) - (a.lastUsed?.getTime() || 0))
      .slice(0, limit);
  }

  // Template Usage Tracking
  public recordTemplateUsage(templateId: string): void {
    const template = this.templates.get(templateId);
    if (template) {
      template.usageCount++;
      template.lastUsed = new Date();
    }
  }

  // Template Creation and Management
  public createTemplate(template: Omit<EventTemplate, 'id' | 'usageCount' | 'createdAt'>): EventTemplate {
    const newTemplate: EventTemplate = {
      ...template,
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      usageCount: 0,
      createdAt: new Date()
    };

    this.templates.set(newTemplate.id, newTemplate);
    
    // Update category
    const category = this.categories.get(newTemplate.category);
    if (category) {
      category.templates.push(newTemplate);
    }

    return newTemplate;
  }

  public updateTemplate(id: string, updates: Partial<EventTemplate>): EventTemplate | null {
    const template = this.templates.get(id);
    if (!template) return null;

    const updatedTemplate = { ...template, ...updates };
    this.templates.set(id, updatedTemplate);

    // Update category
    const category = this.categories.get(template.category);
    if (category) {
      const index = category.templates.findIndex(t => t.id === id);
      if (index !== -1) {
        category.templates[index] = updatedTemplate;
      }
    }

    return updatedTemplate;
  }

  public deleteTemplate(id: string): boolean {
    const template = this.templates.get(id);
    if (!template) return false;

    // Remove from category
    const category = this.categories.get(template.category);
    if (category) {
      category.templates = category.templates.filter(t => t.id !== id);
    }

    return this.templates.delete(id);
  }

  // Template Application
  public applyTemplate(templateId: string, customValues: Record<string, any> = {}): Record<string, any> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template with id ${templateId} not found`);
    }

    // Record usage
    this.recordTemplateUsage(templateId);

    // Merge template defaults with custom values
    return {
      event_type: template.eventType,
      ...template.defaultValues,
      ...customValues
    };
  }

  // Template Validation
  public validateTemplateData(templateId: string, data: Record<string, any>): { isValid: boolean; errors: string[] } {
    const template = this.templates.get(templateId);
    if (!template) {
      return { isValid: false, errors: [`Template with id ${templateId} not found`] };
    }

    const errors: string[] = [];
    
    // Check required fields
    template.requiredFields.forEach(field => {
      if (!data[field] && data[field] !== 0) {
        errors.push(`Required field '${field}' is missing`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const eventTemplateService = EventTemplateService.getInstance();
