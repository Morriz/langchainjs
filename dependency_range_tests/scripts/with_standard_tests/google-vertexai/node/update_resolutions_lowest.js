const fs = require("fs");
const semver = require("semver");

const communityPackageJsonPath =
  "/app/monorepo/libs/langchain-google-vertexai/package.json";

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

if (
  currentPackageJson.dependencies["@langchain/google-gauth"] &&
  !currentPackageJson.dependencies["@langchain/google-gauth"].includes("rc")
) {
  const minVersion = semver.minVersion(
    currentPackageJson.dependencies["@langchain/google-gauth"]
  ).version;
  currentPackageJson.dependencies = {
    ...currentPackageJson.dependencies,
    "@langchain/google-gauth": minVersion,
  };
}

fs.writeFileSync(
  communityPackageJsonPath,
  JSON.stringify(currentPackageJson, null, 2)
);
