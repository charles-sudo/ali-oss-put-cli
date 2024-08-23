import OSS from "ali-oss";
import fs from "fs";
import path from "path";

// 配置信息
const accessKeyId = "";
const accessKeySecret = "";
const bucketName = "";
const rootPathInOSS = ""; // 例如: 'myfolder/'
const region = ""; // 例如: 'oss-cn-hangzhou'
const localFolderPath = "../dist"; // 本地文件夹路径

// 计数器
let folderCount = 0;
let fileCount = 0;
// 开始计时
const startTime = Date.now();

async function uploadFolderToOSS(localFolderPath, remoteFolderPath) {
    const client = new OSS({
        region,
        accessKeyId,
        accessKeySecret,
        bucket: bucketName,
    });

    // 读取文件夹中的所有文件
    const files = fs.readdirSync(localFolderPath);

    folderCount++; // 增加文件夹计数

    // 分离 index.html 文件
    const nonIndexFiles = files.filter(file => file !== 'index.html');
    const indexFile = files.find(file => file === 'index.html');

    for (const file of nonIndexFiles) {
        const filePath = path.join(localFolderPath, file);
        const key = path.join(remoteFolderPath, file); // OSS中的路径

        try {
            // 检查是否为文件夹
            if (fs.lstatSync(filePath).isDirectory()) {
                // 如果是文件夹，则递归调用函数
                await uploadFolderToOSS(filePath, path.join(remoteFolderPath, file));
            } else {
                // 上传文件
                fileCount++; // 增加文件计数
                console.log(`Uploading ${filePath} --> OSS ${key}`);
                await client.put(key, filePath);

            }
        } catch (err) {
            console.error(`Failed to upload ${filePath}: ${err.message}`);
        }
    }

    // 特殊处理 index.html 文件
    if (indexFile) {
        const indexPath = path.join(localFolderPath, indexFile);
        const indexKey = path.join(remoteFolderPath, indexFile); // OSS中的路径

        try {
            if (!fs.lstatSync(indexPath).isDirectory()) {
                // 上传 index.html 文件
                fileCount++; // 增加文件计数
                console.log(`Uploading ${indexPath} --> OSS ${indexKey}`);
                await client.put(indexKey, indexPath);
            }
        } catch (err) {
            console.error(`Failed to upload ${indexPath}: ${err.message}`);
        }
    }
}

// 调用函数开始上传
uploadFolderToOSS(localFolderPath, rootPathInOSS)
    .then(() => {
        // 结束计时
        const endTime = Date.now();
        const totalTime = (endTime - startTime) / 1000; // 总时间秒数

        console.log(`Total folders uploaded: ${folderCount}`);
        console.log(`Total files uploaded: ${fileCount}`);
        console.log(`Total time taken: ${totalTime.toFixed(2)} seconds`);
    })
    .catch(err => console.error('Error uploading:', err));
