const contactItems = [
    {
        label: 'Адреса',
        lines: ['м. Коломия, вул. Шевченка, 14', 'Ринок, павільйон №7'],
        icon: '📍',
    },
    {
        label: 'Години роботи',
        lines: ['Пн–Пт: 7:00 — 19:00', 'Сб–Нд: 7:00 — 17:00'],
        icon: '🕒',
    },
    {
        label: 'Телефони',
        lines: ['+38 (050) 123-45-67', '+38 (067) 891-23-45'],
        icon: '📞',
    },
    {
        label: 'Email',
        lines: ['cheremshyna@gmail.com'],
        icon: '✉️',
    },
];

export default function Contacts() {
    function handleSubmit(event) {
        event.preventDefault();
    }

    return (
        <section id="contacts" className="contacts">
            <div className="container py-5">
                <div className="row align-items-center g-5">
                    <div className="col-lg-6">
                        <p className="contacts-badge mb-3">Де нас знайти</p>
                        <h2 className="contacts-title mb-4">Завітайте до нас</h2>

                        <ul className="list-unstyled mb-0">
                            {contactItems.map((item) => (
                                <li key={item.label} className="d-flex gap-3 mb-4">
                                    <span className="contacts-icon" aria-hidden="true">
                                        {item.icon}
                                    </span>
                                    <div>
                                        <p className="contacts-label mb-1">{item.label}</p>
                                        {item.lines.map((line) => (
                                            <p key={line} className="contacts-text mb-0">
                                                {line}
                                            </p>
                                        ))}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="col-lg-6">
                        <div className="contacts-form-card p-4 p-md-5">
                            <h3 className="contacts-form-title mb-2">Швидке замовлення</h3>
                            <p className="contacts-form-hint mb-4">
                                Залиште контакти — ми зателефонуємо і оформимо замовлення
                            </p>

                            <form onSubmit={handleSubmit}>
                                <div className="mb-3">
                                    <input
                                        type="text"
                                        className="form-control contacts-input"
                                        placeholder="Ваше ім'я"
                                        name="name"
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <input
                                        type="tel"
                                        className="form-control contacts-input"
                                        placeholder="Номер телефону"
                                        name="phone"
                                        required
                                    />
                                </div>
                                <div className="mb-4">
                                    <textarea
                                        className="form-control contacts-input"
                                        placeholder="Що бажаєте замовити?"
                                        name="order"
                                        rows="3"
                                    />
                                </div>
                                <button type="submit" className="btn contacts-submit w-100">
                                    Надіслати заявку
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
