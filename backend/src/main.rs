use actix_cors::Cors;
use actix_session::{storage::CookieSessionStore, SessionMiddleware};
use actix_web::http;
use actix_web::{cookie::Key, cookie::SameSite, web, App, HttpServer};
use dotenv::dotenv;
use std::env;
use std::sync::Mutex;

mod auth;
mod db;
mod errors;
mod routes;

use crate::db::init_db;
use crate::routes::config_routes;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
  dotenv().ok();

  init_db().expect("Failed to initialize the database");

  let conn = web::Data::new(Mutex::new(db::get_connection().unwrap()));
  let secret_key = Key::generate();

  let frontend_server_url = env::var("FRONTEND_SERVER_URL")
    .unwrap_or_else(|_| "http://localhost:3000".to_string());
  println!("{}", frontend_server_url);
  let backend_server_url = env::var("BACKEND_SERVER_URL")
    .unwrap_or_else(|_| "127.0.0.1:8080".to_string());

  println!("Server is running at {}", backend_server_url);

  HttpServer::new(move || {
    let cors = Cors::default()
      .allowed_origin(&frontend_server_url)
      .allowed_methods(vec!["GET", "POST", "PUT", "DELETE"])
      .allowed_headers(vec![http::header::AUTHORIZATION, http::header::ACCEPT])
      .allowed_header(http::header::CONTENT_TYPE)
      .supports_credentials();

    App::new()
      .wrap(cors)
      .app_data(conn.clone())
      .wrap(
        SessionMiddleware::builder(
          CookieSessionStore::default(),
          secret_key.clone(),
        )
        .cookie_same_site(SameSite::None)
        .build(),
      )
      .configure(config_routes)
  })
  .bind(backend_server_url)?
  .run()
  .await
}
