import { getOpenApiReader, getOpenApiWriter, getTypeScriptWriter, makeConverter } from 'typeconv'

const convertFromTypeconv = (data) => {
	return new Promise((resolve, reject) => {
		const reader = getOpenApiReader();
		const writer = getTypeScriptWriter({});

		const { convert } = makeConverter(reader, writer, {})
		convert({ data: JSON.stringify(data) }).then(res => {
			// 定义目标文件路径
			resolve(res.data)
		})
	});
}

/**
 * 将OpenAPI 3.0 Schema转换为TypeScript API客户端代码
 * @param openapi OpenAPI JSON Schema对象
 * @returns 生成的TypeScript代码字符串
 */
export async function convertOpenApiToTypeScript(openapi: any) {
	let code = '';

	// 添加文件头部注释
	code += `// 自动生成的API客户端\n`;
	code += `// 基于OpenAPI规范: ${openapi.info.title} v${openapi.info.version}\n\n`;
	code += `import axios from 'axios';\n\n`;

	// 生成类型定义
	code += await convertFromTypeconv(openapi)

	code += '\n\n'

	// const types = Object.keys(openapi.components.schemas);

	// // 引入 ts 类型
	// code += `import type { ${types.join(',')} } from './types';\n\n`;

	// 1. 生成基础响应类型
	code += `// 基础响应类型\n`;
	code += `interface BaseResponse<T> {\n`;
	code += `  success: boolean;\n`;
	code += `  code: number;\n`;
	code += `  data: T;\n`;
	code += `}\n\n`;

	// 2. 生成所有定义的类型
	code += `// 接口相关类型定义\n`;

	// 处理路径中的类型
	const pathNames = Object.keys(openapi.paths);
	pathNames.forEach(path => {
		const methods = Object.keys(openapi.paths[path]);
		methods.forEach(method => {
			const operation = openapi.paths[path][method];

			// 处理请求体类型
			if (operation.requestBody && operation.requestBody.content) {
				const schema = operation.requestBody.content['application/json']?.schema;
				if (schema) {
					const typeName = getTypeNameFromPath(path, 'Request', method);
					code += generateTypeDefinition(typeName, schema);
				}
			}

			// 处理响应类型
			if (operation.responses) {
				const successResponse = operation.responses['200'] || operation.responses['201'];
				if (successResponse?.content) {
					const schema = successResponse.content['application/json']?.schema;
					if (schema) {
						// 检查是否是基础响应格式
						if (schema.properties?.success && schema.properties?.code && schema.properties?.data) {
							const dataSchema = schema.properties.data;
							const typeName = getTypeNameFromPath(path, 'ResponseData', method);
							code += generateTypeDefinition(typeName, dataSchema);
						} else {
							const typeName = getTypeNameFromPath(path, 'Response', method);
							code += generateTypeDefinition(typeName, schema);
						}
					}
				}
			}
		});
	});

	// 为每个路径生成API方法
	pathNames.forEach(path => {
		const methods = Object.keys(openapi.paths[path]);
		methods.forEach(method => {
			const operation = openapi.paths[path][method];
			code += generateApiMethod(path, method, operation);
		});
	});

	// 5. 导出类型
	code += `// 导出类型供外部使用\n`;
	code += `export type {\n`;

	// 收集所有生成的类型名称
	const typeNames: string[] = [];
	pathNames.forEach(path => {
		const methods = Object.keys(openapi.paths[path]);
		methods.forEach(method => {
			const operation = openapi.paths[path][method];

			if (operation.requestBody?.content?.['application/json']?.schema) {
				typeNames.push(getTypeNameFromPath(path, 'Request', method));
			}

			if (operation.responses) {
				const successResponse = operation.responses['200'] || operation.responses['201'];
				if (successResponse?.content?.['application/json']?.schema) {
					const schema = successResponse.content['application/json'].schema;
					if (schema.properties?.success && schema.properties?.code && schema.properties?.data) {
						typeNames.push(getTypeNameFromPath(path, 'ResponseData', method));
					} else {
						typeNames.push(getTypeNameFromPath(path, 'Response', method));
					}
				}
			}
		});
	});

	typeNames.push('BaseResponse');
	code += `  ${typeNames.join(',\n  ')}\n`;
	code += `};\n`;

	return code;
}

/**
 * 从路径生成类型名称
 * @param path API路径
 * @param suffix 后缀（如Request、Response）
 * @param method HTTP方法
 * @returns 类型名称
 */
function getTypeNameFromPath(path: string, suffix: string, method: string): string {
	const methodMap = {
		get: 'Get',
		post: 'Post',
		put: 'Put',
		delete: 'Delete',
		patch: 'Patch',
	};

	// 移除路径中的斜杠和特殊字符，转换为驼峰命名
	return methodMap[method.toLowerCase()] + path
		.split('/')
		.filter(segment => segment)
		.map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join('') + suffix;
}

