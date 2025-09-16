#! /usr/bin/env node
import program from "./program";
import "./commands/config";

program.parse(process.argv);
