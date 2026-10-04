const fs = require('fs');
const path = require('path');
const payDir = __dirname;

// 1. Google Pay (Pure vector: 4-color G + vector 'Pay' path)
const gpaySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 52" width="160" height="52">
  <rect width="160" height="52" rx="8" fill="#ffffff" stroke="#dadce0" stroke-width="1.5"/>
  <g transform="translate(16, 12)">
    <!-- Google 4-Color 'G' -->
    <path fill="#4285F4" d="M27.8 14.7c0-.7-.1-1.4-.2-2.1H14.3v4.2h7.6c-.3 1.8-1.3 3.2-2.8 4.2v3.5h4.5c2.6-2.4 4.2-6 4.2-9.8z"/>
    <path fill="#34A853" d="M14.3 28.5c3.8 0 7-1.3 9.4-3.4l-4.5-3.5c-1.3.9-2.9 1.4-4.9 1.4-3.7 0-6.8-2.5-7.9-5.9H1.7v3.6c2.4 4.7 7.2 7.8 12.6 7.8z"/>
    <path fill="#FBBC05" d="M6.4 17.1c-.3-.9-.5-1.9-.5-2.8s.2-1.9.5-2.8V7.9H1.7C.6 10.1 0 12.6 0 15.3s.6 5.2 1.7 7.4l4.7-3.6z"/>
    <path fill="#EA4335" d="M14.3 5c2.1 0 4 .7 5.5 2.1l4.1-4.1C21.3 1.1 18.1 0 14.3 0 8.9 0 4.1 3.1 1.7 7.9l4.7 3.6c1.1-3.4 4.2-5.9 7.9-5.9z"/>
    
    <!-- Vector 'Pay' Letters (No font dependency) -->
    <!-- P -->
    <path fill="#5F6368" d="M36 4.5h6.8c3.9 0 6.6 2.5 6.6 6.1s-2.7 6.1-6.6 6.1h-3.8v7.8H36V4.5zm6.5 8.9c2 0 3.4-1.2 3.4-2.8s-1.4-2.8-3.4-2.8H39v5.6h3.5z"/>
    <!-- a -->
    <path fill="#5F6368" d="M58.7 13.2v11.3h-2.8v-2.3c-.9 1.6-2.7 2.6-4.6 2.6-3.1 0-5.4-2-5.4-5 0-3.3 2.7-5.1 6.5-5.1 1.3 0 2.5.3 3.5.8v-.6c0-1.8-1.4-2.9-3.4-2.9-1.5 0-2.8.6-3.5 1.5l-1.8-1.7c1.3-1.5 3.3-2.4 5.6-2.4 3.7 0 5.9 2 5.9 5.8zm-2.8 4.2c-.8-.4-1.8-.7-2.9-.7-2 0-3.4 1-3.4 2.8 0 1.6 1.2 2.6 2.8 2.6 1.9 0 3.5-1.5 3.5-3.5v-1.2z"/>
    <!-- y -->
    <path fill="#5F6368" d="M62.6 8.5h3.1l4.6 11.2 4.5-11.2h3.1l-6.8 16.3c-.9 2.2-2.5 3.6-4.9 3.6-1 0-2-.3-2.7-.7l.8-2.3c.5.3 1.2.5 1.8.5 1.3 0 2.2-.7 2.7-2l.3-.8-6.6-14.6z"/>
  </g>
