import * as path from "node:path";
import * as fs from "node:fs";
import {
  boldText,
  getUserInput,
  greenText,
  redBackground,
} from "../utils/get-input.js";
import { fetchURLStatus } from "../utils/fetch-url-status.js";
import {
  SIDEBAR_LABEL_PLACEHOLDER,
  MODULE_NAME_PLACEHOLDER,
  PACKAGE_NAME_PLACEHOLDER,
  FULL_IMPORT_PATH_PLACEHOLDER,
  ENV_VAR_NAME_PLACEHOLDER,
  PYTHON_DOC_URL_PLACEHOLDER,
  API_REF_MODULE_PLACEHOLDER,
  API_REF_PACKAGE_PLACEHOLDER,
  LOCAL_PLACEHOLDER,
  SERIALIZABLE_PLACEHOLDER,
  PY_SUPPORT_PLACEHOLDER,
} from "../constants.js";

const NODE_SUPPORT_PLACEHOLDER = "__fs_support__";
const NODE_ONLY_SIDEBAR_BADGE_PLACEHOLDER = "__node_only_sidebar__";
const NODE_ONLY_TOOL_TIP_PLACEHOLDER = "__node_only_tooltip__";

const TEMPLATE_PATH = path.resolve(
  "./src/cli/docs/templates/document_loaders.ipynb"
);
const INTEGRATIONS_DOCS_PATH = path.resolve(
  "../../docs/core_docs/docs/integrations/document_loaders"
);

const NODE_ONLY_TOOLTIP =
  "```{=mdx}\\n\\n:::tip Compatibility\\n\\nOnly available on Node.js.\\n\\n:::\\n\\n```\\n";
const NODE_ONLY_SIDEBAR_BADGE = `sidebar_class_name: node-only`;

type ExtraFields = {
  webLoader: boolean;
  nodeOnly: boolean;
  serializable: boolean;
  pySupport: boolean;
  local: boolean;
  envVarName: string;
  fullImportPath: string;
  packageName: string;
};

async function promptExtraFields(fields: {
  envVarGuess: string;
}): Promise<ExtraFields> {
  const isWebLoader = await getUserInput(
    "Is this integration a web loader? (y/n) ",
    undefined,
    true
  );
  const isNodeOnly = await getUserInput(
    "Does this integration _only_ support Node environments? (y/n) ",
    undefined,
    true
  );
  const isSerializable = await getUserInput(
    "Does this integration support serializable output? (y/n) ",
    undefined,
    true
  );
  const hasPySupport = await getUserInput(
    "Does this integration have Python support? (y/n) ",
    undefined,
    true
  );
  const hasLocalSupport = await getUserInput(
    "Does this integration support running locally? (y/n) ",
    undefined,
    true
  );
  const importPath = await getUserInput(
    "What is the full import path of the integration? (e.g @instrukt/langchain-community/llms/togetherai) ",
    undefined,
    true
  );

  let packageName = "";
  if (importPath.startsWith("langchain/")) {
    packageName = "langchain";
  } else {
    packageName = importPath.split("/").slice(0, 2).join("/");
  }

  const verifyPackageName = await getUserInput(
    `Is ${packageName} the correct package name? (y/n) `,
    undefined,
    true
  );
  if (verifyPackageName.toLowerCase() === "n") {
    packageName = await getUserInput(
      "Please enter the full package name (e.g @instrukt/langchain-community) ",
      undefined,
      true
    );
  }

  const isEnvGuessCorrect = await getUserInput(
    `Is the environment variable for the API key named ${fields.envVarGuess}? (y/n) `,
    undefined,
    true
  );
  let envVarName = fields.envVarGuess;
  if (isEnvGuessCorrect.toLowerCase() === "n") {
    envVarName = await getUserInput(
      "Please enter the correct environment variable name ",
      undefined,
      true
    );
  }

  return {
    webLoader: isWebLoader.toLowerCase() === "y",
    nodeOnly: isNodeOnly.toLowerCase() === "y",
    serializable: isSerializable.toLowerCase() === "y",
    pySupport: hasPySupport.toLowerCase() === "y",
    local: hasLocalSupport.toLowerCase() === "y",
    envVarName,
    fullImportPath: importPath,
    packageName,
  };
}

