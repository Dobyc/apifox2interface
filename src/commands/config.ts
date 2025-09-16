import program from "../program";
import { initConfig } from "../utils/config";

program
  .command("config")
  .description("创建配置文件")
  .action(async () => {
    await initConfig();
  });

