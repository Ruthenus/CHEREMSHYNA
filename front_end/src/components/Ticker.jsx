import React from 'react';

const items = [
    { id:  1, text: "М'ясо власного виробництва"},
    { id: 2, text: "Домашні соуси" },
    { id: 3, text: "Домашня ковбаса" },
    { id: 4, text: "Свіжі сири" },
    { id: 5, text: "Свіжообсмажена кава" },
    { id: 6, text: "Мариновані делікатеси" },
    { id: 7, text: "Хліб щодня" },
    { id: 8, text: "Без консервантів" }
]

export default function Ticker(){
    return(
        <div className="ticker-track">
            {[...items,...items].map((item, index) => (
                <div className="ticker-item" key={index}>
                    {item.text}
                </div>
            ))}
        </div>
    );

}