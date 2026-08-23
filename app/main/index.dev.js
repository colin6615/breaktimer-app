require("ts-node").register({
  project: "./tsconfig.node.json",
  compilerOptions: {
    module: "nodenext",
    moduleResolution: "nodenext",
  },
});
require("./index.ts");
