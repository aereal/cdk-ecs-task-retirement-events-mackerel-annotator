DIST_DIR = dist
LAMBDA_HANDLER = $(DIST_DIR)/annotator/annotator

.PHONY: build
build: $(LAMBDA_HANDLER)

$(LAMBDA_HANDLER):
	env GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o $(LAMBDA_HANDLER) ./lambda/
