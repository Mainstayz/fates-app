export interface Matter {
    id: string;
    title: string;
    description?: string;
    tags?: string;
    start_time: Date;
    end_time: Date;
    priority: number;
    created_at: Date;
    updated_at: Date;
}

export interface NotificationRecord {
    id: string;
    title: string;
    content: string;
    type_: number;
    status: number;
    related_task_id?: string;
    created_at: Date;
    read_at?: Date;
    expire_at?: Date;
    action_url?: string;
    reserved_1?: string;
    reserved_2?: string;
}
