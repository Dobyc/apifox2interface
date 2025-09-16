import { Command } from "commander";
import { getConfig, initConfig } from "./utils/config";
import getOpenapi from "./utils/getOpenapi";
import { convertOpenApiToTypeScript } from "./utils/openapi2interface";
import { APIPATH, writeFile } from "./utils/writeFile";

const program = new Command("api");
program.version("1.0.0").description("根据 apifox 生成接口文件");
program.option("-h, --help", "帮助");
program.action(async () => {
	let config = await getConfig()
	if (!config) {
		config = await initConfig()
	}

	const openapi = await getOpenapi(config)
	const code = await convertOpenApiToTypeScript(JSON.parse(openapi))
	await writeFile(APIPATH, code)
})

export default program;
