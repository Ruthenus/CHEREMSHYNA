import styled from 'styled-components';

const FooterBar = styled.footer`
    background: #0e0406;
    border-top: 1px solid #2b1114;
    color: #d1c5c7;
    padding: 56px 0 24px;
`;

const Inner = styled.div`
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
    display: grid;
    grid-template-columns: 1.5fr 1fr 1fr;
    gap: 48px;

    @media (max-width: 768px) {
        grid-template-columns: 1fr;
        gap: 32px;
    }
`;

const LogoTop = styled.span`
    display: block;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 11px;
    font-weight: bold;
    letter-spacing: 2.5px;
    color: #f3e8d3;
    margin-bottom: 3px;
`;

const LogoMain = styled.span`
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 22px;
    font-weight: 900;
    letter-spacing: 2px;
    color: #f3e8d3;
`;

const Trademark = styled.span`
    font-family: sans-serif;
    font-size: 9px;
    font-weight: bold;
    color: #d97724;
    margin-left: 3px;
    vertical-align: super;
`;

const Tagline = styled.p`
    margin: 16px 0 0;
    font-size: 14px;
    line-height: 1.6;
    color: #bda5a7;
    max-width: 280px;
`;

const ColumnTitle = styled.h3`
    margin: 0 0 16px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.8px;
    text-transform: uppercase;
    color: #a6a6a6;
`;

const FooterLink = styled.a`
    display: block;
    margin-bottom: 10px;
    color: #d1c5c7;
    text-decoration: none;
    font-size: 14px;
    transition: color 0.2s ease;

    &:hover {
        color: #f3e8d3;
    }
`;

const ContactLine = styled.p`
    margin: 0 0 8px;
    font-size: 14px;
    color: #d8c8c4;
`;

const Bottom = styled.div`
    width: 100%;
    max-width: 1200px;
    margin: 40px auto 0;
    padding: 20px 20px 0;
    border-top: 1px solid #2b1114;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 12px;
    color: #8a7376;

    @media (max-width: 768px) {
        flex-direction: column;
    }
`;

export default function Footer() {
    return (
        <FooterBar>
            <Inner>
                <div>
                    <LogoTop>ГАСТРОНОМ</LogoTop>
                    <LogoMain>
                        ЧЕРЕМШИНА<Trademark>™</Trademark>
                    </LogoMain>
                    <Tagline>
                        М'ясні вироби та делікатеси власного виробництва. Без посередників.
                    </Tagline>
                </div>

                <nav aria-label="Навігація в підвалі">
                    <ColumnTitle>Розділи</ColumnTitle>
                    <FooterLink href="#products">Продукція</FooterLink>
                    <FooterLink href="#about">Про нас</FooterLink>
                    <FooterLink href="#quality">Принципи якості</FooterLink>
                    <FooterLink href="#contacts">Контакти</FooterLink>
                </nav>

                <div>
                    <ColumnTitle>Контакти</ColumnTitle>
                    <ContactLine>м. Коломия, вул. Шевченка, 14</ContactLine>
                    <ContactLine>Ринок, павільйон №7</ContactLine>
                    <ContactLine>+38 (050) 123-45-67</ContactLine>
                    <ContactLine>cheremshyna@gmail.com</ContactLine>
                </div>
            </Inner>

            <Bottom>
                <span>© {new Date().getFullYear()} Гастроном «Черемшина»</span>
                <span>Власне виробництво · Коломия</span>
            </Bottom>
        </FooterBar>
    );
}
