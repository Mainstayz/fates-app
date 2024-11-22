
export interface TimelineItemOriginal {
    id: string;
    title: string;
    startTime: Date;
    endTime?: Date;
    tags?: string[];
    color?: string;
}


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

export interface TimelineData {
    groups: TimelineGroup[];
    items: TimelineItem[];
}
