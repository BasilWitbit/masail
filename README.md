# Masail Landing Page

Build the Homepage/Landing Page for "Masail," an Islamic Q&A and 

Mosque-Based Scholar Response Platform. 

I've attached a reference image — please match its layout, structure, 

and visual hierarchy as closely as possible. Use it as the foundation 

for the design language of all future screens in this project as well.

IMPORTANT — Dynamic theming:

Do not hardcode the primary/secondary colors. On page load, fetch the 

single row from the Supabase `platform_settings` table (columns: 

primary_color, secondary_color, logo_url) and apply primary_color and 

secondary_color as CSS variables (e.g. --color-primary, --color-secondary) 

that all components reference. If logo_url is null, show the text "MASAIL" 

in place of a logo image. This table is publicly readable, no auth needed 

to fetch it.

Typography:

- Montserrat (Bold/SemiBold) for headings

- Source Sans 3 for body text

Shape & Spacing:

- 8px border radius for standard cards/buttons

- 24px border radius for featured/hero sections

- 8px spacing rhythm throughout

- Generous breathing room between sections (avoid crowding)

Content for this page:

- Hero section introducing Masail, reflecting the brand concepts of 

"Sakinah" (tranquility) and "Ihtiram" (respect)

- A search bar inviting users to search the public Q&A library

- A call-to-action to either browse existing Q&A or sign up to ask 

a new question

- No authentication required — this page is public

Note: typography and spacing values above are fixed design constants, 

not stored in the database — only primary_color, secondary_color, and 

logo_url are dynamic/editable by the super admin.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/99da63f2-71c6-4198-bf1e-505353abc6c6).

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
