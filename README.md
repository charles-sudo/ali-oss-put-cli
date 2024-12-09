# ali-oss-put-cli

一个用于上传文件或文件夹到阿里云 OSS 的命令行工具。

## 特性

- 支持文件和文件夹的上传
- 支持配置文件和命令行参数
- 并发上传，提高上传效率
- 自动重试失败的上传
- 详细的上传统计信息

## 安装

```bash
npm install -g ali-oss-put-cli
```

## 使用方法

### 命令行参数

```bash
ali-oss-put --key <accessKeyId> --secret <accessKeySecret> --bucket <bucketName> --region <region> --ossPath <ossPath> --localPath <localPath>
```

必需参数：
- `--key`: 阿里云 OSS 访问密钥 ID
- `--secret`: 阿里云 OSS 访问密钥 Secret
- `--bucket`: OSS 存储空间名称
- `--region`: OSS 服务所在地域（如：cn-hangzhou）
- `--ossPath`: OSS 中的根路径
- `--localPath`: 本地文件夹路径

可选参数：
- `-c, --config <path>`: 指定配置文件路径
- `-V, --version`: 显示版本号
- `-h, --help`: 显示帮助信息

### 使用配置文件

你可以创建一个名为 `oss-put-config.json` 的配置文件，包含以下内容：

```json
{
  "key": "your-access-key-id",
  "secret": "your-access-key-secret",
  "bucket": "your-bucket-name",
  "region": "oss-region",
  "ossPath": "path/in/oss",
  "localPath": "local/path/to/upload"
}
```

配置文件默认在当前工作目录下查找，也可以通过 `--config` 参数指定路径。

注意：命令行参数的优先级高于配置文件。

## 特性说明

- 支持最大 5 个文件并发上传
- 失败自动重试 3 次
- 上传超时时间为 2 分钟
- 上传完成后显示详细统计信息：
  - 上传的文件夹数量
  - 上传的文件数量
  - 总上传大小
  - 耗时
  - 失败文件列表（如果有）

https://www.npmjs.com/package/oss-client
https://www.npmjs.com/package/ali-oss

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build
```

## 许可证

MIT License
