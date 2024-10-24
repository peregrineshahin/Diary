use crate::{
  auth::{validate_username, PasswordHandler},
  errors::AppError,
};
use argon2::Argon2;
use chrono::{Local, NaiveDate};
use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::env;

pub enum DateFilter {
  None,
  Single(NaiveDate),
  Range(NaiveDate, NaiveDate),
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NewUser {
  pub username: String,
  pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
  pub id: i32,
  pub username: String,
  pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NewEntry {
  pub content: String,
  pub recordings_map: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Entry {
  pub id: i32,
  pub user_id: i32,
  pub content: String,
  pub recordings_map: String,
  pub created_at: String,
}

pub fn get_connection() -> Result<Connection> {
  Connection::open(
    env::var("DATABASE_PATH")
      .unwrap_or_else(|_| "./src/self_diary.db".to_string()),
  )
}

fn execute_query(
  conn: &Connection,
  query: &str,
  query_params: &[&dyn rusqlite::ToSql],
) -> Result<usize> {
  conn.execute(query, query_params)
}

fn map_entries(row: &rusqlite::Row) -> Result<Entry, rusqlite::Error> {
  Ok(Entry {
    id: row.get(0)?,
    user_id: row.get(1)?,
    content: row.get(2)?,
    recordings_map: row.get(3)?,
    created_at: row.get(4)?,
  })
}

pub fn init_db() -> Result<()> {
  let conn = get_connection()?;
  conn.execute(
    "CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        )",
    [],
  )?;
  conn.execute(
    "CREATE TABLE IF NOT EXISTS entries (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            recordings_map TEXT DEFAULT '[]',  -- Column for JSON recordings_map
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )",
    [],
  )?;
  Ok(())
}

fn validate_password_strength(password: &str) -> Result<(), AppError> {
  let is_valid = password.len() >= 8
    && password.chars().any(|c| c.is_ascii_uppercase())
    && password.chars().any(|c| c.is_ascii_lowercase())
    && password.chars().any(|c| c.is_ascii_digit())
    && password.chars().any(|c| !c.is_ascii_alphanumeric());

  if !is_valid {
    return Err(AppError::BadRequest("Password must be at least 8 characters long, contain upper and lower case letters, a digit, and a special character".into()));
  }

  Ok(())
}

pub fn register_user(
  conn: &Connection,
  new_user: &NewUser,
) -> Result<(), AppError> {
  validate_username(&new_user.username)?;

  validate_password_strength(&new_user.password)?;

  let password_hash =
    <Argon2 as PasswordHandler>::hash_password(&new_user.password)?;

  let result = conn.execute(
        "INSERT INTO users (username, password_hash, created_at) VALUES (?1, ?2, ?3)",
        &[&new_user.username, &password_hash, &Local::now().to_string()],
    );

  match result {
    Ok(_) => Ok(()),
    Err(rusqlite::Error::SqliteFailure(_, Some(msg)))
      if msg.contains("UNIQUE constraint failed: users.username") =>
    {
      Err(AppError::BadRequest("Username is already taken".into()))
    }
    Err(e) => Err(AppError::DatabaseError(e)),
  }
}

pub fn login_user(
  conn: &Connection,
  user: &NewUser,
) -> Result<(i32, String), AppError> {
  let mut stmt = conn.prepare(
    "SELECT id, username, password_hash FROM users WHERE username = ?1",
  )?;

  let result = stmt.query_row(params![user.username], |row| {
    Ok((
      row.get::<_, i32>(0)?,
      row.get::<_, String>(1)?,
      row.get::<_, String>(2)?,
    ))
  });

  let (user_id, username, stored_hash) = match result {
    Ok(user_data) => user_data,
    Err(rusqlite::Error::QueryReturnedNoRows) => {
      return Err(AppError::InvalidCredentials);
    }
    Err(e) => {
      return Err(AppError::DatabaseError(e));
    }
  };

  <Argon2 as PasswordHandler>::verify_password(&stored_hash, &user.password)
    .map_err(|_| AppError::InvalidCredentials)?;

  Ok((user_id, username))
}

pub fn add_user_entry(
  conn: &Connection,
  user_id: i32,
  new_entry: &NewEntry,
) -> Result<()> {
  execute_query(
        conn,
        "INSERT INTO entries (user_id, content, recordings_map, created_at) VALUES (?1, ?2, ?3, ?4)",
        &[&user_id, &new_entry.content, &new_entry.recordings_map, &Local::now().to_string()],
    )?;
  Ok(())
}

pub fn edit_user_entry(
  conn: &Connection,
  user_id: i32,
  entry_id: i32,
  new_entry: &NewEntry,
) -> Result<()> {
  execute_query(
        conn,
        "UPDATE entries SET content = ?1, recordings_map = ?2 WHERE id = ?3 AND user_id = ?4",
        &[&new_entry.content, &new_entry.recordings_map, &entry_id, &user_id],
    )?;
  Ok(())
}

pub fn delete_user_entry(
  conn: &Connection,
  user_id: i32,
  entry_id: i32,
) -> Result<()> {
  execute_query(
    conn,
    "DELETE FROM entries WHERE id = ?1 AND user_id = ?2",
    &[&entry_id, &user_id],
  )?;
  Ok(())
}

fn build_date_filter(date_filter: DateFilter) -> (String, Vec<String>) {
  match date_filter {
    DateFilter::None => ("".to_string(), vec![]),
    DateFilter::Single(date) => {
      let query_part = " AND DATE(created_at) = ?2".to_string();
      let params = vec![date.to_string()];
      (query_part, params)
    }
    DateFilter::Range(start, end) => {
      let query_part = " AND DATE(created_at) BETWEEN ?2 AND ?3".to_string();
      let params = vec![start.to_string(), end.to_string()];
      (query_part, params)
    }
  }
}

pub fn get_user_entries(
  conn: &Connection,
  user_id: i32,
  date_filter: DateFilter,
) -> Result<Vec<Entry>, AppError> {
  let mut query =
        "SELECT id, user_id, content, recordings_map, created_at FROM entries WHERE user_id = ?1"
            .to_string();
  let mut params: Vec<String> = vec![user_id.to_string()];

  let (date_query_part, date_params) = build_date_filter(date_filter);
  query.push_str(&date_query_part);
  params.extend(date_params);

  let param_refs: Vec<&dyn rusqlite::ToSql> =
    params.iter().map(|s| s as &dyn rusqlite::ToSql).collect();

  let mut stmt = conn.prepare(&query)?;
  let entries = stmt
    .query_map(param_refs.as_slice(), map_entries)?
    .collect::<Result<Vec<_>, _>>()?;

  Ok(entries)
}
