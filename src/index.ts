#!/usr/bin/env node
import { program } from "commander";
import chalk from "chalk";

import { version, name } from "../package.json";
import fs from "fs";
import path from "path";
import OssPut from "./ossPut";

// 定义配置接口
interface OssConfig {
  key: string;
  secret: string;
  bucket: string;
  region: string;
}

interface UploadOptions {
  ossPath?: string;
  localPath: string;
}

type OssPutOptions = OssConfig & UploadOptions;

// 添加配置文件相关选项
const CONFIG_FILE_NAME = "oss-put-config.json";

// 读取配置文件函数
function loadConfig(configPath?: string): Partial<OssPutOptions> {
  try {
    // 如果配置文件路径为空，则使用当前工作目录下的配置文件
    const filePath = configPath || path.join(process.cwd(), CONFIG_FILE_NAME);
    if (fs.existsSync(filePath)) {
      const config = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      return config;
    }
    // 添加提示信息
    if (configPath) {
      console.warn(chalk.yellow(`config file not found at: ${filePath}`));
    }
  } catch (error) {
    if (error instanceof Error) {
      console.warn(chalk.yellow(`read config file failed: ${error.message}`));
    } else {
      console.warn(chalk.yellow(`read config file failed: ${error}`));
    }
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
  .option("-c, --config <path>", "Specify the configuration file path");

// 动态添加命令行选项，但将 required 设置为 false
Object.entries(commandOptions).forEach(([_, opt]) => {
  program.option(opt.flag, opt.desc);
});

program.parse();

// 添加配置验证函数
function validateConfig(config: Partial<OssPutOptions>): config is OssPutOptions {
  const requiredFields = ["key", "secret", "bucket", "region", "localPath"] as const;
  const missingFields = requiredFields.filter((field) => !config[field]);

  if (missingFields.length > 0) {
    console.error(chalk.red(`missing required fields: ${missingFields.join(", ")}`));
    // 提示使用 --help 查看帮助
    console.log(chalk.yellow("use --help to see more information"));
    return false;
  }

  if (config.ossPath === undefined) {
    config.ossPath = "";
  }

  return true;
}

// 将主逻辑包装在异步函数中
async function main() {
  const cliOptions = program.opts();
  const configFileOptions = loadConfig(cliOptions.config);

  const options: Partial<OssPutOptions> = {
    ...configFileOptions,
    ...Object.fromEntries(Object.entries(cliOptions).filter(([_, value]) => value !== undefined)),
  };

  console.log(options);

  if (!validateConfig(options)) {
    process.exit(1);
  }

  const ossPut = new OssPut(options.key, options.secret, options.bucket, options.region);

  try {
    await ossPut.putFileToOSS(options.localPath, options.ossPath || "");
    console.log(chalk.green("✔ upload success!"));
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red("✘ upload failed:"), error.message);
    } else {
      console.error(chalk.red("✘ upload failed:"), error);
    }
    process.exit(1);
  }
}

// 执行主函数
main().catch((error) => {
  console.error(chalk.red("✘ program execution failed:"), error);
  process.exit(1);
});
