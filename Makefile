DIST_DIR = dist
LAMBDA_HANDLER = $(DIST_DIR)/annotator/annotator
LAMBDA_SOURCE_DIR = ./lambda
LAMBDA_SOURCE_FILES = $(wildcard $(LAMBDA_SOURCE_DIR)/*.go)

.PHONY: build
build: $(LAMBDA_HANDLER)

.PHONY: deps
deps:
	go get -v all

.PHONY: test
test:
	go test -cover $(LAMBDA_SOURCE_DIR)

$(LAMBDA_HANDLER): $(LAMBDA_SOURCE_FILES)
	env GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o $(LAMBDA_HANDLER) $(LAMBDA_SOURCE_DIR)
