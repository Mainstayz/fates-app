import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => {
    return {
        title: 'Hello',
        description: 'This is a test'
    };
};
