package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/aws/endpoints"
	"github.com/aws/aws-sdk-go-v2/aws/external"
	"github.com/aws/aws-sdk-go-v2/service/ssm"
	mackerel "github.com/mackerelio/mackerel-client-go"
)

func main() {
	lambda.Start(annotator)
}

var mackerelAPIKey string

func init() {
	if err := loadMackerelApiKey(); err != nil {
		panic(err)
	}
	if err := loadEcsGroupMapping(); err != nil {
		panic(err)
	}
}

func loadMackerelApiKey() error {
	parameterName := os.Getenv("MACKEREL_APIKEY_PARAMETER_NAME")
	if parameterName == "" {
		return fmt.Errorf("MACKEREL_APIKEY_PARAMETER_NAME not given")
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	cfg, err := external.LoadDefaultAWSConfig()
	if err != nil {
		return fmt.Errorf("cannot load default aws credentials: %w", err)
	}
	cfg.Region = endpoints.ApNortheast1RegionID
	client := ssm.New(cfg)
	req := client.GetParameterRequest(&ssm.GetParameterInput{
		Name:           aws.String(parameterName),
		WithDecryption: aws.Bool(true),
	})
	resp, err := req.Send(ctx)
	if err != nil {
		return fmt.Errorf("failed to get parameter: %w", err)
	}
	if resp.Parameter.Value == nil {
		return fmt.Errorf("got parameter value is nil")
	}

	mackerelAPIKey = *resp.Parameter.Value
	return nil
}

type ecsGroupMapping map[string]mackerelRole

var mapping = ecsGroupMapping{}

func loadEcsGroupMapping() error {
	dec := json.NewDecoder(strings.NewReader(os.Getenv("ECS_GROUP_MAPPING")))
	if err := dec.Decode(&mapping); err != nil {
		return fmt.Errorf("failed to load ECS_GROUP_MAPPING: %w", err)
	}
	return nil
}

func annotator(ctx context.Context, ev *events.CloudWatchEvent) error {
	log.Printf("event=%#v", ev)
	if ev.Source != "aws.ecs" {
		log.Printf("source is NOT aws.ecs; skip")
		return nil
	}
	if ev.DetailType != "ECS Task State Change" {
		log.Printf("[skip] unsupported detail: %q", ev.DetailType)
		return nil
	}

	var stateChangeEvent EcsTaskStateChangeEvent
	if err := json.Unmarshal(ev.Detail, &stateChangeEvent); err != nil {
		log.Printf("ECS task state change event (raw): %s", string(ev.Detail))
		return fmt.Errorf("cannot decode detail: %w", err)
	}

	log.Printf("ECS task state change event (raw): %s", string(ev.Detail))
	log.Printf("[decoded] ECS Task State Change Event: %#v", stateChangeEvent)

	serviceRole, found := mapping[stateChangeEvent.Group]
	if !found {
		return fmt.Errorf("no service/role mapping found for group: %q", stateChangeEvent.Group)
	}
	log.Printf("found service role: %#v", serviceRole)

	reason := determineStopReason(stateChangeEvent)
	client := mackerel.NewClient(mackerelAPIKey)
	annotation := &mackerel.GraphAnnotation{
		Title:       fmt.Sprintf("Task %s stopped", stateChangeEvent.TaskArn),
		Description: fmt.Sprintf("Reason: %q", reason),
		From:        stateChangeEvent.StoppingAt.Unix(),
		To:          stateChangeEvent.StoppingAt.Unix(),
		Roles:       serviceRole.Roles,
		Service:     serviceRole.Service,
	}
	_, err := client.CreateGraphAnnotation(annotation)
	if err != nil {
		return fmt.Errorf("failed to annotate: %w", err)
	}

	return nil
}

var codeEssentialContainerExited = "EssentialContainerExited"

func determineStopReason(detail EcsTaskStateChangeEvent) string {
	if detail.StopCode == codeEssentialContainerExited {
		var reason string
		for _, container := range detail.Containers {
			// we should check container is essential but CW Events payload have no information about essential-ness
			if container.ExitCode != 0 {
				return container.Reason
			}
		}
		return reason
	}
	return detail.StoppedReason
}

type mackerelRole struct {
	Service string
	Roles   []string
}

type TaskAttachmentDetail struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

type TaskAttachment struct {
	ID      string                 `json:"id"`
	Type    string                 `json:"type"`
	Status  string                 `json:"status"`
	Details []TaskAttachmentDetail `json:"details"`
}

type NetworkInterface struct {
	AttachmentID       string `json:"attachmentId"`
	PrivateIpv4Address string `json:"privateIpv4Address"`
}

type Container struct {
	ContainerArn      string             `json:"containerArn"`
	LastStatus        string             `json:"lastStatus"`
	Name              string             `json:"name"`
	Image             string             `json:"image"`
	ImageDigest       string             `json:"imageDigest"`
	RuntimeID         string             `json:"runtimeId"`
	TaskArn           string             `json:"taskArn"`
	NetworkInterfaces []NetworkInterface `json:"networkInterfaces"`
	CPU               string             `json:"cpu"`
	ExitCode          int                `json:"exitCode"`
	Reason            string             `json:"reason"`
}

type EcsTaskStateChangeEvent struct {
	Attachments       []TaskAttachment `json:"attachments"`
	AvailabilityZone  string           `json:"availabilityZone"`
	ClusterArn        string           `json:"clusterArn"`
	Containers        []Container      `json:"containers"`
	CreatedAt         time.Time        `json:"createdAt"`
	LaunchType        string           `json:"launchType"`
	CPU               string           `json:"cpu"`
	Memory            string           `json:"memory"`
	DesiredStatus     string           `json:"desiredStatus"`
	Group             string           `json:"group"`
	LastStatus        string           `json:"lastStatus"`
	Connectivity      string           `json:"connectivity"`
	ConnectivityAt    time.Time        `json:"connectvityAt"`
	PullStartedAt     time.Time        `json:"pullStartedAt"`
	StartedAt         time.Time        `json:"startedAt"`
	PullStoppedAt     time.Time        `json:"pullStoppedAt"`
	UpdatedAt         time.Time        `json:"updatedAt"`
	TaskArn           string           `json:"taskArn"`
	TaskDefinitionArn string           `json:"taskDefinitionArn"`
	Version           int              `json:"version"`
	PlatformVersion   string           `json:"platformVersion"`
	StoppedReason     string           `json:"stoppedReason"`
	StopCode          string           `json:"stopCode"`
	StoppingAt        time.Time        `json:"stoppingAt"`
	StoppedAt         time.Time        `json:"stoppedAt"`
}
