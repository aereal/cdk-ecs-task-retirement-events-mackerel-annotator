package main

import (
	"context"

"github.com/aws/aws-lambda-go/lambda"
)

func main() {
	lambda.Start(annotator)
}

type event struct{}

func annotator(ctx context.Context, ev *event) error {
	return nil
}
