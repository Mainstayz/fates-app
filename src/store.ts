import { load, Store } from '@tauri-apps/plugin-store'

interface StoreData {
    settings?: {
        theme: string;
        language: string;
        autoStart: boolean;
    };
    mouseTracker?: {
        enabled: boolean;
        sensitivity: number;
    };
    timeline?: {
        data: any[];
        lastUpdate: string;
    };
}

class AppStore {
    private static instance: AppStore;
    private store: Store | null = null;
    private readonly storePath = 'app.dat';

    private constructor() {}

    public static getInstance(): AppStore {
        if (!AppStore.instance) {
            AppStore.instance = new AppStore();
        }
        return AppStore.instance;
    }

    public async init(): Promise<void> {
        try {
            this.store = await load(this.storePath);
        } catch (error) {
            console.error('Failed to initialize store:', error);
            throw error;
        }
    }

    public async get<T>(key: keyof StoreData): Promise<T | null> {
        try {
            if (!this.store) await this.init();
            return await this.store!.get(key) as T;
        } catch (error) {
            console.error(`Failed to get ${String(key)}:`, error);
            return null;
        }
    }

    public async set<T>(key: keyof StoreData, value: T): Promise<void> {
        try {
            if (!this.store) await this.init();
            await this.store!.set(key, value);
            await this.store!.save();
        } catch (error) {
            console.error(`Failed to set ${String(key)}:`, error);
            throw error;
        }
    }

    public async clear(): Promise<void> {
        try {
            if (!this.store) await this.init();
            await this.store!.clear();
            await this.store!.save();
        } catch (error) {
            console.error('Failed to clear store:', error);
            throw error;
        }
    }
}

// 导出单例实例
export const appStore = AppStore.getInstance();
