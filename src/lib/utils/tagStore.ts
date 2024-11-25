import { load } from '@tauri-apps/plugin-store';

interface TagStoreData {
    tags: string[];
}

// 存储实例
let store: Awaited<ReturnType<typeof load>>;

export const tagStore = {
    // 获取所有标签
    async getTags(): Promise<string[]> {
        if (!store) {
            await this.initialize();
        }
        const data = await store.get<TagStoreData>('tags');
        return data?.tags || [];
    },

    // 初始化加载标签
    async initialize() {
        try {
            // 加载或创建存储
            store = await load('tags.json', { autoSave: false });

            // 检查是否需要初始化数据
            const data = await store.get<TagStoreData>('tags');
            if (!data) {
                await store.set('tags', { tags: [] });
                await store.save();
            }
        } catch (error) {
            console.error('Failed to initialize tag store:', error);
        }
    },

    // 添加新标签
    async addTags(newTags: string[]) {
        if (!store) {
            await this.initialize();
        }

        try {
            const currentTags = await this.getTags();
            const uniqueTags = [...new Set([...currentTags, ...newTags])];
            // 保持最新的 100 个标签
            const limitedTags = uniqueTags.slice(-100);
            console.log(`limitedTags: ${limitedTags}`);
            // 保存到文件
            await store.set('tags', { tags: limitedTags });
            await store.save();

            return limitedTags;
        } catch (error) {
            console.error('Failed to save tags:', error);
            return [];
        }
    }
};

// 初始化
tagStore.initialize().catch(error => {
    console.error('Failed to initialize tag store:', error);
});
