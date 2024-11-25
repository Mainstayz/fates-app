import { load } from '@tauri-apps/plugin-store';

interface TagPriority {
    tag: string;
    color: string;
    count: number;
}

interface TagPriorityData {
    priorities: TagPriority[];
}

// 存储实例
let store: Awaited<ReturnType<typeof load>>;

class TagPriorityStore {
    // 初始化加载标签优先级
    async initialize() {
        try {
            // 加载或创建存储
            store = await load('tag-priorities.json', { autoSave: false });

            // 检查是否需要初始化数据
            const data = await store.get<TagPriorityData>('priorities');
            if (!data) {
                await store.set('priorities', { priorities: [] });
                await store.save();
            }
        } catch (error) {
            console.error('Failed to initialize tag priority store:', error);
        }
    }

    async getPriorities(): Promise<TagPriority[]> {
        if (!store) {
            await this.initialize();
        }
        const data = await store.get<TagPriorityData>('priorities');
        return data?.priorities || [];
    }

    async addPriority(tag: string, color: string): Promise<void> {
        if (!store) {
            await this.initialize();
        }

        try {
            const priorities = await this.getPriorities();
            const existingPriority = priorities.find(p => p.tag === tag);

            if (existingPriority) {
                existingPriority.count++;
                existingPriority.color = color; // 更新最新的颜色选择
            } else {
                priorities.push({ tag, color, count: 1 });
            }

            await store.set('priorities', { priorities });
            await store.save();
        } catch (error) {
            console.error('Failed to save tag priority:', error);
        }
    }

    async getMostUsedColorForTag(tag: string): Promise<string | null> {
        const priorities = await this.getPriorities();
        const priority = priorities.find(p => p.tag === tag);
        return priority?.color || null;
    }
}

export const tagPriorityStore = new TagPriorityStore();

// 初始化
tagPriorityStore.initialize().catch(error => {
    console.error('Failed to initialize tag priority store:', error);
});
