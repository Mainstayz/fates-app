export interface TimelineItem {
    id: string;
    group?: string;
    content: string;
    description?: string;
    priority?: number;
    type?: number;
    start: string;
    end: string;
    created_at: string;
    tags?: string[];
    className?: string;
}

export interface TimelineItemInternal {
    id: string;
    group?: string;
    content: string;
    start: string;
    end?: string;
    className?: string;
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
