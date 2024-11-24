const fs = require("fs");

const communityPackageJsonPath = "package.json";
const currentPackageJson = JSON.parse(
  fs.readFileSync(communityPackageJsonPath)
);

if (currentPackageJson.devDependencies["@instrukt/langchain-core"]) {
  delete currentPackageJson.devDependencies["@instrukt/langchain-core"];
  currentPackageJson.peerDependencies["@instrukt/langchain-core"] = "latest";
}

// Stupid hack
currentPackageJson.resolutions = {
  ...currentPackageJson.resolutions,
  jackspeak: "2.1.1",
};

fs.writeFileSync(
  communityPackageJsonPath,
  JSON.stringify(currentPackageJson, null, 2)
);