</svg>`;

// 2. PhonePe (Official purple card with white icon and bold vector text)
const phonepeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 52" width="160" height="52">
  <rect width="160" height="52" rx="8" fill="#ffffff" stroke="#dadce0" stroke-width="1.5"/>
  <g transform="translate(14, 8)">
    <!-- Purple PhonePe App Icon -->
    <rect x="0" y="0" width="36" height="36" rx="9" fill="#5F259F"/>
    <path fill="#FFFFFF" d="M20.5 9.2c-2.8 0-5 .4-6.6 1.3-.4.2-.5.5-.5.9v5.7h-1.9c-.4 0-.8.4-.8.8v2.1c0 .4.4.8.8.8h1.9v11.3c0 .4.4.8.8.8h3.2c.4 0 .8-.4.8-.8V20.8h5.3c4.5 0 7.5-2.5 7.5-6.9 0-4.1-2.9-6.9-9.5-6.9zm-.3 8.8h-4.6v-5.7c1.1-.4 2.5-.7 4.1-.7 4.1 0 5.8 1.4 5.8 3.7 0 2.2-1.7 2.7-5.3 2.7z"/>
    
    <!-- Vector PhonePe Text -->
    <!-- P -->
    <path fill="#5F259F" d="M44 8h6.2c3.5 0 5.8 2.1 5.8 5.4 0 3.2-2.3 5.3-5.8 5.3h-3.4v9.3H44V8zm5.9 8c1.9 0 3.1-1.1 3.1-2.6 0-1.6-1.2-2.6-3.1-2.6h-3.1V16h3.1z"/>
    <!-- h -->
    <path fill="#5F259F" d="M58.5 8h2.6v7.3c1-1.3 2.5-2 4.2-2 3.1 0 5.1 2.1 5.1 5.7v9h-2.6v-8.7c0-2.4-1.3-3.7-3.4-3.7-2 0-3.3 1.4-3.3 3.7v8.7h-2.6V8z"/>
    <!-- o -->
    <path fill="#5F259F" d="M79.5 13.3c4.3 0 7.3 3.3 7.3 7.4s-3 7.4-7.3 7.4-7.3-3.3-7.3-7.4 3-7.4 7.3-7.4zm0 12.2c2.8 0 4.6-2.2 4.6-4.8s-1.8-4.8-4.6-4.8-4.6 2.2-4.6 4.8 1.8 4.8 4.6 4.8z"/>
    <!-- n -->
    <path fill="#5F259F" d="M90 13.7h2.6v2.4c1-1.6 2.6-2.7 4.5-2.7 3.2 0 5.1 2.1 5.1 5.7v8.9h-2.6v-8.6c0-2.4-1.3-3.7-3.4-3.7-2 0-3.5 1.5-3.5 3.8v8.5H90v-14.3z"/>
    <!-- e -->
    <path fill="#5F259F" d="M110.8 21.2h-7.6c.3 2.3 2.1 4.1 4.5 4.1 1.7 0 2.9-.8 3.5-1.9l2.2 1.2c-1.1 1.9-3.2 3.3-5.8 3.3-4.3 0-7.2-3.2-7.2-7.3 0-4.2 2.9-7.3 7-7.3 4.2 0 6.8 3.1 6.8 7v.9h-3.4zm-1.8-2.4c-.2-1.9-1.6-3.2-3.4-3.2-1.8 0-3.2 1.3-3.5 3.2h6.9z"/>
    <!-- Pe (Bold accent) -->
    <!-- P -->
    <path fill="#5F259F" d="M116.5 8h6.2c3.5 0 5.8 2.1 5.8 5.4 0 3.2-2.3 5.3-5.8 5.3h-3.4v9.3h-2.8V8zm5.9 8c1.9 0 3.1-1.1 3.1-2.6 0-1.6-1.2-2.6-3.1-2.6h-3.1V16h3.1z"/>
    <!-- e -->
    <path fill="#5F259F" d="M136.3 21.2h-7.6c.3 2.3 2.1 4.1 4.5 4.1 1.7 0 2.9-.8 3.5-1.9l2.2 1.2c-1.1 1.9-3.2 3.3-5.8 3.3-4.3 0-7.2-3.2-7.2-7.3 0-4.2 2.9-7.3 7-7.3 4.2 0 6.8 3.1 6.8 7v.9h-3.4zm-1.8-2.4c-.2-1.9-1.6-3.2-3.4-3.2-1.8 0-3.2 1.3-3.5 3.2h6.9z"/>
  </g>
</svg>`;

