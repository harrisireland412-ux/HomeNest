import asyncio

from app.core.security import hash_password
from app.db.base import async_session_factory
from app.models.catalog import Category, Service
from app.models.cms import FAQ, Offer, Testimonial
from app.models.provider import IdentityStatus, Provider
from app.models.provider_service import ProviderService, ProviderServiceStatus
from app.models.user import User, UserRole

LICENSE_REQUIRED_CATEGORIES = {"electrician", "plumber", "pest-control", "salon"}

CATEGORIES = [
    ("Cleaning", "cleaning", "sparkles"),
    ("Salon for Women", "salon", "scissors"),
    ("Spa & Massage", "spa-massage", "flower"),
    ("AC Repair & Service", "ac-repair", "wind"),
    ("Electrician", "electrician", "zap"),
    ("Plumber", "plumber", "wrench"),
    ("Carpenter", "carpenter", "hammer"),
    ("Painting", "painting", "paint-roller"),
    ("Pest Control", "pest-control", "bug"),
    ("Water Purifier", "water-purifier", "droplet"),
    ("Appliance Repair", "appliance-repair", "settings"),
    ("Home Deep Cleaning", "home-deep-cleaning", "home"),
    ("Sofa Cleaning", "sofa-cleaning", "sofa"),
    ("Car Wash", "car-wash", "car"),
    ("Packers & Movers", "packers-movers", "truck"),
    ("Gardening", "gardening", "leaf"),
    ("CCTV Installation", "cctv-installation", "camera"),
    ("Smart Home Installation", "smart-home", "cpu"),
]

SERVICES_BY_CATEGORY = {
    "cleaning": [
        ("Full Home Cleaning", 79.0, True, True),
        ("Bathroom Cleaning", 29.0, False, True),
    ],
    "salon": [
        ("Haircut & Styling", 25.0, True, False),
        ("Facial & Cleanup", 35.0, False, True),
    ],
    "spa-massage": [
        ("Swedish Massage", 55.0, True, False),
    ],
    "ac-repair": [
        ("AC Service & Gas Refill", 45.0, False, True),
    ],
    "electrician": [
        ("Switchboard Repair", 20.0, False, True),
        ("Fan Installation", 15.0, False, False),
    ],
    "plumber": [
        ("Tap & Pipe Repair", 25.0, False, True),
    ],
    "carpenter": [
        ("Furniture Repair", 30.0, False, False),
    ],
    "painting": [
        ("Full Home Painting", 199.0, True, False),
    ],
    "pest-control": [
        ("General Pest Control", 40.0, False, True),
    ],
    "appliance-repair": [
        ("Washing Machine Repair", 35.0, True, False),
    ],
}

PROVIDERS = [
    ("Sarah Chen", 4.9, 312, True),
    ("Priya Nair", 4.8, 231, True),
    ("Marcus Owusu", 4.8, 245, True),
    ("James Whitfield", 4.7, 89, False),
    ("Antonio Ricci", 4.6, 54, False),
    ("Liam O'Connor", 4.9, 121, True),
    ("Fatima Al-Sayed", 4.7, 63, False),
    ("Noah Bennett", 4.8, 176, False),
    ("Grace Okafor", 4.6, 42, False),
]

# Category slugs each seeded provider is approved to serve.
PROVIDER_CATEGORY_ASSIGNMENTS = {
    "Sarah Chen": ["cleaning"],
    "Priya Nair": ["salon", "spa-massage"],
    "Marcus Owusu": ["electrician"],
    "James Whitfield": ["plumber"],
    "Antonio Ricci": ["carpenter"],
    "Liam O'Connor": ["painting"],
    "Fatima Al-Sayed": ["pest-control"],
    "Noah Bennett": ["ac-repair"],
    "Grace Okafor": ["appliance-repair"],
}

