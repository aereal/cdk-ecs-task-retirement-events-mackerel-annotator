import { join, resolve } from "path";
import { Resource, ResourceProps, Construct } from "@aws-cdk/core";
import {
  Function as LambdaFunction,
  Code,
  Runtime,
  FunctionProps,
} from "@aws-cdk/aws-lambda";
import { Rule } from "@aws-cdk/aws-events";
import { LambdaFunction as InvokeLambdaFunction } from "@aws-cdk/aws-events-targets";
import { IStringParameter } from "@aws-cdk/aws-ssm";

interface ServiceRoles {
  readonly service: string;
  readonly roles: string[];
}

type EcsGroupServiceRolesMapping = Record<string, ServiceRoles>;

interface EcsServiceEventsMackerelAnnotatorProps extends ResourceProps {
  readonly functionProps?: Omit<FunctionProps, "code" | "handler" | "runtime">;
  readonly clusterArnsToWatch?: string[];
  readonly mackerelApiKey: IStringParameter;
  readonly ecsGroupServiceRolesMapping: EcsGroupServiceRolesMapping;
}

export class EcsServiceEventsMackerelAnnotator extends Resource {
  constructor(
    scope: Construct,
    id: string,
    props: EcsServiceEventsMackerelAnnotatorProps
  ) {
    super(scope, id, props);

    const {
      functionProps,
      clusterArnsToWatch,
      mackerelApiKey,
      ecsGroupServiceRolesMapping,
    } = props;

    const lambdaPath = resolve(
      join(__dirname, "..", "..", "dist", "annotator")
    );

    const func = new LambdaFunction(this, "Function", {
      code: Code.fromAsset(lambdaPath, {}),
      handler: "annotator",
      runtime: Runtime.GO_1_X,
      ...functionProps,
      environment: {
        ...functionProps?.environment,
        MACKEREL_APIKEY_PARAMETER_NAME: mackerelApiKey.parameterName,
        ECS_GROUP_MAPPING: JSON.stringify(ecsGroupServiceRolesMapping),
      },
    });
    mackerelApiKey.grantRead(func);

    const rule = new Rule(this, "SubscribeEcsTaskStoppedRule", {
      eventPattern: {
        detailType: ["ECS Task State Change"],
        source: ["aws.ecs"],
        detail: {
          clusterArn: clusterArnsToWatch,
          lastStatus: ["STOPPED"],
        },
      },
    });
    rule.addTarget(new InvokeLambdaFunction(func));
  }
}
