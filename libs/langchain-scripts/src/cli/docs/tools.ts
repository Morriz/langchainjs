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
  PYTHON_DOC_URL_PLACEHOLDER,
  API_REF_MODULE_PLACEHOLDER,
  API_REF_PACKAGE_PLACEHOLDER,
  SERIALIZABLE_PLACEHOLDER,
  PY_SUPPORT_PLACEHOLDER,
} from "../constants.js";

const TEMPLATE_PATH = path.resolve("./src/cli/docs/templates/tools.ipynb");
const INTEGRATIONS_DOCS_PATH = path.resolve(
  "../../docs/core_docs/docs/integrations/tools"
);

type ExtraFields = {
  serializable: boolean;
  pySupport: boolean;
  fullImportPath: string;
  packageName: string;
};

async function promptExtraFields(): Promise<ExtraFields> {
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

  return {
    serializable: isSerializable.toLowerCase() === "y",
    pySupport: hasPySupport.toLowerCase() === "y",
    fullImportPath: importPath,
    packageName,
  };
}

export async function fillToolIntegrationDocTemplate(fields: {
  className: string;
}) {
  const sidebarLabel = fields.className.replace("Tool", "");
  const pyDocUrl = `https://python.langchain.com/docs/integrations/tools/${sidebarLabel.toLowerCase()}/`;
  const extraFields = await promptExtraFields();
  const importPathEnding = extraFields.fullImportPath.split("/").pop() ?? "";
  const apiRefModuleUrl = `https://api.js.langchain.com/classes/${extraFields.fullImportPath
    .replace("@", "")
    .replaceAll("/", "_")
    .replaceAll("-", "_")}.${fields.className}.html`;
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
    .replaceAll(PYTHON_DOC_URL_PLACEHOLDER, pyDocUrl)
    .replaceAll(API_REF_MODULE_PLACEHOLDER, apiRefModuleUrl)
    .replaceAll(API_REF_PACKAGE_PLACEHOLDER, apiRefPackageUrl)
    .replaceAll(
      SERIALIZABLE_PLACEHOLDER,
      extraFields?.serializable ? "beta" : "❌"
    )
    .replaceAll(PY_SUPPORT_PLACEHOLDER, extraFields?.pySupport ? "✅" : "❌");

  const docPath = path.join(
    INTEGRATIONS_DOCS_PATH,
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