// 3. Paytm (Official two-tone Dark Navy & Cyan vector paths)
const paytmSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 52" width="160" height="52">
  <rect width="160" height="52" rx="8" fill="#ffffff" stroke="#dadce0" stroke-width="1.5"/>
  <g transform="translate(18, 10)">
    <!-- Pay (Dark Blue: #002970) -->
    <!-- P -->
    <path fill="#002970" d="M0 0h12.5c6.8 0 11.2 4.1 11.2 10.3 0 6.3-4.4 10.4-11.2 10.4H6.5v11.3H0V0zm11.8 15.3c3.6 0 5.7-2.1 5.7-5 0-3-2.1-5-5.7-5H6.5v10h5.3z"/>
    <!-- a -->
    <path fill="#002970" d="M38.5 10.2v21.8h-5.9v-3.7c-1.8 2.6-4.8 4.2-8.3 4.2-5.6 0-9.8-3.9-9.8-9.5 0-5.8 4.7-9.4 12.1-9.4 2.1 0 4 .3 5.8.9v-.8c0-2.9-2.3-4.7-6-4.7-2.6 0-4.9.9-6.4 2.5l-3.3-3.7c2.6-2.7 6.4-4.1 10.6-4.1 6.8 0 11.2 3.6 11.2 10.5zm-5.9 7.4c-1.4-.7-3.1-1.1-4.8-1.1-3.6 0-5.9 1.7-5.9 4.7 0 2.8 2.1 4.7 5.2 4.7 3.3 0 5.5-2.2 5.5-5.6v-2.7z"/>
    <!-- y -->
    <path fill="#002970" d="M41.5 10.8h6.5l6.5 18 6.4-18h6.5l-9.8 25.2c-1.7 4.3-4.7 6.6-8.9 6.6-1.9 0-3.6-.5-4.8-1.3l1.8-4.4c.9.5 2 .8 2.9.8 2 0 3.3-1.1 4.2-3.3l.5-1.4-11.8-24.2z"/>

    <!-- tm (Bright Cyan: #00BAF2) -->
    <!-- t -->
    <path fill="#00BAF2" d="M74.5 3.5h6.4v7.3h5.9v5.2h-5.9v10c0 2 1 2.8 2.8 2.8 1.1 0 2.2-.3 3.1-.7l.9 5c-1.6.8-3.7 1.2-5.8 1.2-5.2 0-7.4-2.8-7.4-7.4V16h-4.3v-5.2h4.3V3.5z"/>
    <!-- m -->
    <path fill="#00BAF2" d="M90.2 10.8h5.9v3.4c1.8-2.4 4.6-3.9 7.8-3.9 3.5 0 6.2 1.6 7.4 4.4 2-2.7 4.9-4.4 8.5-4.4 5.3 0 8.5 3.7 8.5 9.7v12h-6.2v-11c0-3.4-1.6-5.2-4.2-5.2-2.5 0-4.6 2-4.6 5.6v10.6H107v-11c0-3.4-1.6-5.2-4.2-5.2-2.5 0-4.6 2-4.6 5.6v10.6h-6.2V10.8h-1.8z"/>
  </g>
</svg>`;

// 4. BHIM UPI (Official NPCI green & saffron triangle + bold italic 'BHIM')
const bhimSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 52" width="160" height="52">
  <rect width="160" height="52" rx="8" fill="#ffffff" stroke="#dadce0" stroke-width="1.5"/>
  <g transform="translate(14, 11)">
    <!-- BHIM Iconic Triangle Arrows -->
    <polygon points="0,30 14,0 22,0 8,30" fill="#00773C"/>
    <polygon points="10,30 24,0 32,0 18,30" fill="#00773C"/>
    <polygon points="20,30 34,0 42,0 28,30" fill="#F37021"/>
    
    <!-- Bold Italic BHIM -->
    <!-- B -->
    <path fill="#004B87" d="M48 29.5l10.8-29h11.2c6 0 9.8 3.1 8.5 7.6-.9 3.3-3.6 5.5-7.1 6.3 3.6.5 5.5 2.8 4.6 6.3-1.1 4.5-5.3 8.8-11.4 8.8H48zm12.3-17.5h4.8c2.4 0 4.1-1.3 4.6-3.2.5-1.9-.7-3.2-3.1-3.2h-4.5l-1.8 6.4zm-2.4 12.3h5.2c2.6 0 4.4-1.5 5-3.6.5-2.1-.8-3.5-3.4-3.5h-4.9l-1.9 7.1z"/>
    <!-- H -->
    <path fill="#004B87" d="M77.5 29.5l10.8-29h6.2l-4.1 11.2h8.3l4.1-11.2h6.2l-10.8 29h-6.2l4.4-12h-8.3l-4.4 12h-6.2z"/>
    <!-- I -->
    <path fill="#004B87" d="M109 29.5l10.8-29h6.2l-10.8 29H109z"/>
    <!-- M -->
    <path fill="#004B87" d="M122 29.5l10.8-29h7.4l2.5 17.6 9-17.6h6.7l-10.8 29h-6.1l-2.4-17.4-8.8 17.4H122z"/>
  </g>
</svg>`;

// 5. Amazon Pay (Official Amazon Pay with Curved Orange Smile Arrow)
const amazonSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 52" width="160" height="52">
  <rect width="160" height="52" rx="8" fill="#ffffff" stroke="#dadce0" stroke-width="1.5"/>
  <g transform="translate(18, 10)">
    <!-- amazon in bold black -->
    <path fill="#111111" d="M13 14.8c0-3.5-1.8-5.3-4.9-5.3-2.6 0-4.3 1.3-4.8 3.1l-2.9-1c.9-2.9 3.8-4.7 7.7-4.7 4.9 0 7.9 2.7 7.9 7.6v10.1h-2.9v-2.2c-1.3 1.6-3.3 2.5-5.6 2.5-3.8 0-6.6-2.3-6.6-5.8 0-3.7 3-5.6 7.4-5.6 1.7 0 3.2.4 4.7 1.3v-1zm0 3.8c-1.3-.9-2.6-1.2-4.1-1.2-2.7 0-4.4 1.1-4.4 3.1 0 1.9 1.5 3.1 3.7 3.1 2.8 0 4.8-1.9 4.8-4.5v-.5z"/>
    <path fill="#111111" d="M19.5 7.1h2.9v2.5c1.4-1.8 3.3-2.8 5.6-2.8 2.6 0 4.6 1.2 5.5 3.3 1.5-2.2 3.7-3.3 6.3-3.3 4 0 6.6 2.6 6.6 7.3v10.5h-3V14.6c0-3-1.4-4.6-3.8-4.6-2.2 0-4.1 1.7-4.1 4.7v9.9h-3V14.6c0-3-1.4-4.6-3.8-4.6-2.2 0-4.1 1.7-4.1 4.7v9.9h-3.1V7.1z"/>
    <path fill="#111111" d="M57 6.8c5.4 0 9.2 4.1 9.2 9s-3.8 9-9.2 9-9.2-4.1-9.2-9 3.8-9 9.2-9zm0 15.2c3.7 0 6.2-2.7 6.2-6.2s-2.5-6.2-6.2-6.2-6.2 2.7-6.2 6.2 2.5 6.2 6.2 6.2z"/>
    <path fill="#111111" d="M69 7.1h2.9v2.6c1.4-1.9 3.5-2.9 6-2.9 4.2 0 7.2 3 7.2 8v9.8H82V15c0-3.3-1.9-5.1-4.7-5.1-2.7 0-4.9 2-4.9 5.3v9.4H69V7.1z"/>
    
    <!-- pay in vibrant Amazon Orange -->
    <path fill="#FF9900" d="M88.5 7.1h6.6c3.8 0 6.4 2.3 6.4 5.8s-2.6 5.8-6.4 5.8h-3.6v9.9h-3V7.1zm6.2 8.8c2.2 0 3.5-1.2 3.5-3s-1.3-3-3.5-3h-3.2v6h3.2z"/>
    <path fill="#FF9900" d="M113.8 14.8c0-3.5-1.8-5.3-4.9-5.3-2.6 0-4.3 1.3-4.8 3.1l-2.9-1c.9-2.9 3.8-4.7 7.7-4.7 4.9 0 7.9 2.7 7.9 7.6v10.1h-2.9v-2.2c-1.3 1.6-3.3 2.5-5.6 2.5-3.8 0-6.6-2.3-6.6-5.8 0-3.7 3-5.6 7.4-5.6 1.7 0 3.2.4 4.7 1.3v-1zm0 3.8c-1.3-.9-2.6-1.2-4.1-1.2-2.7 0-4.4 1.1-4.4 3.1 0 1.9 1.5 3.1 3.7 3.1 2.8 0 4.8-1.9 4.8-4.5v-.5z"/>
    
    <!-- Iconic Amazon Curved Smile Arrow -->
    <path fill="#FF9900" d="M2 28.5c18.5 10.2 46.5 10.5 66 1.2.9-.4 2 .4 1.2 1.3-19.8 10.5-49.8 9.8-68.5-1.2-.7-.5-.2-1.6 1.3-1.3z"/>
    <path fill="#FF9900" d="M69.8 28.2c-.8 2.2-2.4 5.3-4.2 6.8-.3.2-.1.6.3.5 2.1-.8 5.7-2.3 7.8-4.5.3-.3.1-.7-.3-.6-1.5.3-2.8-.8-3.6-2.2z"/>
  </g>
</svg>`;

// 6. UPI (Official NPCI UPI Saffron + Green Bold Arrows)
const upiSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 52" width="160" height="52">
  <rect width="160" height="52" rx="8" fill="#ffffff" stroke="#dadce0" stroke-width="1.5"/>
  <g transform="translate(18, 10)">
    <!-- UPI Triangle Arrows -->
    <polygon points="0,32 15,0 24,0 9,32" fill="#00773C"/>
    <polygon points="12,32 27,0 36,0 21,32" fill="#F37021"/>
    
    <!-- Vector UPI Letters -->
    <!-- U -->
    <path fill="#1B365D" d="M42 0h6.8v18.5c0 5 3.2 8.2 8.2 8.2s8.2-3.2 8.2-8.2V0H72v18.2c0 8.7-5.9 14.5-15 14.5s-15-5.8-15-14.5V0z"/>
    <!-- P -->
    <path fill="#1B365D" d="M78 0h12.5c6.8 0 11.2 4.1 11.2 10.3 0 6.3-4.4 10.4-11.2 10.4H84.8v11.3H78V0zm11.8 15.3c3.6 0 5.7-2.1 5.7-5 0-3-2.1-5-5.7-5H84.8v10h5z"/>
    <!-- I -->
    <path fill="#1B365D" d="M107 0h6.8v32h-6.8V0z"/>
  </g>
</svg>`;

// 7. Cards (Visa, Mastercard, RuPay side by side)
const cardsSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 52" width="160" height="52">
  <rect width="160" height="52" rx="8" fill="#ffffff" stroke="#dadce0" stroke-width="1.5"/>
  <g transform="translate(12, 12)">
    <!-- Visa Badge -->
    <rect x="0" y="2" width="40" height="24" rx="4" fill="#00205B"/>
    <!-- Visa text vector -->
    <path fill="#FFFFFF" d="M14.5 8l-2.4 12h-2.1L8.2 11.2c-.3-.9-.7-1.2-1.6-1.5-1.4-.4-3-.9-3.9-1.1l.1-.6h6.1c.9 0 1.6.6 1.8 1.6l1.5 8.1 3.7-9.7h2.2zm11.2 7.8c0-3.1-4.2-3.3-4.2-4.7 0-.5.5-1 1.6-1.1 1.2-.1 2.5.2 3.5.7l.5-2.2c-.7-.3-1.9-.5-3.1-.5-3.3 0-5.4 1.8-5.4 4.3 0 4.2 5.2 3.6 5.2 5.8 0 .8-.8 1.4-2.1 1.4-1.8 0-3.3-.5-4.1-1l-.5 2.3c.9.4 2.6.7 4.2.7 3.6.1 5.8-1.7 5.8-4.4z"/>
    <path fill="#FFAA00" d="M6.6 8l-3.9 1.1-.1.6c.9.2 2.5.7 3.9 1.1.9.3 1.3.6 1.6 1.5L9.9 20h2.1L14.5 8H6.6z"/>

    <!-- Mastercard Circles -->
    <rect x="48" y="2" width="40" height="24" rx="4" fill="#222222"/>
    <circle cx="63" cy="14" r="8" fill="#EB001B"/>
    <circle cx="73" cy="14" r="8" fill="#F79E1B" opacity="0.9"/>

    <!-- RuPay Badge -->
    <rect x="96" y="2" width="40" height="24" rx="4" fill="#FFFFFF" stroke="#dadce0" stroke-width="1"/>
    <polygon points="100,20 106,8 110,8 104,20" fill="#00773C"/>
    <polygon points="105,20 111,8 115,8 109,20" fill="#F37021"/>
    <path fill="#1B365D" d="M118 9h4c2 0 3.2 1 3.2 2.6 0 1.5-1.1 2.5-2.7 2.6l3 5.8h-2.1l-2.7-5.5h-1v5.5H118V9zm1.7 4h2.2c.9 0 1.5-.4 1.5-1.2 0-.8-.6-1.2-1.5-1.2h-2.2v2.4z"/>
  </g>
</svg>`;

// 8. Net Banking
const netbankingSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 52" width="160" height="52">
  <rect width="160" height="52" rx="8" fill="#ffffff" stroke="#dadce0" stroke-width="1.5"/>
  <g transform="translate(18, 10)">
    <!-- Bank Pediment / Roof -->
    <polygon points="18,0 0,8 36,8" fill="#0f7a5f"/>
    <!-- Architrave -->
    <rect x="2" y="9" width="32" height="2" fill="#0f7a5f"/>
    <!-- 4 Pillars -->
    <rect x="4" y="12" width="4" height="14" fill="#0f7a5f"/>
    <rect x="12" y="12" width="4" height="14" fill="#0f7a5f"/>
    <rect x="20" y="12" width="4" height="14" fill="#0f7a5f"/>
    <rect x="28" y="12" width="4" height="14" fill="#0f7a5f"/>
    <!-- Base -->
    <rect x="0" y="27" width="36" height="3" rx="1" fill="#0f7a5f"/>
    
    <!-- Vector 'Net Banking' Text -->
    <path fill="#1B365D" d="M46 8h3l5.5 12V8h2.8v16h-3l-5.5-12v12H46V8z"/>
    <path fill="#1B365D" d="M64 16.5h6.5v2.2H64v3.5h7.2v2.3h-10V8h9.8v2.3H64v3.8h0v2.4z"/>
    <path fill="#1B365D" d="M78 10.3h-4V8h11v2.3h-4.2V24H78V10.3z"/>
    <path fill="#0f7a5f" d="M92 8h5.2c3 0 4.8 1.4 4.8 3.6 0 1.5-.9 2.7-2.3 3.1 1.7.4 2.8 1.7 2.8 3.5 0 2.4-2 3.8-5.1 3.8H92V8zm2.8 6.2h2.2c1.3 0 2-.6 2-1.6s-.7-1.6-2-1.6h-2.2v3.2zm0 7.3h2.4c1.4 0 2.2-.7 2.2-1.8 0-1.1-.8-1.8-2.2-1.8h-2.4v3.6z"/>
  </g>
</svg>`;

fs.writeFileSync(path.join(payDir, 'gpay.svg'), gpaySvg);
fs.writeFileSync(path.join(payDir, 'phonepe.svg'), phonepeSvg);
fs.writeFileSync(path.join(payDir, 'paytm.svg'), paytmSvg);
fs.writeFileSync(path.join(payDir, 'bhim.svg'), bhimSvg);
fs.writeFileSync(path.join(payDir, 'amazonpay.svg'), amazonSvg);
fs.writeFileSync(path.join(payDir, 'upi.svg'), upiSvg);
fs.writeFileSync(path.join(payDir, 'cards.svg'), cardsSvg);
fs.writeFileSync(path.join(payDir, 'netbanking.svg'), netbankingSvg);

console.log('All 8 pure vector payment SVGs written successfully with zero text element dependencies!');
