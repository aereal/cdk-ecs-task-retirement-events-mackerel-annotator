package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"strings"

	"github.com/google/go-github/v29/github"
)

func main() {
	if err := run(os.Args); err != nil {
		log.Printf("! %s", err)
		os.Exit(1)
	}
}

func run(argv []string) error {
	if err := handleEvent(os.Stdin); err != nil {
		return fmt.Errorf("failed to handle event: %w", err)
	}
	return nil
}

type deploymentPayload struct {
	NextVersion string `json:"nextVersion"`
}

func handleEvent(input io.Reader) error {
	var event github.DeploymentEvent
	if err := json.NewDecoder(input).Decode(&event); err != nil {
		return fmt.Errorf("failed to parse input as DeploymentEvent: %w", err)
	}

	deployment := event.GetDeployment()
	var payloadJSON string
	if err := json.Unmarshal(deployment.Payload, &payloadJSON); err != nil {
		return fmt.Errorf("failed to parse DeploymentEvent.Deployment.Payload: %w", err)
	}
	payload := new(deploymentPayload)
	if err := json.Unmarshal([]byte(payloadJSON), payload); err != nil {
		return fmt.Errorf("failed to parse DeploymentEvent.Deployment.Payload: %w", err)
	}
	log.Printf("deployment (task:%q) requested on ref:%q sha:%q payload:%#v", deployment.GetTask(), deployment.GetRef(), deployment.GetSHA(), payload)

	packageJSONPath := "package.json"
	if err := bumpVersion(packageJSONPath, payload.NextVersion); err != nil {
		return fmt.Errorf("failed to bump version: %w", err)
	}

	dryRun := os.Getenv("DO_CHANGE") == ""
	if err := publishToNPM(dryRun); err != nil {
		return fmt.Errorf("failed to publish package to NPM: %w", err)
	}

	return nil
}

type pkgJSON map[string]json.RawMessage

func bumpVersion(pkgJSONPath string, nextVersion string) error {
	forRead, err := os.Open(pkgJSONPath)
	if err != nil {
		return fmt.Errorf("cannot open %s: %w", pkgJSONPath, err)
	}
	var pkgJSON pkgJSON
	if err := json.NewDecoder(forRead).Decode(&pkgJSON); err != nil {
		return fmt.Errorf("failed to decode package.json: %w", err)
	}
	if err := forRead.Close(); err != nil {
		return fmt.Errorf("cannot close %s: %w", pkgJSONPath, err)
	}

	if string(pkgJSON["version"]) == fmt.Sprintf("%q", nextVersion) {
		return fmt.Errorf("version not changed; current:%s next:%q", string(pkgJSON["version"]), nextVersion)
	}

	forUpdate, err := os.Create(pkgJSONPath)
	if err != nil {
		return fmt.Errorf("cannot open %s for write: %w", pkgJSONPath, err)
	}
	log.Printf("bump version to %q", nextVersion)
	pkgJSON["version"] = json.RawMessage(fmt.Sprintf("%q", nextVersion))
	enc := json.NewEncoder(forUpdate)
	enc.SetEscapeHTML(false)
	enc.SetIndent("", "  ")
	if err := enc.Encode(&pkgJSON); err != nil {
		return fmt.Errorf("cannot update %s: %w", pkgJSONPath, err)
	}

	if err := doCommand("git", "add", "-u", pkgJSONPath); err != nil {
		return fmt.Errorf("failed to git add: %w", err)
	}
	if err := doCommand("git", "commit", "-m", fmt.Sprintf("bump version to %s", nextVersion)); err != nil {
		return fmt.Errorf("failed to git commit (maybe any files not staged): %w", err)
	}

	return nil
}

func publishToNPM(dryRun bool) error {
	args := []string{"publish", "--access", "publish"}
	if dryRun {
		args = append(args, "--dry-run")
	}
	if err := doCommand("npm", args...); err != nil {
		return fmt.Errorf("failed execute npm publish: %w", err)
	}
	return nil
}

func pushBumpedVersion(dryRun bool, remote, branch string) error {
	args := []string{"push", remote, branch}
	if dryRun {
		args = append(args, "--dry-run")
	}
	if err := doCommand("git", args...); err != nil {
		return fmt.Errorf("failed to git push: %w", err)
	}
	return nil
}

func doCommand(name string, arg ...string) error {
	log.Printf("run command: %s %s", name, strings.Join(arg, " "))
	cmd := exec.Command(name, arg...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}
