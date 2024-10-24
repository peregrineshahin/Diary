use crate::db::{self, DateFilter, NewEntry, NewUser};
use crate::errors::AppError;
use actix_session::Session;
use actix_web::{web, HttpResponse};
use chrono::NaiveDate;
use serde::Deserialize;
use std::sync::Mutex;

pub fn config_routes(cfg: &mut web::ServiceConfig) {
  cfg
    .service(web::resource("/api/register").route(web::post().to(register)))
    .service(web::resource("/api/login").route(web::post().to(login)))
    .service(web::resource("/api/logout").route(web::post().to(logout)))
    .service(
      web::resource("/api/entries/{user_id}")
        .route(web::get().to(get_entries))
        .route(web::post().to(add_entry)),
    )
    .service(
      web::resource("/api/entries/{user_id}/delete_multiple")
        .route(web::post().to(delete_multiple_entries)),
    )
    .service(
      web::resource("/api/entries/{user_id}/{entry_id}")
        .route(web::put().to(edit_entry))
        .route(web::delete().to(delete_entry)),
    )
    .service(web::resource("/api/session").route(web::get().to(get_session)));
}

pub async fn get_session(session: Session) -> HttpResponse {
  if let Some(user_id) = session.get::<i32>("user_id").unwrap() {
    if let Some(username) = session.get::<String>("username").unwrap() {
      return HttpResponse::Ok().json(serde_json::json!({
          "user_id": user_id,
          "username": username
      }));
    }
  }
  HttpResponse::Ok()
    .json(serde_json::json!({ "user_id": null, "username": null }))
}

fn authorize_user(session: &Session, user_id: i32) -> Result<(), AppError> {
  let session_user_id = session
    .get::<i32>("user_id")
    .map_err(|_| AppError::Unauthorized)?;

  match session_user_id {
    Some(id) if id == user_id => Ok(()),
    _ => Err(AppError::Unauthorized),
  }
}

pub async fn register(
  new_user: web::Json<NewUser>,
  db: web::Data<Mutex<rusqlite::Connection>>,
) -> Result<HttpResponse, AppError> {
  match db::register_user(&db.lock().unwrap(), &new_user) {
    Ok(_) => Ok(HttpResponse::Ok().json("User registered successfully")),
    Err(AppError::BadRequest(msg)) => Ok(HttpResponse::BadRequest().json(msg)),
    Err(AppError::DatabaseError(_)) => {
      Ok(HttpResponse::InternalServerError().json("Internal server error"))
    }
    Err(e) => Err(e),
  }
}

pub async fn login(
  user: web::Json<NewUser>,
  db: web::Data<Mutex<rusqlite::Connection>>,
  session: Session,
) -> Result<HttpResponse, AppError> {
  match db::login_user(&db.lock().unwrap(), &user) {
    Ok((user_id, username)) => {
      session
        .insert("user_id", user_id)
        .map_err(AppError::SessionError)?;
      session
        .insert("username", username)
        .map_err(AppError::SessionError)?;

      Ok(HttpResponse::Ok().json("Login successful"))
    }
    Err(AppError::InvalidCredentials) => {
      Ok(HttpResponse::Unauthorized().json("Invalid username or password"))
    }
    Err(e) => Err(e),
  }
}

pub async fn logout(session: Session) -> HttpResponse {
  session.purge();
  HttpResponse::Ok().json("Logged out successfully")
}

#[derive(Deserialize)]
pub struct DateQueryParams {
  date_from: Option<NaiveDate>,
  date_to: Option<NaiveDate>,
}

pub async fn get_entries(
  user_id: web::Path<i32>,
  session: Session,
  db: web::Data<Mutex<rusqlite::Connection>>,
  query: web::Query<DateQueryParams>,
) -> Result<HttpResponse, AppError> {
  authorize_user(&session, *user_id)?;

  let conn = db.lock().unwrap();

  let date_filter = match (query.date_from, query.date_to) {
    (Some(from), Some(to)) => DateFilter::Range(from, to),
    (Some(from), None) => DateFilter::Single(from),
    _ => DateFilter::None,
  };

  let entries = db::get_user_entries(&conn, *user_id, date_filter)?;

  Ok(HttpResponse::Ok().json(entries))
}

pub async fn add_entry(
  user_id: web::Path<i32>,
  session: Session,
  new_entry: web::Json<NewEntry>,
  db: web::Data<Mutex<rusqlite::Connection>>,
) -> Result<HttpResponse, AppError> {
  authorize_user(&session, *user_id)?;

  db::add_user_entry(&db.lock().unwrap(), *user_id, &new_entry)?;

  Ok(HttpResponse::Ok().json("Entry added successfully"))
}

pub async fn edit_entry(
  path: web::Path<(i32, i32)>,
  session: Session,
  new_entry: web::Json<NewEntry>,
  db: web::Data<Mutex<rusqlite::Connection>>,
) -> Result<HttpResponse, AppError> {
  let (user_id, entry_id) = path.into_inner();
  authorize_user(&session, user_id)?;

  db::edit_user_entry(&db.lock().unwrap(), user_id, entry_id, &new_entry)?;
  Ok(HttpResponse::Ok().json("Entry updated successfully"))
}

pub async fn delete_entry(
  path: web::Path<(i32, i32)>,
  session: Session,
  db: web::Data<Mutex<rusqlite::Connection>>,
) -> Result<HttpResponse, AppError> {
  let (user_id, entry_id) = path.into_inner();
  authorize_user(&session, user_id)?;
  db::delete_user_entry(&db.lock().unwrap(), user_id, entry_id)?;
  Ok(HttpResponse::Ok().json("Entry deleted successfully"))
}

#[derive(Deserialize)]
pub struct DeleteMultipleEntries {
  entry_ids: Vec<i32>,
}

pub async fn delete_multiple_entries(
  user_id: web::Path<i32>,
  session: Session,
  data: web::Json<DeleteMultipleEntries>,
  db: web::Data<Mutex<rusqlite::Connection>>,
) -> Result<HttpResponse, AppError> {
  authorize_user(&session, *user_id)?;
  let conn = db.lock().unwrap();
  let entry_ids = &data.entry_ids;

  for entry_id in entry_ids {
    db::delete_user_entry(&conn, *user_id, *entry_id)?;
  }

  Ok(HttpResponse::Ok().json("Selected entries deleted successfully"))
}
