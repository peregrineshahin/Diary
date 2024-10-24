import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./styles.scss";

function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const validateUsername = (username: string) => {
    const usernameRegex =
      /^[a-zA-Z]([._-](?![._-])|[a-zA-Z0-9]){1,18}[a-zA-Z0-9]$/;
    return usernameRegex.test(username);
  };

  const validatePassword = (password: string) => {
    const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateUsername(username)) {
      toast.error(
        "Username must start with a letter and be between 3-20 characters, allowing letters, numbers, dots, hyphens, and underscores.",
      );
      return;
    }

    if (!validatePassword(password)) {
      toast.error(
        "Password must be at least 8 characters, include 1 uppercase, 1 lowercase, and 1 number.",
      );
      return;
    }

    if (password !== repeatPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/backend/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      setIsLoading(false);

      if (response.ok) {
        const delay = 300;
        toast.success("Account created! Redirecting to login...", {
          autoClose: delay,
        });

        setTimeout(() => {
          navigate("/login");
        }, delay);
      } else if (response.status === 400) {
        const data = await response.json();
        toast.error(data || "Registration failed. Please check your inputs.");
      } else {
        toast.error("Internal server error. Please try again later.");
      }
    } catch (error) {
      setIsLoading(false);
      toast.error("Network error. Please check your connection.");
    }
  };

  return (
    <div className="Register">
      <h1>Register Your Account</h1>
      <form onSubmit={handleRegister}>
        <label>Username:</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          disabled={isLoading}
        />
        <label>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
        />
        <label>Repeat Password:</label>
        <input
          type="password"
          value={repeatPassword}
          onChange={(e) => setRepeatPassword(e.target.value)}
          required
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Registering..." : "Register"}
        </button>
      </form>
    </div>
  );
}

export default Register;
