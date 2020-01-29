import { Stack, Construct, StackProps } from "@aws-cdk/core";
import { BaseService } from "@aws-cdk/aws-ecs";
import { EcsServiceEventsMackerelAnnotator } from "../resources/annotator-lambda";

export class LambdaStack extends Stack {
  constructor(scope: Construct, name: string, props: StackProps) {
    super(scope, name, props);

    new EcsServiceEventsMackerelAnnotator(this, "AnnotatorLambda", {
      clusterArnsToWatch: [],
    });
  }
}
