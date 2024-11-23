export interface TimelineItem {
    id: string;
    group?: string;
    content: string;
    start: string;
    end?: string;
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
