FROM golang:1.24.4-alpine as builder
WORKDIR /app

COPY . .

ARG TARGET_APP=.
RUN go build -tags timetzdata -o /app/server $TARGET_APP

FROM alpine:latest
WORKDIR /app


COPY --from=builder /app/server .
EXPOSE 8080
CMD ["./server"]
