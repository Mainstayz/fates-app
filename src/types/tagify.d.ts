declare module '@yaireo/tagify' {
    export interface TagifySettings {
        maxTags?: number;
        backspace?: boolean;
        placeholder?: string;
        dropdown?: {
            enabled?: number;
            maxItems?: number;
            position?: string;
            closeOnSelect?: boolean;
            searchKeys?: string[];
            classname?: string;
        };
        whitelist?: string[];
    }

    export interface TagifyTag {
        value: string;
        [key: string]: any;
    }

    export default class Tagify {
        constructor(input: HTMLInputElement, settings?: TagifySettings);
        destroy(): void;
        addTags(tags: string[] | string): void;
        removeTag(tag: HTMLElement): void;
        on(event: string, callback: Function): void;
        off(event: string, callback: Function): void;
        value: TagifyTag[];
        settings: TagifySettings;
    }
}
