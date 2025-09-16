import prompts from "prompts";
import fs from 'node:fs'
import path from 'node:path'
import pc from "picocolors";

const configPath = path.resolve(process.cwd(), './a2i.config.json')
export async function initConfig() {
  try {
    console.log(pc.green("开始初始化配置文件,有疑问请参考 https://apifox-openapi.apifox.cn/api-173411997"));
    const result = await prompts([
      {
        type: "text",
        name: "apifoxHost",
        message: "apifox请求地址",
        initial: "https://api.apifox.com",
        validate: (value) => {
          if (!value) {
            return "请输入apifox的地址";
          }
          return true;
        },
      },
      {
        type: "text",
        name: "projectId",
        message: "项目的id",
        validate: (value) => {
          if (!value) {
            return "请输入apifox的projectId";
          }
          return true;
        },
      },
      {
        type: "text",
        name: "accessToken",
        message: "apifox accessToken，参考：https://apifox-openapi.apifox.cn/doc-4296599",
        validate: (value) => {
          if (!value) {
            return "请输入apifox的access_token";
          }
          return true;
        },
      },
      {
        type: "text",
        name: "version",
        message: "X-Apifox-Api-Version 参考：https://apifox-openapi.apifox.cn/doc-4296596",
        initial: "2024-03-28",
        validate: (value) => {
          if (!value) {
            return "请输入apifox的access_token";
          }
          return true;
        },
      },
    ]);

    if (!result.apifoxHost || !result.projectId || !result.accessToken || !result.version) {
      return false;
    }


    console.log("创建配置文件 a2i.config.json 完成\n");

    const content = `${JSON.stringify({
      ...result,
      "requestBody": {
        "scope": {
          "type": "ALL",
          "excludedByTags": []
        },
        "options": {
          "includeApifoxExtensionProperties": false,
          "addFoldersToTags": false
        },
        "oasVersion": "3.1",
        "exportFormat": "JSON",
      }
    }, null, 2)}`;

    await fs.writeFileSync(configPath, content);

    return result
  } catch (error) {
    console.error(error);
    return false
  }
}

export const getConfig = () => {
  try {
    const config = fs.readFileSync(configPath, "utf-8")
    return JSON.parse(config)
  } catch (error) {
    console.log(pc.yellow("没有找到配置文件"))
    return false
  }
};