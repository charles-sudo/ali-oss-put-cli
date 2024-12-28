import OSS from "ali-oss";
import fs from "fs";
import path from "path";
import chalk from "chalk";

interface UploadStats {
  folderCount: number;
  fileCount: number;
  failedFiles: string[];
  totalBytes: number;
}

class OssPut {
  private client: OSS;
  private stats: UploadStats = {
    folderCount: 0,
    fileCount: 0,
    failedFiles: [],
    totalBytes: 0,
  };
  private readonly MAX_RETRIES = 3;
  private readonly MAX_CONCURRENT = 5;
  private bucketName: string;

  constructor(accessKeyId: string, accessKeySecret: string, bucketName: string, region: string) {
    this.client = new OSS({
      region,
      accessKeyId,
      accessKeySecret,
      bucket: bucketName,
      timeout: 120000, // 2分钟超时
    });
    this.bucketName = bucketName;
  }

  public async putFileToOSS(localFilePath: string, rootPathInOSS: string): Promise<UploadStats> {
    const startTime = Date.now();

    try {
      await this.putFolderToOSS(localFilePath, rootPathInOSS);

      const endTime = Date.now();
      const totalTime = (endTime - startTime) / 1000;

      console.log(chalk.cyan("\n=== Upload Summary ==="));
      console.log(`- total folder count: ${chalk.yellow(this.stats.folderCount)}`);
      console.log(`- total file count: ${chalk.yellow(this.stats.fileCount)}`);
      console.log(`- total size: ${chalk.green((this.stats.totalBytes / 1024 / 1024).toFixed(2))} MB`);
      console.log(`- total time: ${chalk.blue(totalTime.toFixed(2))} 秒`);

      if (this.stats.failedFiles.length > 0) {
        console.error(chalk.red("❌ Failed uploads:"));
        console.error(chalk.red(`failed file count: ${this.stats.failedFiles.length}`));
        console.error(chalk.red("failed file list:"), this.stats.failedFiles);
      }

      return this.stats;
    } catch (err) {
      console.error(chalk.red("❌ Upload process error:"), err);
      throw err;
    }
  }

  private async putFolderToOSS(localFolderPath: string, remoteFolderPath: string) {
    const files = fs.readdirSync(localFolderPath);
    this.stats.folderCount++;

    // 对文件进行排序，将 index.html 放到最后
    const sortedFiles = files.sort((a, b) => {
      if (a === "index.html") return 1;
      if (b === "index.html") return -1;
      return 0;
    });

    const putTasks: Promise<void>[] = [];
    const concurrentQueue = new Set<Promise<void>>();

    for (const file of sortedFiles) {
      const filePath = path.join(localFolderPath, file);
      const key = path.join(remoteFolderPath, file);

      if (fs.lstatSync(filePath).isDirectory()) {
        await this.putFolderToOSS(filePath, key);
        continue;
      }

      const putTask = this.putFileWithRetry(filePath, key);
      putTasks.push(putTask);

      // 控制并发数
      if (concurrentQueue.size >= this.MAX_CONCURRENT) {
        await Promise.race([...concurrentQueue]);
      }

      const promise = putTask.finally(() => {
        concurrentQueue.delete(promise);
      });
      concurrentQueue.add(promise);
    }

    await Promise.all(putTasks);
  }

  private async putFileWithRetry(filePath: string, key: string, retryCount = 0): Promise<void> {
    try {
      const fileSize = fs.statSync(filePath).size;
      this.stats.totalBytes += fileSize;
      this.stats.fileCount++;

      const startTime = Date.now();
      await this.client.put(key, filePath);
      const uploadTime = Date.now() - startTime;

      console.log(
        chalk.green("✓ ") +
          `file upload success: ${chalk.yellow(filePath)} → ${chalk.cyan(`oss://${this.bucketName}/${key}`)}` +
          chalk.green(` size: ${(fileSize / 1024).toFixed(2)} KB`) +
          chalk.blue(` time: ${uploadTime}ms`)
      );
    } catch (err) {
      if (retryCount < this.MAX_RETRIES) {
        console.warn(
          chalk.yellow("⚠️ ") +
            chalk.yellow(`upload failed, retrying (${retryCount + 1}/${this.MAX_RETRIES}): ${filePath}`)
        );
        await new Promise((resolve) => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.putFileWithRetry(filePath, key, retryCount + 1);
      }

      this.stats.failedFiles.push(filePath);
      console.error(chalk.red("❌ ") + chalk.red(`upload failed: ${filePath}: ${err}`));
      throw err;
    }
  }
}

export default OssPut;
