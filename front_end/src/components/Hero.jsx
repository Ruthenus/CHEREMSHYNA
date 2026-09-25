import meat from '../assets/image/meat.png';
export default function Hero(){
    return(
          <section className="hero">
              <div className="hero-container">
                  <div className="hero-content">
                      <div className="hero-badge">
                          М'ЯСНІ ВИРОБИ ТА ДЕЛІКАТЕСИ ВЛАСНОГО ВИРОБНИЦТВА
                      </div>

                      <h1 className="hero-title">
                          ГАСТРОНОМ <br />
                          <span className="hero-title-cursive">«Черемшина»</span>
                      </h1>

                      <p className="hero-description">
                          Справжня домашня ковбаса, копченості, сири та делікатеси власного виробництва. Жодного консерванту.
                          Тільки м'ясо, сіль і любов до справи.

                      </p>

                      <div className="hero-buttons">
                          <button className="btn-primary">ВСЯ ПРОДУКЦІЯ</button>
                          <button className="btn-secondary">ПРО НАС</button>
                      </div>
                  </div>

                  <div className="hero-image-wrapper">
                      <div className="hero-badge-top">
                          <span className="badge-percent">100%</span>
                          <span className="badge-text">НАТУРАЛЬНІ ПРОДУКТИ</span>
                      </div>

                      <img src={meat} alt="meat" className="hero-image" />

                      <div className="hero-footer-bar">
                          <div className="hero-badge-bottom">
                              <span className="badge-num">50+</span>
                              <span className="badge-sub">ВИДІВ ПРОДУКЦІЇ</span>
                          </div>
                          <p className="hero-quote">Майстерність у кожному шматочку</p>
                      </div>
                  </div>
              </div>
          </section>
    )
}