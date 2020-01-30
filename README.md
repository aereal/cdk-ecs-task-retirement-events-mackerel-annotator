# @aereal/cdk-ecs-task-retirement-events-mackerel-annotator

cdk-ecs-task-retirement-events-mackerel-annotator provides [AWS CDK][] resource class consists of Lambda function that annotates ECS task stop event
and CloudWatch Events rule that invokes the Lambda function.

## Install

```sh
npm install @aereal/cdk-ecs-task-retirement-events-mackerel-annotator
```

```sh
yarn add @aereal/cdk-ecs-task-retirement-events-mackerel-annotator
```

## Usage

```typescript
import { Stack } from "@aws-cdk/core";
import { StringParameter } from "@aws-cdk/aws-ssm";
import { FargateService } from "@aws-cdk/aws-ecs";
import { EcsServiceEventsMackerelAnnotator } from "@aereal/cdk-ecs-task-retirement-events-mackerel-annotator";

const stack = new Stack();

const service = new FargateService(...);

new EcsServiceEventsMackerelAnnotator(stack, "Annotator", {
  mackerelApiKey: StringParameter.fromSecureStringParameterAttributes(
    stack,
    "MackerelAPIKey",
    {
      parameterName: "mackerel-api-key",
      version: 1,
    }
  ),
  ecsGroupServiceRolesMapping: {
    [`service:${service.serviceName}`]: {
      service: "My-App",
      roles: ["app"],
    },
  },
});
```

[AWS CDK]: https://docs.aws.amazon.com/cdk/latest/guide/home.html