/**
 * 生成API方法代码
 * @param path API路径
 * @param method HTTP方法
 * @param operation OpenAPI操作对象
 * @returns 生成的方法代码
 */
function generateApiMethod(path: string, method: string, operation: any): string {
	const functionName = method + path
		.split('/')
		.filter(segment => segment)
		.map((segment, index) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join('');

	const summary = operation.summary ? `* ${operation.summary}\n` : '';
	const requestTypeName = getTypeNameFromPath(path, 'Request', method);
	const responseDataTypeName = getTypeNameFromPath(path, 'ResponseData', method);
	const responseTypeName = getTypeNameFromPath(path, 'Response', method);

	let returnType = '';
	if (operation.responses) {
		const successResponse = operation.responses['200'] || operation.responses['201'];
		if (successResponse?.content?.['application/json']?.schema) {
			const schema = successResponse.content['application/json'].schema;
			if (schema.properties?.success && schema.properties?.code && schema.properties?.data) {
				returnType = responseDataTypeName;
			} else if (schema.type === 'string') {
				returnType = 'string';
			} else {
				returnType = responseTypeName;
			}
		}
	}

	let methodCode = `/**\n`;
	methodCode += `	${summary}`;
	methodCode += `	* @param params 请求参数\n`;
	methodCode += `	* @returns 接口响应\n`;
	methodCode += `	*/\n`;

	const parmaMethods = ['get', 'delete'];

	const hasParams = operation.requestBody?.content?.['application/json']?.schema;
	methodCode += `export const ${functionName} = async (${hasParams ? `params: ${requestTypeName}` : ''}) => {\n`;
	methodCode += `	try {\n`;
	methodCode += `		const response = await axios.request<${returnType}>({\n`;
	methodCode += `			url: '/api${path}',\n`;
	methodCode += `			method: '${method.toUpperCase()}',\n`;
	methodCode += `			headers: {\n`;
	methodCode += `				'Content-Type': 'application/json',\n`;
	methodCode += `			},\n`;
	methodCode += hasParams ? `			${[parmaMethods.includes(method.toLowerCase()) ? 'params' : 'data']}: JSON.stringify(params),\n` : '';
	methodCode += `		});\n\n`;
	methodCode += `		console.log('response', response);\n\n`;

	methodCode += `		return response.data;\n`;

	methodCode += `	} catch (error) {\n`;
	methodCode += `			console.error('Error calling ${functionName}:', error);\n`;
	methodCode += `			throw error;\n`;
	methodCode += `		}\n`;
	methodCode += `	}\n\n`;

	return methodCode;
}

/**
 * 生成类型定义
 * @param typeName 类型名称
 * @param schema JSON Schema
 * @returns 生成的类型定义代码
 */
function generateTypeDefinition(typeName: string, schema: any): string {
	let code = `interface ${typeName} {\n`;

	if (schema.type === 'object' && schema.properties) {
		Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
			const isRequired = schema.required?.includes(propName);
			const propType = getTypeFromSchema(propSchema);
			code += `  ${propName}${isRequired ? '' : '?'}: ${propType};\n`;
		});
	} else if (schema.type === 'array' && schema.items) {
		const itemType = getTypeFromSchema(schema.items);
		code += `  [index: number]: ${itemType};\n`;
	} else if (schema.type) {
		code += `  [key: string]: ${getTypeFromSchema(schema)};\n`;
	}

	code += `}\n\n`;
	return code;
}

/**
 * 从JSON Schema获取TypeScript类型
 * @param schema JSON Schema片段
 * @returns TypeScript类型字符串
 */
function getTypeFromSchema(schema: any): string {
	if (schema.$ref) {
		// 处理引用类型
		const refParts = schema.$ref.split('/');
		const refName = refParts[refParts.length - 1];
		return refName;
	}

	switch (schema.type) {
		case 'string':
			return 'string';
		case 'number':
		case 'integer':
			return 'number';
		case 'boolean':
			return 'boolean';
		case 'array':
			return `${getTypeFromSchema(schema.items)}[]`;
		case 'object':
			if (schema.properties) {
				// 生成匿名对象类型
				let objType = '{ ';
				Object.entries(schema.properties).forEach(([propName, propSchema], index, array) => {
					const isRequired = schema.required?.includes(propName);
					objType += `${propName}${isRequired ? '' : '?'}: ${getTypeFromSchema(propSchema)}`;
					if (index < array.length - 1) {
						objType += ', ';
					}
				});
				objType += ' }';
				return objType;
			} else {
				return 'object';
			}
		default:
			return 'any';
	}
}