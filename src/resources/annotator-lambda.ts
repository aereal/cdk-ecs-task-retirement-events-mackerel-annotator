import { join, resolve } from "path";
import { Resource, ResourceProps, Construct, Arn } from "@aws-cdk/core";
import {
  Function as LambdaFunction,
  Code,
  Runtime,
  FunctionProps,
} from "@aws-cdk/aws-lambda";
import { Rule } from "@aws-cdk/aws-events";
import { LambdaFunction as InvokeLambdaFunction } from "@aws-cdk/aws-events-targets";
import { IStringParameter } from "@aws-cdk/aws-ssm";
import { ICluster, IService } from "@aws-cdk/aws-ecs";

export interface MackerelServiceRoles {
  readonly service: string;
  readonly roles: string[];
}

export interface MackerelServiceRolesMapping {
  readonly serviceRoles: MackerelServiceRoles;
  readonly ecsService: IService;
}

type EcsGroupServiceRolesMapping = Record<string, MackerelServiceRoles>;

interface EcsServiceEventsMackerelAnnotatorProps extends ResourceProps {
  readonly functionProps?: Omit<FunctionProps, "code" | "handler" | "runtime">;
  readonly clustersToWatch?: ICluster[];
  readonly mackerelApiKey: IStringParameter;
  readonly mackerelServiceRolesMappings: MackerelServiceRolesMapping[];
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
      clustersToWatch,
      mackerelApiKey,
      mackerelServiceRolesMappings,
    } = props;

    const lambdaPath = resolve(
      join(__dirname, "..", "..", "dist", "annotator")
    );

    const mapping = createMapping(mackerelServiceRolesMappings);

    const func = new LambdaFunction(this, "Function", {
      code: Code.fromAsset(lambdaPath, {}),
      handler: "annotator",
      runtime: Runtime.GO_1_X,
      ...functionProps,
      environment: {
        ...functionProps?.environment,
        MACKEREL_APIKEY_PARAMETER_NAME: mackerelApiKey.parameterName,
        ECS_GROUP_MAPPING: JSON.stringify(mapping),
      },
    });
    mackerelApiKey.grantRead(func);

    const rule = new Rule(this, "SubscribeEcsTaskStoppedRule", {
      eventPattern: {
        detailType: ["ECS Task State Change"],
        source: ["aws.ecs"],
        detail: {
          clusterArn: clustersToWatch?.map(cluster => cluster.clusterArn),
          lastStatus: ["STOPPED"],
        },
      },
    });
    rule.addTarget(new InvokeLambdaFunction(func));
  }
}

const createMapping = (
  mappings: readonly MackerelServiceRolesMapping[]
): EcsGroupServiceRolesMapping => {
  const obj: EcsGroupServiceRolesMapping = {};
  for (const { ecsService, serviceRoles } of mappings) {
    const { resourceName } = Arn.parse(ecsService.serviceArn);
    if (resourceName === undefined) {
      throw new Error(
        `[BUG] Invalid ECS Service ARN: ${ecsService.serviceArn}`
      );
    }

    const key = `service:${resourceName}`;
    if (obj[key] !== undefined) {
      throw new Error(
        `Duplicated mapping for ECS service: ${ecsService.serviceArn}`
      );
    }

    obj[key] = serviceRoles;
  }
  return obj;
};
