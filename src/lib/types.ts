export interface TimelineGroup {
    id: string;
    content: string;
}

export interface TimelineItem {
    id: string;
    group?: string;
    content: string;
    start: string;
    end?: string;
    tags?: string[];
    className?: string;
}
