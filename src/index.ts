#!/usr/bin/env node
import {program} from "commander";
import OssUpload from "./oss_upload";
import {version, name} from "../package.json";


interface OssPutOptions {
    key: string;
    secret: string;
    bucket: string;
    ossPath: string;
    region: string;
    localPath: string;
}


program.name(name)
    .description("Upload files or folders to AliCloud OSS")
    .version(version)
    .requiredOption('--key <key>', 'Alibaba Cloud OSS access key ID, cannot be empty')
    .requiredOption('--secret <secret>', 'Alibaba Cloud OSS access key secret, cannot be empty')
    .requiredOption('--bucket <bucket>', 'OSS storage space name, cannot be empty')
    .requiredOption('--ossPath <ossPath>', 'Root path in OSS, cannot be empty')
    .requiredOption('--region <region>', 'The region where the OSS service is located, such as cn-hangzhou, cannot be empty')
    .requiredOption('--localPath <localPath>', 'Local folder path, cannot be empty');

program.parse();

// 获取并验证参数
const options = program.opts<OssPutOptions>();

// 参数解释
// console.log('\n参数说明:',JSON.parse(JSON.stringify(options, null, 2)));

const ossUpload = new OssUpload(options.key, options.secret, options.bucket, options.region);

ossUpload.uploadFileToOSS(options.localPath, options.ossPath)
