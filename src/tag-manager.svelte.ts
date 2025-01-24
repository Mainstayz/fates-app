
import platform from "$src/platform";
import type { Tag } from "$src/types";

class TagManager {
    public tagNames = $state<string[]>([]);
    public tagObjects = $state<Tag[]>([]);
    constructor() {}

    public async fetchAllTags() {
        const tags = await platform.instance.storage.getAllTags();
        const sortedTags = tags.sort((a: Tag, b: Tag) => {
            const dateA = new Date(a.last_used_at).getTime();
            const dateB = new Date(b.last_used_at).getTime();
            if (isNaN(dateA) || isNaN(dateB)) {
                console.warn(`Invalid date format in last_used_at: a: ${a.last_used_at} b: ${b.last_used_at}`);
                return 0;
            }
            return dateB - dateA;
        });
        const filteredTags = sortedTags.filter((tag: Tag) => tag.name !== "");
        const newTags = filteredTags.map((tag: Tag) => tag.name);
        this.tagNames = newTags;
        this.tagObjects = filteredTags;
    }

    public async createTags(tags: string[]) {
        const filteredTags = this.processTags(tags);
        if (filteredTags.length == 0) {
            return;
        }
        const tagsStr = filteredTags.join(",");
        await platform.instance.storage.createTag(tagsStr);
    }

    public async deleteTags(tags: string[]) {
        const filteredTags = this.processTags(tags);
        if (filteredTags.length == 0) {
            return;
        }
        const tagsStr = filteredTags.join(",");
        await platform.instance.storage.deleteTag(tagsStr);
    }

    public async updateTagsLastUsedAt(tags: string[]) {
        const filteredTags = this.processTags(tags);
        if (filteredTags.length == 0) {
            return;
        }
        const tagsStr = filteredTags.join(",");
        await platform.instance.storage.updateTagLastUsedAt(tagsStr);
    }

    private  processTags(tags: string[]) {
        return [
            ...new Set(
                tags
                    .filter((tag) => typeof tag === "string")
                    .map((tag) => tag.trim())
                    .filter((tag) => tag.length > 0)
            ),
        ];
    }
}

const tagManager = new TagManager();
export default tagManager;
