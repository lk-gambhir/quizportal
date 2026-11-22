// Full-width blue bar: app name in the left corner; tab, user and logout in the right corner.
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { logout } from '../services/auth.js';

export default function Header({ user }) {
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="header">
      <Link to="/" className="brand">Quiz Portal</Link>
      <nav className="header-right">
        {/* Faculty manage quizzes; students take them. Each role sees only its own tab. */}
        <NavLink to={user.isAdmin ? '/admin' : '/student'} className="tab">
          {user.isAdmin ? 'Manage quizzes' : 'My quizzes'}
        </NavLink>
        <span className="user">
          {user.name}
          <span className="role">{user.isAdmin ? 'Faculty' : 'Student'}</span>
        </span>
        <button type="button" className="logout" onClick={handleLogout}>Log out</button>
      </nav>
    </header>
  );
}