export async function fillDocLoaderIntegrationDocTemplate(fields: {
  className: string;
}) {
  const sidebarLabel = fields.className.replace("Loader", "");
  const pyDocUrl = `https://python.langchain.com/docs/integrations/document_loaders/${sidebarLabel.toLowerCase()}/`;
  let envVarName = `${sidebarLabel.toUpperCase()}_API_KEY`;
  const extraFields = await promptExtraFields({
    envVarGuess: envVarName,
  });
  envVarName = extraFields.envVarName;
  const importPathEnding = extraFields.fullImportPath.split("/").pop() ?? "";
  const apiRefModuleUrl = `https://api.js.langchain.com/classes/${extraFields.fullImportPath
    .replace("@", "")
    .replaceAll("/", "_")
    .replaceAll("-", "_")}_${importPathEnding}.${fields.className}.html`;
  const apiRefPackageUrl = apiRefModuleUrl
    .replace("/classes/", "/modules/")
    .replace(`.${fields.className}.html`, ".html");

  const apiRefUrlSuccesses = await Promise.all([
    fetchURLStatus(apiRefModuleUrl),
    fetchURLStatus(apiRefPackageUrl),
  ]);
  if (apiRefUrlSuccesses.find((s) => !s)) {
    console.warn(
      "API ref URLs invalid. Please manually ensure they are correct."
    );
  }

  const docTemplate = (await fs.promises.readFile(TEMPLATE_PATH, "utf-8"))
    .replaceAll(SIDEBAR_LABEL_PLACEHOLDER, sidebarLabel)
    .replaceAll(MODULE_NAME_PLACEHOLDER, fields.className)
    .replaceAll(PACKAGE_NAME_PLACEHOLDER, extraFields.packageName)
    .replaceAll(FULL_IMPORT_PATH_PLACEHOLDER, extraFields.fullImportPath)
    .replaceAll(ENV_VAR_NAME_PLACEHOLDER, envVarName)
    .replaceAll(PYTHON_DOC_URL_PLACEHOLDER, pyDocUrl)
    .replaceAll(API_REF_MODULE_PLACEHOLDER, apiRefModuleUrl)
    .replaceAll(API_REF_PACKAGE_PLACEHOLDER, apiRefPackageUrl)
    .replaceAll(
      NODE_ONLY_SIDEBAR_BADGE_PLACEHOLDER,
      extraFields.nodeOnly ? NODE_ONLY_SIDEBAR_BADGE : ""
    )
    .replaceAll(
      NODE_ONLY_TOOL_TIP_PLACEHOLDER,
      extraFields?.nodeOnly ? NODE_ONLY_TOOLTIP : ""
    )
    .replaceAll(
      NODE_SUPPORT_PLACEHOLDER,
      extraFields?.nodeOnly ? "Node-only" : "All environments"
    )
    .replaceAll(LOCAL_PLACEHOLDER, extraFields?.local ? "✅" : "❌")
    .replaceAll(
      SERIALIZABLE_PLACEHOLDER,
      extraFields?.serializable ? "beta" : "❌"
    )
    .replaceAll(PY_SUPPORT_PLACEHOLDER, extraFields?.pySupport ? "✅" : "❌");

  const docPath = path.join(
    INTEGRATIONS_DOCS_PATH,
    extraFields?.webLoader ? "web_loaders" : "file_loaders",
    `${importPathEnding}.ipynb`
  );
  await fs.promises.writeFile(docPath, docTemplate);
  const prettyDocPath = docPath.split("docs/core_docs/")[1];

  const updatePythonDocUrlText = `  ${redBackground(
    "- Update the Python documentation URL with the proper URL."
  )}`;
  const successText = `\nSuccessfully created new document loader integration doc at ${prettyDocPath}.`;

  console.log(
    `${greenText(successText)}\n
${boldText("Next steps:")}
${extraFields?.pySupport ? updatePythonDocUrlText : ""}
  - Run all code cells in the generated doc to record the outputs.
  - Add extra sections on integration specific features.\n`
  );
}
