import fs from "node:fs"
import path from 'node:path'

export const APIPATH = path.join(process.cwd(), 'services', 'api.ts');

export const writeFile = (targetPath, data) => {
	try {
		const distDir = path.dirname(targetPath);
		if (!fs.existsSync(distDir)) {
			fs.mkdirSync(distDir, { recursive: true });
		}
		fs.writeFileSync(targetPath, data, 'utf8');
		console.log(`成功写入文件到: ${targetPath}`);
	} catch (error) {
		console.error('写入文件失败:', error.message);
		process.exit(1); // 非零退出码表示出错
	}
}