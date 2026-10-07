# Команда seed_data підігнана під реальні поля моделей:
#   Category.emoji (у вихідному сіду було icon — серіалізатор віддає його як icon),
#   Product.slug та Product.external_id (обов'язкові й унікальні, у сіду їх не було),
#   Promotion.type (службові значення моделі, не дефіси в slug).
from decimal import Decimal


from django.core.management.base import BaseCommand
from django.utils.text import slugify

from catalog.models import Category, Product
from promotions.models import Promotion

CATEGORIES = [
    ('sausages', 'Ковбаси', '🥖', 1),
    ('smoked', 'Копченості', '🥓', 2),
    ('poultry', 'Птиця', '🍗', 3),
    ('pork', 'Свинина', '🥩', 4),
    ('cheeses', 'Сири', '🧀', 5),
    ('butter', 'Масло та жири', '🧈', 6),
    ('bakery', 'Хліб і випічка', '🍞', 7),
    ('drinks', 'Соки та напої', '🧃', 8),
    ('sauces', 'Соуси та приправи', '🧂', 9),
    ('canned', 'Консерви та мариновані', '🥫', 10),
    ('coffee', 'Кава та чай', '☕', 11),
    ('veggies', 'Свіжі овочі', '🥦', 12),
]

PRODUCTS = [
    ('sausages', 'Ковбаса Черемшина', 'Домашня варено-копчена, з натуральної свинячої оболонки', '189', '₴/кг'),
    ('sausages', 'Сардельки Класичні', 'Ніжна текстура, соковита начинка, натуральна оболонка', '145', '₴/кг'),
    ('sausages', 'Сосиски Молочні', "М'які та соковиті, з добірної телятини", '162', '₴/кг'),
    ('sausages', "Кров'янка Традиційна", 'Гречка, цибуля, справжня свиняча кров — рецепт від баби', '98', '₴/кг'),
    ('smoked', 'Балик Свинячий', 'Холодне копчення на дубових дровах, мінімум солі', '245', '₴/кг'),
    ('smoked', 'Шинка Варено-копчена', 'Ніжна шинка власного посолу, без нітритів', '210', '₴/кг'),
    ('smoked', 'Ребра Копчені', 'Соковиті свинячі ребра з копченим ароматом', '175', '₴/кг'),
    ('poultry', 'Курятина Копчена', 'Ціла тушка холодного копчення, соковита всередині', '165', '₴/кг'),
    ('poultry', 'Качина Грудка', 'Копчена качина грудка з медовою скоринкою', '320', '₴/кг'),
    ('poultry', 'Курячі Крильця', 'Мариновані та копчені, готові до подачі', '135', '₴/кг'),
    ('pork', 'Окорок Свіжий', "М'ясо з власної ферми, охолоджена відруб", '155', '₴/кг'),
    ('pork', 'Ребра Свіжі', "Для запікання або копчення, товстий шар м'яса", '120', '₴/кг'),
    ('pork', 'Фарш Домашній', 'Свіжий фарш 70/30, без добавок', '110', '₴/кг'),
    ('cheeses', 'Сир Гауда', 'Напівтвердий сир власного виробництва, 3 місяці витримки', '280', '₴/кг'),
    ('cheeses', 'Бринза Карпатська', 'Класична бринза з овечого молока', '195', '₴/кг'),
    ('cheeses', 'Сир Адигейський', "М'який свіжий сир, ідеальний до салатів", '160', '₴/кг'),
    ('butter', 'Масло Вершкове 82%', 'Зі свіжих вершків, без рослинних жирів', '95', '₴/200г'),
    ('butter', 'Смалець Домашній', 'Традиційний смалець зі шкварками', '85', '₴/банці'),
    ('bakery', 'Хліб Бородинський', 'Житній хліб на заквасці, випікається щодня', '42', '₴/шт'),
    ('bakery', 'Багет Французький', "Хрустка скоринка, повітряна м'якушка", '38', '₴/шт'),
    ('bakery', 'Пиріжки з Капустою', 'Домашня випічка, 4 шт у пакуванні', '55', '₴/уп'),
    ('drinks', 'Сік Яблучний', 'Прямого віджиму, без цукру', '65', '₴/л'),
    ('drinks', 'Компот Домашній', 'З ягід і фруктів сезону', '48', '₴/л'),
    ('drinks', 'Квас Хлібний', 'На житньому солоді, живий', '40', '₴/л'),
    ('sauces', 'Гірчиця Домашня', 'Гостра, на зернах, без консервантів', '45', '₴/банці'),
    ('sauces', 'Аджика Карпатська', 'Гострий соус з перцем і часником', '55', '₴/банці'),
    ('sauces', 'Хрін Тертий', 'Свіжий хрін з буряком', '38', '₴/банці'),
    ('canned', 'Гриби Мариновані', 'Опеньки та маслюки власного збору', '75', '₴/банці'),
    ('canned', 'Огірки Мариновані', 'Хрусткі, з кропом і часником', '52', '₴/банці'),
    ('canned', 'Тушонка Свиняча', "М'ясо у власному соку, скляна банка", '125', '₴/банці'),
    ('coffee', 'Кава Арабіка', 'Свіжообсмажена, середнє обсмаження', '180', '₴/250г'),
    ('coffee', 'Чай Карпатський', "Суміш трав: чебрець, м'ята, звіробій", '65', '₴/100г'),
    ('veggies', 'Помідори Черрі', 'Місцеві, тепличні, солодкі', '85', '₴/кг'),
    ('veggies', 'Огірки Ґрунтові', 'З власної грядки, сезонні', '45', '₴/кг'),
    ('veggies', 'Зелень Асорті', 'Кріп, петрушка, зелена цибуля', '25', '₴/пучок'),
]

