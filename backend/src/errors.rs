use actix_web::{HttpResponse, ResponseError};
use rusqlite::Error as RusqliteError;
use std::fmt;

#[derive(Debug)]
pub enum AppError {
  DatabaseError(RusqliteError),
  Argon2Error(argon2::password_hash::Error),
  InvalidCredentials,
  SessionError(actix_session::SessionInsertError),
  Unauthorized,
  BadRequest(String),
}

impl fmt::Display for AppError {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    match self {
      AppError::DatabaseError(err) => write!(f, "Database error: {}", err),
      AppError::Argon2Error(err) => write!(f, "Password hash error: {}", err),
      AppError::InvalidCredentials => write!(f, "Invalid credentials"),
      AppError::SessionError(err) => write!(f, "Session error: {}", err),
      AppError::Unauthorized => write!(f, "Unauthorized access"),
      AppError::BadRequest(msg) => write!(f, "Bad request: {}", msg),
    }
  }
}

impl ResponseError for AppError {
  fn error_response(&self) -> HttpResponse {
    match self {
      AppError::DatabaseError(_) => {
        HttpResponse::InternalServerError().json("Database error")
      }
      AppError::Argon2Error(_) => {
        HttpResponse::InternalServerError().json("Password hash error")
      }
      AppError::InvalidCredentials => {
        HttpResponse::Unauthorized().json("Invalid credentials")
      }
      AppError::SessionError(_) => {
        HttpResponse::InternalServerError().json("Session error")
      }
      AppError::Unauthorized => {
        HttpResponse::Forbidden().json("Unauthorized access")
      }
      AppError::BadRequest(msg) => {
        HttpResponse::BadRequest().json(msg)
      }
    }
  }
}

impl From<rusqlite::Error> for AppError {
  fn from(err: rusqlite::Error) -> Self {
    AppError::DatabaseError(err)
  }
}

impl From<argon2::password_hash::Error> for AppError {
  fn from(err: argon2::password_hash::Error) -> Self {
    AppError::Argon2Error(err)
  }
}

impl From<actix_session::SessionInsertError> for AppError {
  fn from(err: actix_session::SessionInsertError) -> Self {
    AppError::SessionError(err)
  }
}