TESTIMONIALS = [
    (
        "Emily R.",
        "Booked a deep cleaning and the provider arrived on time and did a fantastic job.",
        5,
    ),
    ("James K.", "The electrician fixed my wiring issue in under an hour. Very professional.", 5),
    (
        "Aisha M.",
        "Loved being able to see exactly when my provider would arrive.",
        4.5,
    ),
    (
        "Tom B.",
        "Had a leaking pipe fixed same-day. Straightforward booking, fair price.",
        5,
    ),
    (
        "Priya D.",
        "The painter was tidy and finished ahead of schedule. Would book again.",
        4.5,
    ),
]

FAQS = [
    (
        "How do I book a service?",
        "Choose a category, pick a service, select a time slot, and confirm your address.",
    ),
    (
        "Can I reschedule a booking?",
        "Yes, you can reschedule from your bookings page up to 2 hours before the scheduled time.",
    ),
    (
        "Are providers background verified?",
        "All providers go through KYC verification including ID and certificate checks.",
    ),
    (
        "What payment methods are supported?",
        "Cards, wallet balance, and UPI are supported at checkout.",
    ),
    (
        "Is there a cancellation fee?",
        "Cancellations made more than 2 hours in advance are free of charge.",
    ),
    (
        "How do I contact my provider?",
        "Once a booking is confirmed, an in-app chat opens between you and your provider.",
    ),
]

OFFERS = [
    ("20% off your first booking", "New customers save 20% on any service, up to $30.", 1),
    (
        "Free visit with Premium Membership",
        "Subscribe to Premium and get one free service visit every month.",
        2,
    ),
]


async def seed() -> None:
    async with async_session_factory() as db:
        category_by_slug: dict[str, Category] = {}
        for name, slug, icon in CATEGORIES:
            category = Category(
                name=name,
                slug=slug,
                icon_name=icon,
                sort_order=len(category_by_slug),
                requires_license=slug in LICENSE_REQUIRED_CATEGORIES,
            )
            db.add(category)
            category_by_slug[slug] = category
        await db.flush()

        services_by_category_slug: dict[str, list[Service]] = {}
        for slug, services in SERVICES_BY_CATEGORY.items():
            category = category_by_slug[slug]
            created_services = []
            for name, price, featured, popular in services:
                service_slug = f"{slug}-{name.lower().replace(' ', '-').replace('&', 'and')}"
                service = Service(
                    category_id=category.id,
                    name=name,
                    slug=service_slug,
                    description=f"{name} by trusted HomeNest professionals.",
                    base_price=price,
                    image_url=f"https://picsum.photos/seed/{service_slug}/400/300",
                    is_featured=featured,
                    is_popular=popular,
                )
                db.add(service)
                created_services.append(service)
            services_by_category_slug[slug] = created_services
        await db.flush()

        provider_by_name: dict[str, Provider] = {}
        for name, rating, review_count, featured in PROVIDERS:
            provider = Provider(
                display_name=name,
                avatar_url="",
                rating=rating,
                review_count=review_count,
                is_featured=featured,
                identity_status=IdentityStatus.approved,
            )
            db.add(provider)
            provider_by_name[name] = provider
        await db.flush()

        for provider_name, category_slugs in PROVIDER_CATEGORY_ASSIGNMENTS.items():
            provider = provider_by_name[provider_name]
            for slug in category_slugs:
                for service in services_by_category_slug.get(slug, []):
                    db.add(
                        ProviderService(
                            provider_id=provider.id,
                            service_id=service.id,
                            status=ProviderServiceStatus.approved,
                        )
                    )

        for author, quote, rating in TESTIMONIALS:
            db.add(
                Testimonial(
                    author_name=author,
                    avatar_url="",
                    quote=quote,
                    rating=rating,
                )
            )

        for i, (question, answer) in enumerate(FAQS):
            db.add(FAQ(question=question, answer=answer, sort_order=i))

        for title, description, order in OFFERS:
            db.add(
                Offer(
                    title=title,
                    description=description,
                    image_url="",
                    sort_order=order,
                )
            )

        db.add(
            User(
                email="admin@homenest.dev",
                hashed_password=hash_password("admin12345"),
                full_name="HomeNest Admin",
                role=UserRole.admin,
            )
        )

        await db.commit()
    print("Seed complete. Admin login: admin@homenest.dev / admin12345")


if __name__ == "__main__":
    asyncio.run(seed())
