import meat2 from '../assets/image/meat2.png';


const principlesData = [
    {
        id: 1,

        title: 'Власне виробництво',
        description: 'Від ферми до прилавка — жодного посередника. Ми самі вирощуємо, обробляємо та коптимо.'
    },
    {
        id: 2,

        title: 'Власна ферма',
        description: 'Тварини вирощені на відкритому повітрі, на натуральних кормах — без гормонів і антибіотиків.'
    },
    {
        id: 3,

        title: 'Перевірені рецепти',
        description: 'Кожен рецепт пройшов довгий шлях відбору — лишилося тільки те, що справді смачно.'
    },
    {
        id: 4,

        title: 'Без консервантів',
        description: 'Тільки сіль, перець, часник та трави з Карпат. Жодних Е-добавок, нітритів чи підсилювачів.'
    }
];


export default function Principles(){
    return(
        <section className="principles">
            <div className="princilpes-container">


                <div className="principles-header">
                    <div className="principles-badge">НАШІ ПРИНЦИПИ</div>
                    <h2 className="principles-title">
                        Чому «Черемшина» — це якість
                    </h2>
                </div>

                <div className="principles-grid">
                    {principlesData.map((item) => (
                        <div key={item.id} className="principle-card">
                            <div className="principle-icon">{item.icon}</div>
                            <h3 className="principle-card-title">{item.title}</h3>
                            <p className="principle-card-desc">{item.description}</p>
                        </div>

                    ))}
                </div>

                <div className="principles-banner">
                    <img src={meat2} alt="meat" className="principle-card-img" />
                </div>
            </div>
        </section>
    )
}