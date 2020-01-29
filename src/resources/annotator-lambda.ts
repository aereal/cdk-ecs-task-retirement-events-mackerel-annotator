import { Resource, ResourceProps, Construct } from "@aws-cdk/core";

type EcsServiceEventsMackerelAnnotatorProps = ResourceProps;

export class EcsServiceEventsMackerelAnnotator extends Resource {
  constructor(
    scope: Construct,
    id: string,
    props: EcsServiceEventsMackerelAnnotatorProps
  ) {
    super(scope, id, props);
  }
}
