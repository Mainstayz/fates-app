import type { Icon } from "lucide-svelte";
import type { ComponentType } from "svelte";
import * as Icons from "./icons"

export type Route = {
	icon: ComponentType<Icon>;
	variant: "default" | "ghost";
    label: string;
};

export const primaryRoutes: Route[] = [
    {
        icon: Icons.ChartGantt,
        variant: "default",
        label: "Dashboard",
    },

    {
        icon: Icons.Settings,
        variant: "ghost",
        label: "Settings",
    },
]
