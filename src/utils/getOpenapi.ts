import pc from 'picocolors'

interface Config {
	"apifoxHost": string
	"projectId": string
	"accessToken": string
	"version": string
	"requestBody": {
		"scope": {
			"type": "ALL" | "SELECTED_ENDPOINTS" | "SELECTED_TAGS" | "SELECTED_FOLDERS"
			"excludedByTags": Array<string>
		},
		"options": {
			"includeApifoxExtensionProperties": boolean
			"addFoldersToTags": boolean
		},
		"oasVersion": "3.1" | "3.0" | "2.0"
		"exportFormat": "JSON" | "YAML"
	}
}

export default function getOpenapi(config: Config): Promise<string> {
	return new Promise((resolve, reject) => {
		if (!config) {
			console.log(pc.yellow("请先初始化配置"))
			reject("请先初始化配置")
		}
		const {
			apifoxHost,
			projectId,
			accessToken,
			version,
			requestBody
		} = config;

		const locale = 'zh-CN'

		const headers = new Headers();
		headers.append("X-Apifox-Api-Version", version);
		headers.append("Authorization", `Bearer ${accessToken}`);
		headers.append("Content-Type", "application/json");

		const body = JSON.stringify(requestBody);

		const requestOptions = {
			method: 'POST',
			headers: headers,
			body: body
		};

		fetch(
			`${apifoxHost}/v1/projects/${projectId}/export-openapi?locale=${locale}`, requestOptions)
			.then(response => response.text())
			.then(res => {
				console.log(pc.blue('获取接口完成'))
				resolve(res)
			})
			.catch(error => {
				reject(error)
			});
	})
}