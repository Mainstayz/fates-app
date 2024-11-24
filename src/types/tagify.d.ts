declare module '@yaireo/tagify' {
    interface TagifySettings {
        maxTags?: number;
        backspace?: boolean;
        placeholder?: string;
        dropdown?: {
            enabled?: number;
            classname?: string;
            maxItems?: number;
            closeOnSelect?: boolean;
        };
        whitelist?: string[];
    }

    interface TagifyValue {
        value: string;
        [key: string]: any;
    }

    class Tagify {
        constructor(input: HTMLInputElement, settings?: TagifySettings);

        value: TagifyValue[];
        settings: TagifySettings;
        DOM: {
            input: HTMLInputElement;
            scope: HTMLElement;
        };

        destroy(): void;
        removeTag(tag: string | number): void;
        removeAllTags(): void;
        addTags(tags: string[]): void;
        whitelist: string[];

        on(event: string, callback: (e: { detail: any }) => void): void;
        off(event: string, callback?: (e: { detail: any }) => void): void;
    }

    export default Tagify;
}
