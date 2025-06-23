FROM golang:1.22-alpine as builder
WORKDIR /app
COPY . .
RUN go mod init puvus-server || true
RUN go get github.com/gorilla/websocket
RUN go build -o server main.go

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/server .
EXPOSE 8080
CMD ["./server"]
