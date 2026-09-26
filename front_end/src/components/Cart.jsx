import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Cart({ cart, setCart }) {
    const { user } = useAuth();
    const navigate = useNavigate();

    const total = cart.reduce((sum, product) => {
        return sum + product.price * (product.quantity || 1);
    }, 0);

    function handleCheckout() {
        if (!user) {
            navigate('/login');
            return;
        }

        navigate('/order');

    }
    function increaseQuantityIndex(index){
        setCart(prevCart =>
            prevCart.map((product, i) =>
            i === index
                ?{
                   ...product,
                   quantity: (product.quantity || 1)+ 1
                }
                : product
            )
        );
    }

   function decreaseQuantityIndex(index){
        setCart(prevCart =>
                 prevCart.map((product, i) => {
                     if(i !== index) return product;

                     const quantity = product.quantity || 1;

                     return{
                         ...product,
                         quantity: quantity - 1
                     };
                 })
                     .filter(product => product.quantity > 0)

        );
   }

   function removeQuantityIndex(index){
        setCart(prevCart =>
           prevCart.filter((product, i) => i !== index)
        );
   }



    return (
        <div className="cart-page">

            <div className="container py-5">

                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h1>Кошик</h1>

                    {cart.length > 0 && (
                        <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => setCart([])}
                        >
                            Очистити кошик
                        </button>
                    )}
                </div>

                {cart.length === 0 ? (

                    <p>Ваш кошик порожній</p>

                ) : (

                    <div className="row g-4">


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
                                                {product.price}  ₴ {product.quantity|| 1}
                                                {' = '}
                                                {product.price * (product.quantity || 1)} ₴
                                            </p>
                                        </div>

                                        <div className="d-flex align-items-center gap-2">

                                            <button className="btn quantity-btn"
                                                    onClick={() => decreaseQuantityIndex(index)}
                                            >
                                                -
                                            </button>

                                            <span>{product.quantity || 1}</span>

                                            <button className="btn quantity-btn"
                                                    onClick={() => increaseQuantityIndex(index)}
                                            >
                                                +
                                            </button>

                                            <button
                                                className="btn btn-link"
                                                onClick={() => removeQuantityIndex(index)}
                                            >
                                                ×
                                            </button>

                                        </div>

                                    </div>

                                </div>

                            ))}

                        </div>



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

                                    <button className="btn btn-primary w-100 mt-4" type="button" onClick={handleCheckout}>
                                        ОФОРМИТИ ЗАМОВЛЕННЯ
                                    </button>

                                    <p className="text-center mt-3 mb-0">
                                        <Link to="/" className="no-underline">← Продовжити покупки</Link>
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
