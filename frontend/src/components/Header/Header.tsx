import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSignOutAlt, faUser } from "@fortawesome/free-solid-svg-icons";
import "./styles.scss";
import { MouseEventHandler } from "react";

const Header = (props: {
  username: string;
  handleLogout: MouseEventHandler<HTMLButtonElement>;
}) => {
  const { username, handleLogout } = props;
  return (
    <header className="modern-header">
      <div className="header-content">
        <div className="username-section">
          <FontAwesomeIcon icon={faUser} className="user-icon" />
          <span className="username">Hi, {username}</span>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <FontAwesomeIcon icon={faSignOutAlt} className="logout-icon" />
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
