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
            console.log('🚀 初始化标签优先级存储...');
            // 加载或创建存储
            store = await load('tag-priorities.json', { autoSave: false });
            console.log('✅ 标签优先级存储加载成功');

            // 检查是否需要初始化数据
            const data = await store.get<TagPriorityData>('priorities');
            if (!data) {
                console.log('📝 首次初始化标签优先级数据');
                await store.set('priorities', { priorities: [] });
                await store.save();
                console.log('✅ 初始化数据保存成功');
            } else {
                console.log(`📊 当前存储的优先级数据：${JSON.stringify(data.priorities.length)} 条记录`);
            }
        } catch (error) {
            console.error('❌ 初始化标签优先级存储失败：', error);
        }
    }

    async getPriorities(): Promise<TagPriority[]> {
        if (!store) {
            console.log('⚠️ 存储未初始化，正在初始化...');
            await this.initialize();
        }
        const data = await store.get<TagPriorityData>('priorities');
        console.log(`📖 获取优先级数据：${data?.priorities?.length ?? 0} 条记录`);
        return data?.priorities || [];
    }

    async addPriority(tag: string, color: string): Promise<void> {
        if (!store) {
            console.log('⚠️ 存储未初始化，正在初始化...');
            await this.initialize();
        }

        try {
            console.log(`📝 添加/更新标签优先级 - 标签："${tag}", 颜色："${color}"`);
            const priorities = await this.getPriorities();
            const existingPriority = priorities.find(p => p.tag === tag);

            if (existingPriority) {
                console.log(`🔄 更新已存在的标签优先级 - "${tag}"`);
                console.log(`之前的数据：次数=${existingPriority.count}, 颜色=${existingPriority.color}`);
                existingPriority.count++;
                existingPriority.color = color;
                console.log(`更新后的数据：次数=${existingPriority.count}, 颜色=${existingPriority.color}`);
            } else {
                console.log(`➕ 添加新的标签优先级 - "${tag}"`);
                priorities.push({ tag, color, count: 1 });
            }

            await store.set('priorities', { priorities });
            await store.save();
            console.log('✅ 优先级数据保存成功');
        } catch (error) {
            console.error('❌ 保存标签优先级失败：', error);
        }
    }

    async getMostUsedColorForTag(tag: string): Promise<string | null> {
        console.log(`🔍 查找标签 "${tag}" 的优先级颜色`);
        const priorities = await this.getPriorities();
        const priority = priorities.find(p => p.tag === tag);

        if (priority) {
            console.log(`✨ 找到标签 "${tag}" 的优先级颜色：${priority.color}, 使用次数：${priority.count}`);
            return priority.color;
        } else {
            console.log(`ℹ️ 未找到标签 "${tag}" 的优先级记录`);
            return null;
        }
    }
}

export const tagPriorityStore = new TagPriorityStore();

// 初始化
tagPriorityStore.initialize().catch(error => {
    console.error('❌ 初始化标签优先级存储失败：', error);
});
