import { Stack } from "@aws-cdk/core";
import { SynthUtils } from "@aws-cdk/assert";
import { StringParameter } from "@aws-cdk/aws-ssm";
import { EcsServiceEventsMackerelAnnotator } from "../src/resources/annotator-lambda";

describe("EcsServiceEventsMackerelAnnotator", () => {
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
});
