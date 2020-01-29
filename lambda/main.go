package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

func main() {
	lambda.Start(annotator)
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

	return nil
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
}

type EcsTaskStateChangeEvent struct {
	Attachments       []TaskAttachment `json:"attachments"`
	AvailabilityZone  string           `json:"availabilityZone"`
	ClusterArn        string           `json:"clusterArn"`
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
}
