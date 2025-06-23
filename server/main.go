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
	goal:      100, // Цель по умолчанию
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func (h *Hub) broadcastCount() {
	h.lock.Lock()
	defer h.lock.Unlock()
	// Формируем маппинг для фронта
	typeRange := map[string][2]int{}
	for k, v := range ClickTypeRange {
		typeRange[string(k)] = v
	}
	for c := range h.clients {
		err := c.conn.WriteJSON(map[string]interface{}{
			"count":  h.count,
			"goal":   h.goal,
			"online": len(h.clients),
			"clickTypeRange": typeRange,
		})
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

func (h *Hub) handleClick(ip string, add int) (bool, ClickType) {
	now := time.Now().UnixNano()
	h.lock.Lock()
	defer h.lock.Unlock()
	last, ok := h.lastClick[ip]
	if !ok || float64(now-last) >= 3e8 {
		var clickType ClickType = ClickNormal
		switch {
		case add >= ClickTypeRange[ClickLegendary][0]:
			clickType = ClickLegendary
		case add >= ClickTypeRange[ClickCrit][0]:
			clickType = ClickCrit
		}
		h.count += add
		h.lastClick[ip] = now
		return true, clickType
	}
	return false, ClickNormal
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
	hub.broadcastCount() // обновить онлайн сразу
	defer func() {
		hub.lock.Lock()
		delete(hub.clients, client)
		hub.lock.Unlock()
		hub.broadcastCount() // обновить онлайн после выхода
		conn.Close()
	}()
	// send initial count and goal
	client.conn.WriteJSON(map[string]interface{}{"count": hub.count, "goal": hub.goal, "online": len(hub.clients)})
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
			if ok, clickType := hub.handleClick(ip, add); ok {
				for c := range hub.clients {
					err := c.conn.WriteJSON(map[string]interface{}{
						"count":  hub.count,
						"goal":   hub.goal,
						"online": len(hub.clients),
						"clickType": string(clickType),
						"clickValue": add,
					})
					if err != nil {
						c.conn.Close()
						delete(hub.clients, c)
					}
				}
			}
		} else if msg["action"] == "ping" {
			// просто ответить pong
			conn.WriteJSON(map[string]interface{}{"pong": true, "online": len(hub.clients)})
			continue
		}
	}
}

type ClickType string

const (
	ClickNormal    ClickType = "normal"
	ClickCrit      ClickType = "crit"
	ClickLegendary ClickType = "legendary"
)

var ClickTypeRange = map[ClickType][2]int{
	ClickNormal:    {1, 1},
	ClickCrit:      {5, 10},
	ClickLegendary: {150, 200},
}

var ClickTypeChance = map[ClickType]float64{
	ClickLegendary: 0.05, // 5%
	ClickCrit:      0.20, // 20%
	ClickNormal:    0.75, // 75% (остаток)
}

func main() {
	http.HandleFunc("/ws", wsHandler)
	log.Println("Listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
