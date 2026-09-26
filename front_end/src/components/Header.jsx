import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function Avatar({ user }) {
    const letter = user.name.trim().charAt(0).toUpperCase() || 'К';

    return (
        <span className="user-avatar">
            {user.photo ? <img src={user.photo} alt={user.name} /> : <span>{letter}</span>}
        </span>
    );
}

export default function Header({ cart }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    const firstName = user?.name?.trim().split(' ')[0] || '';

    useEffect(() => {
        if (location.pathname !== '/' || !location.hash) return;
        const frame = requestAnimationFrame(() => {
            document.getElementById(location.hash.slice(1))?.scrollIntoView({
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
                block: 'start',
            });
        });
        return () => cancelAnimationFrame(frame);
    }, [location]);

    useEffect(() => {
        function handleClick(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    function handleLogout() {
        logout();
        setMenuOpen(false);
        navigate('/');
    }

    return (
        <header className="header">
            <div className="header-container">
                <Link to="/" className="logo">
                    <span className="logo-top">ГАСТРОНОМ</span>
                    <span className="logo-main">
                        ЧЕРЕМШИНА<span className="trademark">™</span>
                    </span>
                </Link>
                <nav className="nav-menu" aria-label="Основна навігація">
                    <Link to="/#products">ПРОДУКЦІЯ</Link>
                    <Link to="/#about">ПРО НАС</Link>
                    <Link to="/#quality">ЯКІСТЬ</Link>
                    <Link to="/#contacts">КОНТАКТИ</Link>
                </nav>

                <div className="header-actions">
                    <Link to="/cart" className="cart-btn" aria-label="Кошик">
                        🛒
                        <span className="cart-badge">{cart?.length ?? 0}</span>
                    </Link>

                    {user ? (
                        <div className="user-menu dropdown" ref={menuRef}>
                            <button
                                className="user-menu-btn btn btn-outline-light d-flex align-items-center gap-2"
                                type="button"
                                aria-expanded={menuOpen}
                                onClick={() => setMenuOpen((open) => !open)}
                            >
                                <Avatar user={user} />
                                <span className="user-menu-name">{firstName}</span>
                            </button>

                            <ul className={`dropdown-menu dropdown-menu-end user-dropdown ${menuOpen ? 'show' : ''}`}>
                                <li className="dropdown-item-text user-dropdown-email">{user.email}</li>
                                <li>
                                    <hr className="dropdown-divider" />
                                </li>
                                <li>
                                    <Link
                                        className="dropdown-item"
                                        to="/cabinet"
                                        onClick={() => setMenuOpen(false)}
                                    >
                                        Мій кабінет
                                    </Link>
                                </li>
                                <li>
                                    <button className="dropdown-item" type="button" onClick={handleLogout}>
                                        Вийти
                                    </button>
                                </li>
                            </ul>
                        </div>
                    ) : (
                        <Link to="/login" className="btn-login">
                            Увійти
                        </Link>
                    )}

                    <Link to="/cart" className="btn-order">
                        Замовити
                    </Link>
                </div>
            </div>
        </header>
    );
}
