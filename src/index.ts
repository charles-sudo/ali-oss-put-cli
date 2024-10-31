#!/usr/bin/env node
import { program } from "commander";
import OssPut from "./ossPut";
import { version, name } from "../package.json";
import fs from 'fs';
import path from 'path';

// 定义配置接口
interface OssConfig {
  key: string;
  secret: string;
  bucket: string;
  region: string;
}

interface UploadOptions {
  ossPath: string;
  localPath: string;
}

type OssPutOptions = OssConfig & UploadOptions;

// 添加配置文件相关选项
const CONFIG_FILE_NAME = 'oss-put-config.json';

// 读取配置文件函数
function loadConfig(configPath?: string): Partial<OssPutOptions> {
  try {
    const filePath = configPath || path.join(process.cwd(), CONFIG_FILE_NAME);
    if (fs.existsSync(filePath)) {
      const config = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return config;
    }
  } catch (error) {
    console.warn(`读取配置文件失败: ${error}`);
  }
  return {};
}

// 定义命令行参数配置
const commandOptions = {
  key: {
    flag: "--key <key>",
    desc: "Alibaba Cloud OSS access key ID",
    required: true,
  },
  secret: {
    flag: "--secret <secret>",
    desc: "Alibaba Cloud OSS access key secret",
    required: true,
  },
  bucket: {
    flag: "--bucket <bucket>",
    desc: "OSS storage space name",
    required: true,
  },
  region: {
    flag: "--region <region>",
    desc: "The region where the OSS service is located (e.g. cn-hangzhou)",
    required: true,
  },
  ossPath: {
    flag: "--ossPath <ossPath>",
    desc: "Root path in OSS",
    required: true,
  },
  localPath: {
    flag: "--localPath <localPath>",
    desc: "Local folder path",
    required: true,
  },
};

program
  .name(name)
  .description("Upload files or folders to AliCloud OSS")
  .version(version)
  .option('-c, --config <path>', '指定配置文件路径');

// 动态添加命令行选项，但将 required 设置为 false
Object.entries(commandOptions).forEach(([_, opt]) => {
  program.option(opt.flag, opt.desc);
});

program.parse();

const cliOptions = program.opts();
const configFileOptions = loadConfig(cliOptions.config);

// 合并配置文件和命令行参数，优先使用命令行参数
const options: OssPutOptions = {
  ...configFileOptions,
  ...Object.fromEntries(
    Object.entries(cliOptions).filter(([_, value]) => value !== undefined)
  )
} as OssPutOptions;

// 验证必要参数
const requiredFields = ['key', 'secret', 'bucket', 'region', 'ossPath', 'localPath'];
const missingFields = requiredFields.filter(field => !options[field as keyof OssPutOptions]);

if (missingFields.length > 0) {
  console.error(`缺少必要参数: ${missingFields.join(', ')}`);
  process.exit(1);
}

const ossPut = new OssPut(
  options.key,
  options.secret,
  options.bucket,
  options.region
);

ossPut.putFileToOSS(options.localPath, options.ossPath);
