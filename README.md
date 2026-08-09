# Smart Saudi Journeys

Create a modern, responsive frontend MVP for a Saudi tourism platform called "رحّالة | Rahhalah".

Product concept

Rahhalah is an AI-powered Saudi tourism platform that helps users discover destinations, build personalized itineraries, adapt their plans to real-time conditions, and explore destinations through interactive photo challenges.

The platform should feel distinctly Saudi, premium, warm, modern, and easy to use.

The interface language should be Arabic with full RTL support.

🎨 Visual Identity

Create a modern Saudi-inspired visual identity.

Color palette

Use:

Deep warm brown as the primary color

Golden / desert yellow as the main accent color

Sand / beige backgrounds

Warm off-white for cards and content areas

Dark brown for primary text

The design should evoke:

Saudi desert landscapes

traditional architecture

Saudi heritage

warm sunlight and golden tones

However, DO NOT make the interface look old-fashioned or like a museum website.

It should combine:

Saudi heritage + modern technology + premium tourism

Use subtle Saudi geometric patterns inspired by traditional architecture as decorative background elements.

Keep patterns subtle and do not reduce readability.

Use rounded cards, clean spacing, soft shadows, modern Arabic typography, large destination photography, and clear visual hierarchy.

🧭 Navigation

Create a simple top navigation bar containing:

رحّالة logo

الرئيسية

استكشف

رحلتي

التحديات

المكافآت

Add a user/profile icon.

Navigation should remain simple and immediately understandable.

🏠 1. Home Page

Create an attractive hero section.

Main Arabic headline:

رحلتك للسعودية تبدأ من هنا 🇸🇦

Supporting text:

اكتشف وجهات تناسبك، خطط رحلتك بذكاء، واستمتع بتجربة تتكيف معك لحظة بلحظة.

Primary CTA:

خطط رحلتي

Secondary CTA:

استكشف الوجهات

Use a large Saudi tourism destination image in the hero section.

Below the hero, show popular destinations such as:

الدرعية

العلا

جدة التاريخية

أبها

Each destination card should contain:

Large image

Destination name

Category

Short description

Accessibility/family indicators

Open/closed status

Button: "استكشف"

🎯 2. Smart Preferences / Trip Setup

Create a simple step-by-step experience for building a trip.

Ask the user:

أين تريد الذهاب؟

Allow selecting a Saudi city or destination.

مع من تسافر؟

Options:

فردي

أصدقاء

عائلة

زوجين

ما نوع الأماكن التي تفضلها؟

Options:

تراثية

طبيعية

ترفيهية

ثقافية

مطاعم ومقاهي

احتياجات الوصول

Options:

مناسب لأصحاب الهمم

سهولة الوصول

بدون متطلبات خاصة

مدة الرحلة

Allow choosing number of days.

Add a clear primary button:

أنشئ رحلتي ✨

The interaction should feel extremely simple and not like filling a long form.

🗺️ 3. Explore / Results Page

Display recommended destinations based on user preferences.

At the top provide easy filter chips:

الكل | تراثي | طبيعي | ترفيهي | عائلي | أصحاب الهمم | مفتوح الآن

Each destination card should show:

Destination image

Name

Location

Rating

Open/closed status

Family friendly indicator

Accessibility indicator

Short description

Buttons:

عرض التفاصيل

and

أضف لرحلتي

🏛️ 4. Destination Details

Example destination:

الدرعية

Create a beautiful destination details page.

Show:

Hero image

Name and location

Description

Opening hours

Current weather

Expected crowd level

Accessibility information

Family suitability

Available activities

Include clear status indicators such as:

🟢 مفتوح الآن
☀️ الطقس مناسب
👥 ازدحام متوسط
♿ مناسب لأصحاب الهمم
👨‍👩‍👧 مناسب للعائلات

Buttons:

أضف إلى رحلتي

احجز الآن

Add a section:

تحديات يمكنك تنفيذها هنا

🧠 5. Smart Trip Dashboard

This is the CORE page of the platform.

Title:

رحلتي اليوم

Create a timeline itinerary.

Example:

09:00 — إفطار
10:30 — زيارة الدرعية
13:00 — مطعم نجدي
16:00 — فعالية ثقافية
19:00 — بوليفارد سيتي

Each activity should appear as a clear timeline card.

Show useful information directly inside the timeline:

time

destination

weather

booking status

transportation/travel time

activity status

At the top show a compact summary:

الرياض • السبت • 4 أنشطة

⚡ Real-Time Smart Adaptation

This should be one of the most visually important features.

Create an alert example:

⚠️ تغير في خطتك

متوقع هطول أمطار الساعة 4:00 مساءً، لذلك نقترح استبدال النشاط الخارجي بنشاط داخلي قريب.

Show:

Current activity:
ممشى خارجي

Suggested alternative:
المتحف الوطني

Buttons:

تحديث الجدول ✨

الإبقاء على خطتي

After accepting, visually show that the itinerary has been updated.

The UX should clearly communicate that Rahhalah adapts the trip to real-world conditions.

🎮 6. Challenges Page

Title:

استكشف واربح 🏆

Show photo challenges available at the user's selected destination.

Example:

تحدي الدرعية

📸 صوّر بابًا نجديًا تقليديًا

Reward:

+50 نقطة

Button:

ابدأ التحدي

Create an upload/camera interface.

After submitting the image, simulate an AI verification state:

جاري التحقق من الصورة بالذكاء الاصطناعي...

Then success:

🎉 أحسنت! تم التحقق من الصورة

+50 نقطة

Include a progress bar for accumulated points.

🎁 7. Rewards Page

Title:

مكافآتي

Display:

رصيدك: 350 نقطة ⭐

Create reward cards such as:

☕ كوب قهوة مجاني — 200 نقطة

🎟️ خصم 20% على تجربة سياحية — 400 نقطة

🍽️ خصم في مطعم شريك — 300 نقطة

Each card should have:

استبدال النقاط

🧩 Technical Requirements

Build this as a clean frontend MVP.

Use reusable components and a clear project structure so a development team can continue working on the project through GitHub.

Use mock data initially for:

destinations

weather

crowd levels

bookings

itinerary

challenges

rewards

Do NOT build complex backend integrations yet.

Structure the frontend so APIs and Gemini can be connected later.

Make all major interactions clickable and functional in the prototype.

The application must be:

Responsive

Mobile-friendly

RTL

Accessible

Simple to navigate

Visually consistent

Suitable for later integration with Gemini APIs and backend services

Avoid excessive animations, gradients, decorative elements, and clutter.

Prioritize usability and clarity.

The final experience should make the user immediately understand the three core ideas of Rahhalah:

خطط بذكاء → تكيف لحظياً → استكشف واستمتع

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://rahhalah-journeys.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/270c0457-6ef3-4512-b779-a9a29086319e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
