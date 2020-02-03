import { join, resolve } from "path";
import { mkdirSync } from "fs";
import { Stack } from "@aws-cdk/core";
import { SynthUtils } from "@aws-cdk/assert";
import { StringParameter } from "@aws-cdk/aws-ssm";
import {
  Cluster,
  FargateService,
  FargateTaskDefinition,
  ContainerImage,
} from "@aws-cdk/aws-ecs";
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
      mackerelServiceRolesMappings: [],
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
      mackerelServiceRolesMappings: [],
      clustersToWatch: [cluster],
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  test("pass mapping", () => {
    const stack = new Stack();
    const taskDefinition = new FargateTaskDefinition(stack, "TaskDefinition");
    taskDefinition.addContainer("app", {
      image: ContainerImage.fromRegistry("dummy-app"),
    });
    const cluster = new Cluster(stack, "Cluster");
    const myHomeService = new FargateService(stack, "MyHomeService", {
      taskDefinition,
      cluster,
      serviceName: "my-home-service",
    });
    const myOfficeService = new FargateService(stack, "MyOfficeService", {
      taskDefinition,
      cluster,
      serviceName: "my-office-service",
    });
    new EcsServiceEventsMackerelAnnotator(stack, "Annotator", {
      mackerelApiKey: StringParameter.fromStringParameterName(
        stack,
        "MackerelAPIKey",
        "dummy-mackerel-api-key"
      ),
      mackerelServiceRolesMappings: [
        {
          ecsService: myHomeService,
          serviceRoles: {
            service: "My-Home",
            roles: ["app"],
          },
        },
        {
          ecsService: myOfficeService,
          serviceRoles: {
            service: "My-Office",
            roles: ["app", "proxy"],
          },
        },
      ],
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });
});
