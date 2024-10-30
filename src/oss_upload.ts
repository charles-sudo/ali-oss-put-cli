import OSS from "ali-oss";
import fs from "fs";
import path from "path";

interface UploadStats {
    folderCount: number;
    fileCount: number;
    failedFiles: string[];
    totalBytes: number;
}

class OssUpload {
    private client: OSS;
    private stats: UploadStats = {
        folderCount: 0,
        fileCount: 0,
        failedFiles: [],
        totalBytes: 0
    };
    private readonly MAX_RETRIES = 3;
    private readonly MAX_CONCURRENT = 5;

    constructor(accessKeyId: string, accessKeySecret: string, bucketName: string, region: string) {
        this.client = new OSS({
            region,
            accessKeyId,
            accessKeySecret,
            bucket: bucketName,
            timeout: 120000 // 2分钟超时
        });
    }

    public async uploadFileToOSS(localFilePath: string, rootPathInOSS: string): Promise<UploadStats> {
        const startTime = Date.now();

        try {
            await this.uploadFolderToOSS(localFilePath, rootPathInOSS);

            const endTime = Date.now();
            const totalTime = (endTime - startTime) / 1000;

            console.log(`上传完成:`);
            console.log(`- 总文件夹数: ${this.stats.folderCount}`);
            console.log(`- 总文件数: ${this.stats.fileCount}`);
            console.log(`- 总大小: ${(this.stats.totalBytes / 1024 / 1024).toFixed(2)} MB`);
            console.log(`- 耗时: ${totalTime.toFixed(2)} 秒`);

            if (this.stats.failedFiles.length > 0) {
                console.error(`失败文件数: ${this.stats.failedFiles.length}`);
                console.error('失败文件列表:', this.stats.failedFiles);
            }

            return this.stats;
        } catch (err) {
            console.error('上传过程发生错误:', err);
            throw err;
        }
    }

    private async uploadFolderToOSS(localFolderPath: string, remoteFolderPath: string) {
        const files = fs.readdirSync(localFolderPath);
        this.stats.folderCount++;

        // 对文件进行排序，将 index.html 放到最后
        const sortedFiles = files.sort((a, b) => {
            if (a === 'index.html') return 1;
            if (b === 'index.html') return -1;
            return 0;
        });

        const uploadTasks: Promise<void>[] = [];
        const concurrentQueue = new Set<Promise<void>>();

        for (const file of sortedFiles) {
            const filePath = path.join(localFolderPath, file);
            const key = path.join(remoteFolderPath, file);

            if (fs.lstatSync(filePath).isDirectory()) {
                await this.uploadFolderToOSS(filePath, key);
                continue;
            }

            const uploadTask = this.uploadFileWithRetry(filePath, key);
            uploadTasks.push(uploadTask);

            // 控制并发数
            if (concurrentQueue.size >= this.MAX_CONCURRENT) {
                await Promise.race([...concurrentQueue]);
            }

            const promise = uploadTask.finally(() => {
                concurrentQueue.delete(promise);
            });
            concurrentQueue.add(promise);
        }

        await Promise.all(uploadTasks);
    }

    private async uploadFileWithRetry(filePath: string, key: string, retryCount = 0): Promise<void> {
        try {
            const fileSize = fs.statSync(filePath).size;
            this.stats.totalBytes += fileSize;
            this.stats.fileCount++;

            console.log(`正在上传 ${filePath} -> OSS ${key} (${(fileSize / 1024).toFixed(2)} KB)`);
            await this.client.put(key, filePath);

        } catch (err) {
            if (retryCount < this.MAX_RETRIES) {
                console.warn(`上传失败，正在重试 (${retryCount + 1}/${this.MAX_RETRIES}): ${filePath}`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                return this.uploadFileWithRetry(filePath, key, retryCount + 1);
            }

            this.stats.failedFiles.push(filePath);
            console.error(`上传失败 ${filePath}: ${err}`);
            throw err;
        }
    }
}

export default OssUpload;
