#!/usr/bin/env node
import { program } from "commander";
import OssUpload from "./oss_upload";
import { version, name } from "../package.json";

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
  .version(version);

// 动态添加命令行选项
Object.entries(commandOptions).forEach(([_, opt]) => {
  program.requiredOption(opt.flag, opt.desc);
});

program.parse();

const options = program.opts<OssPutOptions>();

const ossUpload = new OssUpload(
  options.key,
  options.secret,
  options.bucket,
  options.region
);

ossUpload.uploadFileToOSS(options.localPath, options.ossPath);
