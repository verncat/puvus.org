package main

import (
	"log"
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type Client struct {
	conn *websocket.Conn
}

type Hub struct {
	clients   map[*Client]bool
	count     int
	goal      int
	lock      sync.Mutex
	lastClick map[string]int64 // ip -> unix timestamp
}

var hub = Hub{
	clients:   make(map[*Client]bool),
	lastClick: make(map[string]int64),
	goal:      1000, // Цель по умолчанию
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func (h *Hub) broadcastCount() {
	h.lock.Lock()
	defer h.lock.Unlock()
	for c := range h.clients {
		err := c.conn.WriteJSON(map[string]interface{}{"count": h.count, "goal": h.goal})
		if err != nil {
			c.conn.Close()
			delete(h.clients, c)
		}
	}
}

func getIP(r *http.Request) string {
	ip := r.Header.Get("X-Real-IP")
	if ip == "" {
		ip = r.Header.Get("X-Forwarded-For")
	}
	if ip == "" {
		ip, _, _ = net.SplitHostPort(r.RemoteAddr)
	}
	return ip
}

func (h *Hub) handleClick(ip string, add int) bool {
	now := time.Now().UnixNano()
	h.lock.Lock()
	defer h.lock.Unlock()
	last, ok := h.lastClick[ip]
	if !ok || float64(now-last) >= 3e8 {
		h.count += add
		h.lastClick[ip] = now
		return true
	}
	return false
}

func wsHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	client := &Client{conn: conn}
	hub.lock.Lock()
	hub.clients[client] = true
	hub.lock.Unlock()
	defer func() {
		hub.lock.Lock()
		delete(hub.clients, client)
		hub.lock.Unlock()
		conn.Close()
	}()
	// send initial count and goal
	client.conn.WriteJSON(map[string]interface{}{"count": hub.count, "goal": hub.goal})
	for {
		var msg map[string]interface{}
		err := conn.ReadJSON(&msg)
		if err != nil {
			break
		}
		if msg["action"] == "click" {
			add := 1
			if v, ok := msg["count"].(float64); ok && v > 1 {
				add = int(v)
			}
			ip := getIP(r)
			if hub.handleClick(ip, add) {
				hub.broadcastCount()
			}
		}
	}
}

func main() {
	http.HandleFunc("/ws", wsHandler)
	log.Println("Listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
