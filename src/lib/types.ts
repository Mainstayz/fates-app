export interface TimelineGroup {
    id: number;
    content: string;
}

export interface TimelineItem {
    id: number;
    group: number;
    content: string;
    start: string | Date;
    end?: string | Date;
}
