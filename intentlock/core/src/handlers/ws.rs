use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::Response,
};
use futures::{sink::SinkExt, stream::StreamExt};
use tokio::sync::mpsc;
use tracing::debug;

use crate::AppState;

pub async fn ws_handler(ws: WebSocketUpgrade, State(state): State<AppState>) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: AppState) {
    let (mut sender, mut receiver) = socket.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();

    {
        let mut peers = state.ws_clients.lock().await;
        peers.push(tx);
    }

    let send_task = tokio::spawn(async move {
        while let Some(message) = rx.recv().await {
            if sender.send(Message::Text(message)).await.is_err() {
                break;
            }
        }
    });

    let receive_task = tokio::spawn(async move {
        while let Some(Ok(message)) = receiver.next().await {
            match message {
                Message::Ping(payload) => debug!(size = payload.len(), "ws ping"),
                Message::Close(_) => break,
                _ => {}
            }
        }
    });

    let _ = tokio::join!(send_task, receive_task);
}

