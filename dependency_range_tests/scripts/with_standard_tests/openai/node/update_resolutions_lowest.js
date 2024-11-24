const fs = require("fs");
const semver = require("semver");

const communityPackageJsonPath =
  "/app/monorepo/libs/langchain-openai/package.json";

const currentPackageJson = JSON.parse(
  fs.readFileSync(communityPackageJsonPath)
);

if (
  currentPackageJson.peerDependencies["@instrukt/langchain-core"] &&
  !currentPackageJson.peerDependencies["@instrukt/langchain-core"].includes(
    "rc"
  )
) {
  const minVersion = semver.minVersion(
    currentPackageJson.peerDependencies["@instrukt/langchain-core"]
  ).version;
  currentPackageJson.peerDependencies = {
    ...currentPackageJson.peerDependencies,
    "@instrukt/langchain-core": minVersion,
  };
}

if (currentPackageJson.devDependencies["@instrukt/langchain-core"]) {
  delete currentPackageJson.devDependencies["@instrukt/langchain-core"];
}

fs.writeFileSync(
  communityPackageJsonPath,
  JSON.stringify(currentPackageJson, null, 2)
);
