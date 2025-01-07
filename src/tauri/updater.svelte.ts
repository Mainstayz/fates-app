import { check, type DownloadEvent } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export interface UpdateProgress {
    status: "checking" | "available" | "downloading" | "installing" | "restarting" | "latest" | "error";
    version?: string;
    downloaded?: number;
    total?: number;
}

export interface UpdaterCallbacks {
    onProgress: (progress: UpdateProgress) => void;
}

class Updater {
    private callbacks: Set<UpdaterCallbacks["onProgress"]>;
    private updateResult: Awaited<ReturnType<typeof check>> = null;

    constructor() {
        this.callbacks = new Set();
    }

    subscribe(callback: UpdaterCallbacks["onProgress"]): () => void {
        this.callbacks.add(callback);
        return () => {
            this.callbacks.delete(callback);
        };
    }

    async checkForUpdates(): Promise<{ hasUpdate: boolean; version?: string }> {
        try {
            this.notifyProgress({ status: "checking" });
            if (!this.updateResult) {
                this.updateResult = await check();
            }
            if (this.updateResult) {
                this.notifyProgress({
                    status: "available",
                    version: this.updateResult.version,
                });
                return {
                    hasUpdate: true,
                    version: this.updateResult.version,
                };
            } else {
                this.notifyProgress({ status: "latest" });
                return { hasUpdate: false };
            }
        } catch (error) {
            console.error("Failed to check for updates:", error);
            this.notifyProgress({ status: "error" });
            return { hasUpdate: false };
        }
    }

    async downloadAndInstall(): Promise<void> {
        if (!this.updateResult) {
            return;
        }

        try {
            let downloaded = 0;
            let contentLength = 0;

            await this.updateResult.downloadAndInstall((progress: DownloadEvent) => {
                if (progress.event === "Started") {
                    contentLength = progress.data.contentLength || 0;
                    this.notifyProgress({
                        status: "downloading",
                        total: contentLength,
                    });
                } else if (progress.event === "Progress") {
                    downloaded += progress.data.chunkLength;
                    this.notifyProgress({
                        status: "downloading",
                        downloaded,
                        total: contentLength,
                    });
                } else if (progress.event === "Finished") {
                    this.notifyProgress({ status: "installing" });
                }
            });
        } catch (error) {
            console.error("Failed to download and install update:", error);
            this.notifyProgress({ status: "error" });
            throw error;
        }
    }

    async silentUpdate(): Promise<void> {
        if (this.updateResult) {
            console.log(
                `found update ${this.updateResult.version} from ${this.updateResult.date} with notes ${this.updateResult.body}`
              );
              let downloaded = 0;
              let contentLength = 0;
              // alternatively we could also call update.download() and update.install() separately
              await this.updateResult.downloadAndInstall((event: DownloadEvent) => {
                switch (event.event) {
                  case 'Started':
                    contentLength = event.data.contentLength || 0;
                    console.log(`started downloading ${event.data.contentLength} bytes`);
                    break;
                  case 'Progress':
                    downloaded += event.data.chunkLength;
                    console.log(`downloaded ${downloaded} from ${contentLength}`);
                    break;
                  case 'Finished':
                    console.log('download finished');
                    break;
                }
              });

              console.log('update installed');
              await relaunch();
        }
    }

    async restart(): Promise<void> {
        this.notifyProgress({ status: "restarting" });
        // 等待 1000ms 后重启
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await relaunch();
    }

    private notifyProgress(progress: UpdateProgress): void {
        this.callbacks.forEach((callback) => callback(progress));
    }
}

export const updater = new Updater();
