export default function Cart({ cart }) {
    const total = cart.reduce((sum, product) => {
        return sum + product.price;
    }, 0);

    return (
        <div className="cart-page">

            <div className="container py-5">

                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h1>Кошик</h1>

                    {cart.length > 0 && (
                        <button className="btn btn-outline-secondary">
                            Очистити кошик
                        </button>
                    )}
                </div>

                {cart.length === 0 ? (

                    <p>Ваш кошик порожній</p>

                ) : (

                    <div className="row g-4">

                        {/* Товари */}
                        <div className="col-lg-8">

                            {cart.map((product, index) => (

                                <div
                                    className="card mb-3"
                                    key={index}
                                >

                                    <div className="card-body d-flex justify-content-between align-items-center">

                                        <div>
                                            <small className="text-uppercase">
                                                КОВБАСИ
                                            </small>

                                            <h5 className="card-title">
                                                {product.name}
                                            </h5>

                                            <p className="card-text">
                                                {product.price} ₴ × 1 = {product.price} ₴
                                            </p>
                                        </div>

                                        <div className="d-flex align-items-center gap-2">

                                            <button className="btn quantity-btn">
                                                −
                                            </button>

                                            <span>1</span>

                                            <button className="btn quantity-btn">
                                                +
                                            </button>

                                            <button className="btn btn-link">
                                                ×
                                            </button>

                                        </div>

                                    </div>

                                </div>

                            ))}

                        </div>


                        {/* Підсумок */}
                        <div className="col-lg-4">

                            <div className="card">

                                <div className="card-body">

                                    <h4 className="card-title mb-4">
                                        Підсумок
                                    </h4>

                                    {cart.map((product, index) => (

                                        <div
                                            className="d-flex justify-content-between mb-3"
                                            key={index}
                                        >
                                            <span>
                                                {product.name} ×1
                                            </span>

                                            <strong>
                                                {product.price} ₴
                                            </strong>
                                        </div>

                                    ))}

                                    <hr />

                                    <div className="d-flex justify-content-between align-items-center">

                                        <span>
                                            Разом:
                                        </span>

                                        <strong className="fs-4">
                                            {total} ₴
                                        </strong>

                                    </div>

                                    <button className="btn btn-primary w-100 mt-4">
                                        ОФОРМИТИ ЗАМОВЛЕННЯ
                                    </button>

                                    <p className="text-center mt-3 mb-0">
                                        ← Продовжити покупки
                                    </p>

                                </div>

                            </div>

                        </div>

                    </div>

                )}

            </div>

        </div>
    );
}