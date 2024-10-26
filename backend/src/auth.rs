use crate::errors::AppError;
use argon2::{Argon2, PasswordHasher, PasswordVerifier};
use password_hash::{PasswordHash, SaltString};
use rand_core::OsRng;
use regex::Regex;

pub trait PasswordHandler {
  fn hash_password(password: &str) -> Result<String, AppError>;
  fn verify_password(hash: &str, password: &str) -> Result<(), AppError>;
}

impl PasswordHandler for Argon2<'_> {
  fn hash_password(password: &str) -> Result<String, AppError> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    argon2
      .hash_password(password.as_bytes(), &salt)
      .map(|hash| hash.to_string())
      .map_err(AppError::Argon2Error)
  }

  fn verify_password(hash: &str, password: &str) -> Result<(), AppError> {
    let parsed_hash: PasswordHash<'_> =
      PasswordHash::new(hash).map_err(AppError::Argon2Error)?;
    Argon2::default()
      .verify_password(password.as_bytes(), &parsed_hash)
      .map_err(|_| AppError::InvalidCredentials)
  }
}

pub fn validate_username(username: &str) -> Result<(), AppError> {
  let username_pattern =
    Regex::new(r"^[a-zA-Z][a-zA-Z0-9._-]{1,18}[a-zA-Z0-9]$").unwrap();

  if !username_pattern.is_match(username) {
    return Err(AppError::BadRequest("Invalid username format.".into()));
  }

  let chars = ['.', '_', '-'];
  if username.chars().collect::<Vec<_>>().windows(2).any(|w| {
    matches!(w, [a, b] if chars.contains(&a) && ['.', '_', '-'].contains(&b))
  }) {
    return Err(AppError::BadRequest(
      "Username cannot have consecutive special characters.".into(),
    ));
  }

  Ok(())
}
