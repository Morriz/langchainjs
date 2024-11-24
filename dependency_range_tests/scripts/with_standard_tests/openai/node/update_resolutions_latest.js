const fs = require("fs");

const communityPackageJsonPath =
  "/app/monorepo/libs/langchain-openai/package.json";
const currentPackageJson = JSON.parse(
  fs.readFileSync(communityPackageJsonPath)
);

if (currentPackageJson.devDependencies["@instrukt/langchain-core"]) {
  delete currentPackageJson.devDependencies["@instrukt/langchain-core"];
  currentPackageJson.peerDependencies["@instrukt/langchain-core"] = "latest";
}

fs.writeFileSync(
  communityPackageJsonPath,
  JSON.stringify(currentPackageJson, null, 2)
);
