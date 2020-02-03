import { join, resolve } from "path";
import { mkdirSync } from "fs";
import { Stack } from "@aws-cdk/core";
import { SynthUtils } from "@aws-cdk/assert";
import { StringParameter } from "@aws-cdk/aws-ssm";
import { Cluster } from "@aws-cdk/aws-ecs";
import { EcsServiceEventsMackerelAnnotator } from "../src/resources/annotator-lambda";

describe("EcsServiceEventsMackerelAnnotator", () => {
  beforeAll(() => {
    const lambdaPath = resolve(join(__dirname, "..", "dist", "annotator"));
    mkdirSync(lambdaPath, { recursive: true });
  });

  test("snapshot", () => {
    const stack = new Stack();
    new EcsServiceEventsMackerelAnnotator(stack, "Annotator", {
      mackerelApiKey: StringParameter.fromStringParameterName(
        stack,
        "MackerelAPIKey",
        "dummy-mackerel-api-key"
      ),
      ecsGroupServiceRolesMapping: {},
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  test("pass clusters", () => {
    const stack = new Stack();
    const cluster = new Cluster(stack, "Cluster");
    new EcsServiceEventsMackerelAnnotator(stack, "Annotator", {
      mackerelApiKey: StringParameter.fromStringParameterName(
        stack,
        "MackerelAPIKey",
        "dummy-mackerel-api-key"
      ),
      ecsGroupServiceRolesMapping: {},
      clustersToWatch: [cluster],
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });
});
