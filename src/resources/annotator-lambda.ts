import { join, resolve } from "path";
import { Resource, ResourceProps, Construct } from "@aws-cdk/core";
import {
  Function as LambdaFunction,
  Code,
  Runtime,
  FunctionProps,
} from "@aws-cdk/aws-lambda";

interface EcsServiceEventsMackerelAnnotatorProps extends ResourceProps {
  readonly functionProps?: Omit<FunctionProps, "code" | "handler" | "runtime">;
}

export class EcsServiceEventsMackerelAnnotator extends Resource {
  constructor(
    scope: Construct,
    id: string,
    props: EcsServiceEventsMackerelAnnotatorProps
  ) {
    super(scope, id, props);

    const { functionProps } = props;

    const lambdaPath = resolve(
      join(__dirname, "..", "..", "dist", "annotator")
    );

    new LambdaFunction(this, "Function", {
      code: Code.fromAsset(lambdaPath, {}),
      handler: "annotator",
      runtime: Runtime.GO_1_X,
      ...functionProps,
    });
  }
}
