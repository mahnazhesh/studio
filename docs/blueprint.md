# **App Name**: V2Ray Config Store

## Core Features:

- Product Showcase: Display a single product (V2Ray configuration) with a brief description and 'Coming Soon' message for other products.
- Add to Cart Functionality: Implement an 'Add to Cart' button that saves the user's email to local storage to be later processed in backend.
- Payment Gateway Integration: Integrate with the Plisio payment gateway using the provided secret key (sZAc3WnQCuNv0xBvAqHIU_bJw_oYGH-d2WrQHZ8L8g9rkjl1cIqKl8fHEeOHeo0k).
- Backend Communication: Call a Google Apps Script backend (webappurl: https://script.google.com/macros/s/AKfycbyqLfSwQ7GmK5g0-cB4hfBfHTU0NfGG1-u7tt3viNZWglg4Jmo90ymt35wAQwkqsYzcog/exec) to process payments and send emails. Pass the Plisio transaction details from frontend.
- Dynamic Email Content: Tool for determining the correct email content, referencing a Google Sheet to fetch dynamic email content and product price in USD based on the purchase and Plisio payment status.

## Style Guidelines:

- Primary color: A vibrant blue (#29ABE2) to convey trust and reliability in the tech product.
- Background color: A light, desaturated blue (#E5F6FD), creating a clean and professional backdrop.
- Accent color: A contrasting orange (#FF9933) to highlight calls to action and important information.
- Font pairing: 'Space Grotesk' (sans-serif) for headlines, 'Inter' (sans-serif) for body text
- Clean and minimalist layout with a focus on showcasing the single product. Use clear sections for product information, pricing, and call to action.
- Use simple, professional icons to represent features and benefits. Icons should be consistent in style and weight.
- Subtle animations for button hover states and loading sequences to enhance user engagement.