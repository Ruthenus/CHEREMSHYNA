import { Link } from "react-router-dom";

export default function Header({cart}){
      return(
          <header className="header">
              <div className="header-container">
                  <Link to="/" className="logo">
                      <span className="logo-top">ГАСТРОНОМ</span>
                      <span className="logo-main">ЧЕРЕМШИНА<span className="trademark">™</span></span>
                  </Link>
              <nav className="nav-menu">
                  <a href="#products"></a>
                  <a href="#about"></a>
                  <a href="#quality"></a>
                  <a href="#contacts"></a>
              </nav>

               <div className="header-actions">
                   <Link to="/cart" className="cart-btn" aria-label="Кошик">🛒<span className="cart-badge">{cart?.length ?? 0}</span>
                   </Link>
                   <Link to="/login" className="btn-login">Увійти</Link>
                   <button className="btn-order">Замовити</button>
               </div>

              </div>
          </header>
      );
}

