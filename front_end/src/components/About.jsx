import meates from "../assets/image/meates.png";

export default function About(){
    return(
        <div id="about" className="about">
            <div className="about-container">
              <div className="about-img-wrapper">
                  <img src={meates} alt="М'ясні вироби" className="about-image" />

                  <div className="about-image-badge">
                      <span className="badhe-num">11+</span>
                      <span className="badge-text">категорій товарів</span>
                  </div>
              </div>

                <div className="about-content">
                    <div className="about-page">ПРО НАС</div>

                    <h2 className="about-title">
                        М'ясо від виробника — <br />
                        <span>без посередників</span>
                    </h2>

                    <p className="about-text">
                        Ми самі вирощуємо, обробляємо та коптимо — від ферми до прилавка. Жодних перекупників, жодних зайвих рук.
                    </p>

                    <p className="about-text">
                        Власна коптильня на дубових дровах, свій засолювальний цех, перевірена сировина — все під одним дахом.
                    </p>

                    <p className="about-text highlight">
                        Ви точно знаєте, що їсте.
                    </p>
                </div>

                <div className="about-stats">
                    <div className="stat-item">
                        <span className="stat-num">50+</span>
                        <span className="stat-label">ВИДІВ ПРОДУКЦІЇ</span>
                    </div>

                    <div className="stat-item">
                        <span className="stat-num">100%</span>
                        <span className="stat-label">НАТУРАЛЬНИЙ СКЛАД</span>
                    </div>

                    <div className="stat-item">
                        <span className="stat-num">11+</span>
                        <span className="stat-label">КАТЕГОРІЙ</span>
                    </div>
                </div>
            </div>
        </div>
    );
}


