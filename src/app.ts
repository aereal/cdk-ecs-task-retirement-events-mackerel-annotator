import { App, AppProps, Environment } from "@aws-cdk/core";
import { LambdaStack } from "./stacks/lambda-stack";

interface MackerelAnnotatorAppProps extends AppProps {
  readonly env: Environment;
}

export class MackerelAnnotatorApp extends App {
  static newFromContext = (): MackerelAnnotatorApp => {
    const { CDK_DEFAULT_ACCOUNT, CDK_DEFAULT_REGION } = process.env;
    if (CDK_DEFAULT_ACCOUNT === undefined) {
      throw new Error("default account not found");
    }
    if (CDK_DEFAULT_REGION === undefined) {
      throw new Error("default region not found");
    }
    return new MackerelAnnotatorApp({
      env: { account: CDK_DEFAULT_ACCOUNT, region: CDK_DEFAULT_REGION },
    });
  };

  private constructor(props: MackerelAnnotatorAppProps) {
    super(props);

    const { env } = props;

    new LambdaStack(
      this,
      "sandbox-ecs-service-events-mackerel-annotator-lambda",
      {
        env,
      }
    );
  }
}
