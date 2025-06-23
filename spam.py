import websocket
import json
import time

WS_URL = "ws://localhost:8080/ws"  # замените на свой адрес, если нужно

def on_open(ws):
    print("Соединение открыто, начинаю спамить кликами...")
    def run():
        while True:
            ws.send(json.dumps({"action": "click"}))
            time.sleep(0.05)  # 20 кликов в секунду
    import threading
    threading.Thread(target=run, daemon=True).start()

def on_message(ws, message):
    data = json.loads(message)
    if "count" in data:
        print(f"Текущий счетчик: {data['count']}")

def on_error(ws, error):
    print("Ошибка:", error)

def on_close(ws, close_status_code, close_msg):
    print("Соединение закрыто")

if __name__ == "__main__":
    ws = websocket.WebSocketApp(
        WS_URL,
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close
    )
    ws.run_forever()