PROMOS = [
    ('birthday', 'Знижка на день народження', '−15% на все замовлення протягом ±7 днів від вашого дня народження.', '−15%'),
    ('cheese-friday', "Сирна п'ятниця", 'Щопʼятниці −10% на всі сири власного виробництва.', '−10%'),
    ('meat-pass', "М'ясний абонемент", 'Купуйте 5 кг ковбас — 6-й кілограм у подарунок.', '6-й кг'),
    ('free-coffee', 'Кава в подарунок', 'При замовленні від 500 ₴ — порція свіжообсмаженої кави.', '🎁'),
]

# slug акції в сіду не збігається з PromoType (дефіс проти підкреслення).
PROMO_TYPE_BY_SLUG = {
    'birthday': Promotion.PromoType.BIRTHDAY,
    'cheese-friday': Promotion.PromoType.CHEESE_FRIDAY,
    'meat-pass': Promotion.PromoType.SUBSCRIPTION,
    'free-coffee': Promotion.PromoType.FREE_COFFEE,
}

_UA_TO_LATIN = str.maketrans({
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e',
    'є': 'ie', 'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'i',
    'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
    'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch',
    'ш': 'sh', 'щ': 'shch', 'ь': '', 'ю': 'iu', 'я': 'ia',
    "'": '', '’': '', 'ʼ': '',
})


def latin_slug(text):
    """SlugField моделі не приймає кирилицю — транслітеруємо перед slugify."""
    return slugify(text.lower().translate(_UA_TO_LATIN)) or 'item'


class Command(BaseCommand):
    help = 'Seed categories, products and promotions for Cheremshyna'

    def handle(self, *args, **options):
        cat_map = {}
        for slug, name, icon, order in CATEGORIES:
            obj, _ = Category.objects.update_or_create(
                slug=slug,
                defaults={
                    'name': name,
                    # Модель зберігає emoji; API віддає це поле як icon.
                    'emoji': icon,
                    'order': order,
                    'is_active': True,
                },
            )
            cat_map[slug] = obj
        self.stdout.write(f'Categories: {len(cat_map)}')

        created = 0
        used_slugs = set(
            Product.objects.exclude(external_id__startswith='seed-').values_list('slug', flat=True)
        )
        for slug, name, desc, price, unit in PRODUCTS:
            product_slug = latin_slug(name)
            base_slug = product_slug
            suffix = 2
            while product_slug in used_slugs:
                product_slug = f'{base_slug}-{suffix}'
                suffix += 1
            used_slugs.add(product_slug)
            external_id = f'seed-{product_slug}'
            _, was = Product.objects.update_or_create(
                external_id=external_id,
                defaults={
                    'category': cat_map[slug],
                    'name': name,
                    'slug': product_slug,
                    'description': desc,
                    'price': Decimal(price),
                    # unit у сіді вже містить «₴/…» — так картка товару
                    # малює підпис ціни. price_display задаємо явно, 
                    # інакше Product.save дописав би ще одне «₴/» спереду.
                    'unit': unit,
                    'price_display': f'{price} {unit}',
                    'is_available': True,
                    'is_featured': name == 'Ковбаса Черемшина',
                    # 0 виглядав як порожній склад при is_available=True.
                    # Повторний seed повертає демо-залишок.
                    'stock': 40,
                },
            )
            if was:
                created += 1
        self.stdout.write(f'Products upserted, new: {created}, total: {Product.objects.count()}')

        for index, (slug, title, desc, badge) in enumerate(PROMOS, start=1):
            Promotion.objects.update_or_create(
                slug=slug,
                defaults={
                    'title': title,
                    'description': desc,
                    'badge': badge,
                    'type': PROMO_TYPE_BY_SLUG.get(slug, Promotion.PromoType.OTHER),
                    'is_active': True,
                    'order': index,
                },
            )
        self.stdout.write(f'Promotions: {Promotion.objects.count()}')
        self.stdout.write(self.style.SUCCESS('Seed complete'))
