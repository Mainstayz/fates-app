export interface TimelineItem {
    id: string;
    group?: string;
    content: string;
    start: Date;
    end?: Date;
    className?: string;
    // extra fields
    created_at?: Date;
    priority?: number;
    matter_type?: number;
    matter_sub_type?: number;
    description?: string;
    tags?: string[];
    // type use vis-timeline type
    type?: string;
}

export interface TimelineItemInternal extends TimelineItem {
    _raw?: {
        content: string;
        tags?: string[];
    };
}

export interface TimelineGroup {
    id: string;
    content: string;
}

export interface TimelineData {
    groups: TimelineGroup[];
    items: TimelineItem[];
}

export enum Priority {
    High = 1,
    Medium = 0,
    Low = -1,
}

export enum TaskStatus {
    Active = 1,
    Stopped = 0,
    Archived = -1,
}
