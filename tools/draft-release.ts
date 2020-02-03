import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { SemVer } from "semver";

interface PackageJSON {
  [key: string]: any;
  version?: string;
}

const parsePackageJSON = async (path: string): Promise<PackageJSON> => {
  const buf = readFileSync(path);
  return JSON.parse(buf.toString("utf8"));
};

const bumpToNextPrerelease = async (prevVersion: SemVer): Promise<SemVer> => {
  const nextVersion = prevVersion.inc("prerelease", "prerelease");
  return new SemVer(nextVersion.format());
};

const updatePackageJSON = async (
  path: string,
  newPkg: PackageJSON
): Promise<void> => {
  const content = JSON.stringify(newPkg, null, 2) + "\n";
  writeFileSync(path, content);
};

const main = async (): Promise<void> => {
  const path = join(__dirname, "..", "package.json");
  const pkgJSON = await parsePackageJSON(path);
  if (pkgJSON.version === undefined) {
    throw new Error(`version field not found in ${path}`);
  }
  const nextVersion = await bumpToNextPrerelease(new SemVer(pkgJSON.version));
  process.stderr.write(`Bump version (${pkgJSON.version}) to ${nextVersion}\n`);
  await updatePackageJSON(path, { ...pkgJSON, version: nextVersion.format() });
  process.stdout.write(`::set-output name=next-version::${nextVersion}\n`);
};

main();
