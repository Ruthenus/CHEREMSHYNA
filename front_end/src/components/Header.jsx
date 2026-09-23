

export default function Header(){
      return(
          <header className="header">
              <div className="header-container">
                  <div className="logo">
                      <span className="logo-top">ГАСТРОНОМ</span>
                      <span className="logo-main">ЧЕРЕМШИНА<span className="trademark">™</span></span>
                  </div>
              <nav className="nav-menu">
                  <a href="#products"></a>
                  <a href="#about"></a>
                  <a href="#quality"></a>
                  <a href="#contacts"></a>
              </nav>

               <div className="header-actions">
                   <button className="cart-btn" aria-lable="Кошик">🛒<span className="cart-badge" >0</span>
                   </button>
                   <button className="btn-login">Увійти</button>
                   <button className="btn-order">Замовити</button>
               </div>

              </div>
          </header>
      );
}

